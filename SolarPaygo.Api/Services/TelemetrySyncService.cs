using SolarPaygo.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Controllers;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Reflection;

namespace SolarPaygo.Api.Services
{
    /// <summary>
    /// Background service that periodically polls all active and locked meters in the database
    /// to sync their live telemetry, run billing calculations, and check for overload limits.
    /// This prevents blocking HTTP requests during dashboard load times.
    /// </summary>
    public class TelemetrySyncService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TelemetrySyncService> _logger;

        public TelemetrySyncService(
            IServiceScopeFactory scopeFactory,
            ILogger<TelemetrySyncService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[TelemetrySync] Background service started. Will sync systems every 5 minutes.");

            // Wait a few seconds after startup before the first run
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("[TelemetrySync] Starting background sync cycle...");
                await SyncAllSystemsAsync(stoppingToken);

                _logger.LogInformation("[TelemetrySync] Sync cycle completed. Next run in 5 minutes.");
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("[TelemetrySync] Background service stopped.");
        }

        private async Task SyncAllSystemsAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<SolarDbContext>();
                var vendingService = scope.ServiceProvider.GetRequiredService<IStronVendingService>();
                var emailService = scope.ServiceProvider.GetService<IEmailService>();

                // Select systems that are Active or Locked (skip Disabled systems to prevent unnecessary network requests)
                var systems = await db.SolarSystems
                    .Include(s => s.PricePlan)
                    .Where(s => s.Status == "Active" || s.Status == "Locked")
                    .ToListAsync(cancellationToken);

                if (systems.Count == 0)
                {
                    _logger.LogInformation("[TelemetrySync] No active or locked systems to sync.");
                    return;
                }

                // Create a temporary DashboardController instance or invoke the helper directly.
                // Since SyncSystemAndApplyBilling is private in DashboardController, we will implement it directly here
                // or we can use reflection. Re-implementing the core sync logic here ensures clean separation
                // from the HTTP request context.
                foreach (var sys in systems)
                {
                    if (cancellationToken.IsCancellationRequested) break;

                    if (string.IsNullOrWhiteSpace(sys.StronMeterId)) continue;

                    _logger.LogInformation("[TelemetrySync] Syncing system {Id} (Meter: {MeterId})...", sys.Id, sys.StronMeterId);
                    
                    try
                    {
                        // 1. Call Stron live API to get the current meter status
                        var status = await vendingService.QueryMeterStatusAsync(sys.StronMeterId, DateTime.UtcNow);
                        if (status == null)
                        {
                            _logger.LogWarning("[TelemetrySync] Meter {MeterId} unreachable. Skipping telemetry update.", sys.StronMeterId);
                            continue;
                        }

                        // Offline Recharge Auto-Delivery: Deliver any pending offline tokens now that meter is online
                        var undeliveredTokens = await db.Transactions
                            .Where(t => t.SolarSystemId == sys.Id && !t.IsDeliveredToMeter && !string.IsNullOrEmpty(t.StsToken))
                            .OrderBy(t => t.TransactionDate)
                            .ToListAsync(cancellationToken);

                        if (undeliveredTokens.Count > 0)
                        {
                            _logger.LogInformation("[TelemetrySync] Meter {MeterId} is back online! Delivering {Count} pending offline tokens...", sys.StronMeterId, undeliveredTokens.Count);
                            bool anyDelivered = false;
                            foreach (var pendingTx in undeliveredTokens)
                            {
                                bool sent = await vendingService.SendTokenRemotelyAsync(sys.StronMeterId, pendingTx.StsToken!);
                                if (sent)
                                {
                                    pendingTx.IsDeliveredToMeter = true;
                                    anyDelivered = true;
                                    _logger.LogInformation("[TelemetrySync] Successfully delivered offline token {Token} to meter {MeterId}!", pendingTx.StsToken, sys.StronMeterId);
                                }
                                else
                                {
                                    _logger.LogWarning("[TelemetrySync] Could not deliver offline token {Token} to meter {MeterId}. Will retry next cycle.", pendingTx.StsToken, sys.StronMeterId);
                                }
                            }

                            if (anyDelivered)
                            {
                                sys.Status = "Active";
                                sys.RelayState = "1";
                                await vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: true);
                        // Auto-Vend from Wallet if meter is back online and wallet balance qualifies
                        decimal rate = PricingEngine.ResolveRate(sys);
                        decimal minThreshold = 0.1m * rate;
                        if (sys.PendingWalletBalance >= minThreshold)
                        {
                            decimal unitsToReceive = Math.Round(sys.PendingWalletBalance / rate, 1, MidpointRounding.AwayFromZero);
                            if (unitsToReceive < 0.1m) unitsToReceive = 0.1m;

                            _logger.LogInformation("[TelemetrySync] Meter {MeterId} is back ONLINE with wallet balance ₦{Bal}. Auto-vending {Units} kWh...", sys.StronMeterId, sys.PendingWalletBalance, unitsToReceive);
                            var vendResult = await vendingService.GenerateVendingTokenAsync(sys.StronMeterId, unitsToReceive, isVendByUnit: true);
                            if (vendResult != null && !string.IsNullOrWhiteSpace(vendResult.Token))
                            {
                                string stsToken = vendResult.Token;
                                decimal actualUnitsVended = vendResult.Units > 0 ? vendResult.Units : unitsToReceive;
                                bool otaSuccess = await vendingService.SendTokenRemotelyAsync(sys.StronMeterId, stsToken);

                                decimal usedAmount = Math.Round(actualUnitsVended * rate, 2);
                                decimal walletAfter = Math.Max(0m, sys.PendingWalletBalance - usedAmount);

                                var autoTx = new Transaction
                                {
                                    SolarSystemId = sys.Id,
                                    AmountPaid = usedAmount,
                                    UnitsAdded = actualUnitsVended,
                                    UsedAmount = usedAmount,
                                    AddedToWallet = 0m,
                                    WalletBalanceAfter = walletAfter,
                                    RateAtTime = rate,
                                    Status = "Completed",
                                    StsToken = stsToken,
                                    PaymentReference = "AUTO_WALLET_" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
                                    TransactionDate = DateTime.UtcNow,
                                    IsDeliveredToMeter = otaSuccess
                                };

                                sys.AvailableUnits += actualUnitsVended;
                                sys.CumulativeKwhBought += actualUnitsVended;
                                sys.PendingWalletBalance = walletAfter;

                                if (sys.AvailableUnits > 0 || sys.PrepaidNairaBalance > 0)
                                {
                                    sys.Status = "Active";
                                    sys.RelayState = "1";
                                    await vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: true);
                                }

                                db.Transactions.Add(autoTx);
                                _logger.LogInformation("[TelemetrySync] Auto-vended {Units} kWh from wallet for online meter {MeterId}. OTA: {Ota}", actualUnitsVended, sys.StronMeterId, otaSuccess);

                                if (!string.IsNullOrWhiteSpace(sys.CustomerEmail))
                                {
                                    string subj = "SolarPayGo - Meter Online: Units Credited";
                                    string body = $"<p>Dear {sys.OwnerName ?? "Customer"},</p><p>Your meter is now online. Units purchased from your wallet have been credited:</p><p><strong>Units Added:</strong> {actualUnitsVended:F2} kWh</p><p><strong>STS Token:</strong> {stsToken}</p>";
                                    try { if (emailService != null) await emailService.SendEmailAsync(sys.CustomerEmail, subj, body); } catch { }
                                }
                            }
                        }


                                try
                                {
                                    var refreshed = await vendingService.QueryMeterStatusAsync(sys.StronMeterId, DateTime.UtcNow);
                                    if (refreshed != null) status = refreshed;
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogWarning(ex, "[TelemetrySync] Error refreshing meter status after token delivery");
                                }
                            }
                        }

                        // Update live telemetry data
                        sys.Voltage = status.Voltage;
                        sys.Current = status.Current;
                        sys.Power = status.Power;
                        sys.CoverState = status.CoverState;

                        // Trust the meter's own reported remaining balance directly instead of
                        // computing it locally — keeps the displayed "remaining kWh" in sync with
                        // the physical meter (including immediately after a Clear Credit reset).
                        sys.AvailableUnits = status.ResidualAmount;

                        // Align MaxLoadWatts
                        if (!string.IsNullOrWhiteSpace(sys.GeneratorCapacity))
                        {
                            int capacityKw = ParseCapacityKw(sys.GeneratorCapacity);
                            sys.MaxLoadWatts = capacityKw * 1000;
                        }

                        // 2. Enforce Overload Cut-off
                        if (sys.Power > sys.MaxLoadWatts && sys.Status != "Locked")
                        {
                            _logger.LogWarning("[TelemetrySync] [Overload] System {Id} exceeded {Max}W. Current Power: {Power}W. Locking.", sys.Id, sys.MaxLoadWatts, sys.Power);
                            sys.Status = "Locked";
                            sys.RelayState = "0";
                            await vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: false);
                            continue; 
                        }

                        // 3. Billing updates
                        DateTime now = DateTime.UtcNow;
                        if (sys.LastSyncTime.HasValue)
                        {
                            var today = now.Date;
                            if (sys.LastBillingDate != today)
                            {
                                sys.LastBillingDate = today;
                                sys.DailyKwhConsumed = 0;
                                sys.DailyTimeActiveHours = 0;
                                sys.DailyAmountCharged = 0;
                            }

                            double hoursElapsed = (now - sys.LastSyncTime.Value).TotalHours;
                            decimal kwhUsed = status.CumulativeConsumption - sys.LastSyncKwh;
                            if (kwhUsed < 0) kwhUsed = 0;

                            if (kwhUsed > 0 || sys.Power > 0)
                            {
                                sys.DailyKwhConsumed += kwhUsed;
                                sys.DailyTimeActiveHours += (decimal)hoursElapsed;
                                sys.CumulativeKwhConsumed += kwhUsed;
                                // AvailableUnits is now set directly from status.ResidualAmount above.

                                decimal rate = PricingEngine.ResolveRate(sys);
                                decimal targetDailyCharge = PricingEngine.ComputeTargetDailyCharge(sys, rate);
                                decimal amountToDeduct = targetDailyCharge - sys.DailyAmountCharged;

                                if (amountToDeduct > 0)
                                {
                                    sys.PrepaidNairaBalance -= amountToDeduct;
                                    if (sys.PrepaidNairaBalance < 0) sys.PrepaidNairaBalance = 0;
                                    sys.DailyAmountCharged += amountToDeduct;
                                }

                                // Core Business Rule: Balance == 0 -> Cut Power (Lock Relay); Balance > 0 -> Enable Power (Close Relay)
                                if (sys.PrepaidNairaBalance <= 0 || sys.AvailableUnits <= 0)
                                {
                                    if (sys.Status != "Locked" || sys.RelayState != "0")
                                    {
                                        _logger.LogWarning("[TelemetrySync] Balance depleted for system {Id} (Balance: ₦{Bal}, Units: {Units} kWh). Cutting power relay.", sys.Id, sys.PrepaidNairaBalance, sys.AvailableUnits);
                                        sys.Status = "Locked";
                                        sys.RelayState = "0";
                                        await vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: false);
                                    }
                                }
                                else if (sys.PrepaidNairaBalance > 0 && sys.AvailableUnits > 0)
                                {
                                    if (sys.Status == "Locked" || sys.RelayState == "0")
                                    {
                                        _logger.LogInformation("[TelemetrySync] Positive balance detected for system {Id} (Balance: ₦{Bal}, Units: {Units} kWh). Restoring power relay.", sys.Id, sys.PrepaidNairaBalance, sys.AvailableUnits);
                                        sys.Status = "Active";
                                        sys.RelayState = "1";
                                        await vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: true);
                                    }
                                }
                            }

                            sys.LastSyncTime = now;
                            sys.LastSyncKwh = status.CumulativeConsumption;
                        }
                        else
                        {
                            sys.LastSyncTime = now;
                            sys.LastSyncKwh = status.CumulativeConsumption;
                            sys.LastBillingDate = now.Date;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "[TelemetrySync] Error syncing system {Id}", sys.Id);
                    }
                }

                await db.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("[TelemetrySync] Background sync successfully saved changes to database.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[TelemetrySync] Error in SyncAllSystemsAsync");
            }
        }

        private static int ParseCapacityKw(string capacity)
        {
            if (string.IsNullOrWhiteSpace(capacity)) return 2;
            var numeric = new string(capacity.Where(char.IsDigit).ToArray());
            if (int.TryParse(numeric, out var kw)) return kw;
            return 2;
        }
    }
}
