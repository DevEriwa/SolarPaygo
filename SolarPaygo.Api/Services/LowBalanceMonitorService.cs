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

                    // Find active systems with less than 5 units
                    var lowSystems = await context.SolarSystems
                        .Where(s => s.Status == "Active" && s.AvailableUnits < 5 && s.AvailableUnits > 0)
                        .ToListAsync(stoppingToken);

                    foreach (var sys in lowSystems)
                    {
                        var owner = sys.OwnerName ?? "Customer";
                        await emailService.SendEmailAsync(
                            "customer@example.com", 
                            $"Warning: Low Balance for {sys.HardwareId}", 
                            $"Hi {owner}, your solar generator {sys.HardwareId} is running low ({sys.AvailableUnits} kWh remaining). Top up to avoid disconnection.");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred scanning for low balances.");
                }

                // Check every 1 minute for MVP purposes
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
