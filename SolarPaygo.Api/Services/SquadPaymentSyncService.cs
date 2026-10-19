using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SolarPaygo.Api.Controllers;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    /// <summary>
    /// Background service that polls Squad's merchant virtual account transactions every 2 minutes.
    /// This acts as a 100% resilient safety net for when webhooks are blocked by Cloudflare (Error 1010)
    /// or dropped due to network issues, guaranteeing that customer top-ups reflect in their wallets.
    /// </summary>
    public class SquadPaymentSyncService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SquadPaymentSyncService> _logger;

        public SquadPaymentSyncService(
            IServiceScopeFactory scopeFactory,
            ILogger<SquadPaymentSyncService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[SquadPaymentSync] Background service started. Will sync Squad transactions every 2 minutes.");

            // Wait 15 seconds after startup
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
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var controller = scope.ServiceProvider.GetRequiredService<PaymentController>();
                    await controller.SyncSquadTransactionsInternalAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[SquadPaymentSync] Error occurred during periodic Squad transaction sync.");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }
        }
    }
}
