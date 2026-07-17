using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SolarPaygo.Api.Data;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    /// <summary>
    /// Background service that resets daily billing counters for all solar systems at midnight UTC.
    /// This is critical for the hybrid billing engine to correctly calculate daily minimum charges.
    /// Without this, daily charges accumulate indefinitely and customers get overcharged.
    /// </summary>
    public class DailyBillingResetService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DailyBillingResetService> _logger;

        public DailyBillingResetService(
            IServiceScopeFactory scopeFactory,
            ILogger<DailyBillingResetService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[DailyReset] Service started. Will reset billing counters at midnight UTC every day.");

            while (!stoppingToken.IsCancellationRequested)
            {
                // Calculate how long until the next UTC midnight
                var now = DateTime.UtcNow;
                var nextMidnight = now.Date.AddDays(1); // tomorrow 00:00:00 UTC
                var delay = nextMidnight - now;

                _logger.LogInformation(
                    "[DailyReset] Next billing reset scheduled in {Hours}h {Minutes}m at {NextMidnight} UTC.",
                    (int)delay.TotalHours,
                    delay.Minutes,
                    nextMidnight.ToString("yyyy-MM-dd HH:mm:ss"));

                // Wait until midnight, honouring cancellation
                try
                {
                    await Task.Delay(delay, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break; // Service is shutting down — exit cleanly
                }

                // Run the reset
                await ResetDailyBillingCountersAsync(stoppingToken);
            }

            _logger.LogInformation("[DailyReset] Service stopped.");
        }

        private async Task ResetDailyBillingCountersAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<SolarDbContext>();

                var today = DateTime.UtcNow.Date;
                var systems = await db.SolarSystems.ToListAsync(cancellationToken);

                int resetCount = 0;
                foreach (var sys in systems)
                {
                    // Only reset if this system hasn't been reset today already
                    if (sys.LastBillingDate < today)
                    {
                        sys.DailyKwhConsumed = 0;
                        sys.DailyAmountCharged = 0;
                        sys.DailyTimeActiveHours = 0;
                        sys.LastBillingDate = today;
                        resetCount++;
                    }
                }

                if (resetCount > 0)
                {
                    await db.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation(
                        "[DailyReset] ✅ Successfully reset daily billing counters for {Count} solar system(s) at {Time} UTC.",
                        resetCount,
                        DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));
                }
                else
                {
                    _logger.LogInformation("[DailyReset] No systems needed resetting (already reset today).");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DailyReset] ❌ Error during daily billing reset. Will retry at next midnight.");
                // Don't re-throw — the service must keep running even if one reset fails
            }
        }
    }
}
