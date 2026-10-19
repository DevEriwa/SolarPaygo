using System.Net;
using System.Net.Mail;

namespace SolarPaygo.Api.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body);
    }

    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmtpEmailService> _logger;

        public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body)
        {
            bool emailEnabled = _configuration.GetValue<bool>("Email:Enabled", false);
            if (!emailEnabled)
            {
                _logger.LogDebug("[Email] Email notification service is currently paused. Skipping email to {To}.", to);
                return;
            }

            var host = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var port = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var senderEmail = _configuration["Email:SenderEmail"] ?? string.Empty;
            var username = _configuration["Email:Username"] ?? string.Empty;
            var password = _configuration["Email:Password"] ?? string.Empty;

            if (string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(password))
            {
                _logger.LogInformation("[Email] SMTP credentials are not configured. Skipping email to {To}.", to);
                return;
            }

            try
            {
                using var client = new SmtpClient(host, port)
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(username, password),
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 15000 // 15 second timeout
                };

                using var message = new MailMessage
                {
                    From = new MailAddress(senderEmail, "SolarPayGo"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                message.To.Add(new MailAddress(to));

                await client.SendMailAsync(message);

                _logger.LogInformation("[Email] Successfully sent email to {To} | Subject: {Subject}", to, subject);
            }
            catch (SmtpException ex)
            {
                _logger.LogWarning("[Email] SMTP warning sending email to {To} | StatusCode: {StatusCode}: {Message}", to, ex.StatusCode, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("[Email] Warning sending email to {To}: {Message}", to, ex.Message);
            }
        }
    }
}