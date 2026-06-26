using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    public interface ISmsService
    {
        Task SendSmsAsync(string phoneNumber, string message);
    }

    public class LoggingSmsService : ISmsService
    {
        private readonly ILogger<LoggingSmsService> _logger;

        public LoggingSmsService(ILogger<LoggingSmsService> logger)
        {
            _logger = logger;
        }

        public Task SendSmsAsync(string phoneNumber, string message)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                _logger.LogWarning("[SMS] Attempted to send SMS, but phone number was empty.");
                return Task.CompletedTask;
            }

            // In a real production scenario, you would integrate Termii, Twilio, or another provider here.
            // For now, we mock the sending by logging it clearly to the console.
            _logger.LogInformation("====================================================");
            _logger.LogInformation($"[SMS MOCK] To: {phoneNumber}");
            _logger.LogInformation($"[SMS MOCK] Body: {message}");
            _logger.LogInformation("====================================================");

            return Task.CompletedTask;
        }
    }
}
