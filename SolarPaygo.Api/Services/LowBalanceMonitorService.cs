using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Data;

namespace SolarPaygo.Api.Services
{
    public class LowBalanceMonitorService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<LowBalanceMonitorService> _logger;

        public LowBalanceMonitorService(IServiceProvider serviceProvider, ILogger<LowBalanceMonitorService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Low Balance Monitor Service started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<SolarDbContext>();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

                    // Find active systems with less than 5 kWh remaining
                    var lowSystems = await context.SolarSystems
                        .Where(s => s.Status == "Active" && s.AvailableUnits < 5 && s.AvailableUnits > 0)
                        .ToListAsync(stoppingToken);

                    foreach (var sys in lowSystems)
                    {
                        // Skip if no customer email is on file — cannot notify
                        if (string.IsNullOrWhiteSpace(sys.CustomerEmail))
                        {
                            _logger.LogWarning("[LowBalance] System {HardwareId} has low balance but no customer email is registered. Skipping notification.", sys.HardwareId);
                            continue;
                        }

                        var ownerName = sys.OwnerName ?? "Customer";
                        var unitsLeft = sys.AvailableUnits.ToString("F2");
                        var nairaLeft = sys.PrepaidNairaBalance.ToString("N2");
                        var meterId = sys.StronMeterId ?? sys.HardwareId;

                        var subject = $"⚠️ Low Balance Alert — Solar Generator {sys.HardwareId}";

                        var htmlBody = $@"
<html>
<body style=""font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;"">
  <div style=""background: #f59e0b; padding: 16px 24px; border-radius: 8px 8px 0 0;"">
    <h2 style=""color: #fff; margin: 0;"">⚠️ Low Balance Warning</h2>
  </div>
  <div style=""background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"">
    <p>Dear <strong>{ownerName}</strong>,</p>
    <p>Your solar generator is running low on credit and will be <strong>automatically disconnected</strong> when it reaches zero.</p>
    <table style=""width: 100%; border-collapse: collapse; margin: 16px 0;"">
      <tr style=""background: #f9fafb;"">
        <td style=""padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;"">System ID</td>
        <td style=""padding: 10px; border: 1px solid #e5e7eb;"">{sys.HardwareId}</td>
      </tr>
      <tr>
        <td style=""padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;"">Meter ID</td>
        <td style=""padding: 10px; border: 1px solid #e5e7eb;"">{meterId}</td>
      </tr>
      <tr style=""background: #f9fafb;"">
        <td style=""padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;"">Units Remaining</td>
        <td style=""padding: 10px; border: 1px solid #e5e7eb; color: #dc2626;""><strong>{unitsLeft} kWh</strong></td>
      </tr>
      <tr>
        <td style=""padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;"">Naira Balance</td>
        <td style=""padding: 10px; border: 1px solid #e5e7eb; color: #dc2626;""><strong>₦{nairaLeft}</strong></td>
      </tr>
    </table>
    <p>Please top up immediately by making a bank transfer to your dedicated virtual account to avoid disconnection.</p>
    <p style=""color: #6b7280; font-size: 13px;"">If you have already topped up, please ignore this message. Your units will be updated automatically.</p>
    <hr style=""border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;""/>
    <p style=""color: #9ca3af; font-size: 12px;"">This is an automated alert from the SolarPayGo system. Do not reply to this email.</p>
  </div>
</body>
</html>";

                        try
                        {
                            await emailService.SendEmailAsync(sys.CustomerEmail, subject, htmlBody);
                            _logger.LogInformation("[LowBalance] Sent low-balance alert to {Email} for system {HardwareId} ({Units} kWh remaining).", sys.CustomerEmail, sys.HardwareId, unitsLeft);
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError(emailEx, "[LowBalance] Failed to send low-balance email to {Email} for system {HardwareId}.", sys.CustomerEmail, sys.HardwareId);
                            // Continue processing other systems even if one email fails
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[LowBalance] Error occurred during low-balance scan.");
                }

                // Check every 1 minute
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
