namespace SolarPaygo.Api.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body);
    }

    public class MockEmailService : IEmailService
    {
        private readonly ILogger<MockEmailService> _logger;

        public MockEmailService(ILogger<MockEmailService> logger)
        {
            _logger = logger;
        }

        public Task SendEmailAsync(string to, string subject, string body)
        {
            // In a real app, integrate SendGrid or SMTP here
            _logger.LogWarning(">>> MOCK EMAIL SENT TO {To} | Subject: {Subject} | Body: {Body}", to, subject, body);
            return Task.CompletedTask;
        }
    }
}
