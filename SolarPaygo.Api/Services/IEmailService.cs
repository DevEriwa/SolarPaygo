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
            var host = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var port = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var senderEmail = _configuration["Email:SenderEmail"] ?? string.Empty;
            var username = _configuration["Email:Username"] ?? string.Empty;
            var password = _configuration["Email:Password"] ?? string.Empty;

            if (string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(password))
            {
                _logger.LogError("[Email] SMTP credentials are not configured. Cannot send email to {To}.", to);
                throw new InvalidOperationException("SMTP email credentials are not configured.");
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
                _logger.LogError(ex, "[Email] SMTP error sending email to {To} | Subject: {Subject} | StatusCode: {StatusCode}", to, subject, ex.StatusCode);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Email] Unexpected error sending email to {To} | Subject: {Subject}", to, subject);
                throw;
            }
        }
    }
}
