using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using SolarPaygo.Api.Services;
using SolarPaygo.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly SolarDbContext _context;
        private readonly IStronVendingService _vendingService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<PaymentController> _logger;
        private readonly IEmailService _emailService;
        private readonly ISmsService _smsService;
        private readonly IHubContext<DashboardHub> _hubContext;

        public PaymentController(
            SolarDbContext context, 
            IStronVendingService vendingService, 
            IConfiguration configuration, 
            ILogger<PaymentController> logger,
            IEmailService emailService,
            ISmsService smsService,
            IHubContext<DashboardHub> hubContext)
        {
            _context = context;
            _vendingService = vendingService;
            _configuration = configuration;
            _logger = logger;
            _emailService = emailService;
            _smsService = smsService;
            _hubContext = hubContext;
        }

        // 1. Squad Webhook Notification Handler
        [HttpPost("webhook")]
        public async Task<IActionResult> PaymentWebhook()
        {
            _logger.LogInformation(">>> RECEIVED WEBHOOK FROM SQUAD <<<");

            // Extract x-squad-signature from headers
            if (!Request.Headers.TryGetValue("x-squad-signature", out var signatureHeader))
            {
                _logger.LogWarning("Missing x-squad-signature header.");
                return Unauthorized("Missing signature header.");
            }

            string signature = signatureHeader.ToString();

            // Read request body to verify signature and parse fields
            using var reader = new StreamReader(Request.Body);
            string rawBody = await reader.ReadToEndAsync();

            bool useSandbox = _configuration.GetValue<bool>("Squad:UseSandbox");
            string secretKey = useSandbox
                ? _configuration["Squad:Sandbox:SecretKey"] ?? string.Empty
                : _configuration["Squad:Live:SecretKey"] ?? string.Empty;

            // Verify signature using Squad v2/v3 six-field pipe-separated HMAC-SHA512
            if (!VerifySquadSignature(rawBody, signature, secretKey))
            {
                _logger.LogWarning("Squad webhook signature verification failed.");
                return BadRequest("Invalid signature.");
            }

            try
            {
                var payload = JsonSerializer.Deserialize<SquadWebhookPayload>(rawBody);
                if (payload == null) return BadRequest("Invalid payload.");

                _logger.LogInformation($"[Webhook] Validated payment for account {payload.virtual_account_number}, amount {payload.principal_amount}");

                // Process the payment
                var result = await ProcessPaymentInternal(
                    payload.virtual_account_number, 
                    payload.customer_identifier, 
                    payload.principal_amount, 
                    payload.transaction_reference);

                if (result.Success)
                {
                    return Ok(new
                    {
                        response_code = 200,
                        transaction_reference = payload.transaction_reference,
                        response_description = "Success"
                    });
                }
                else
                {
                    return BadRequest(result.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Webhook] Error processing Squad webhook");
                return StatusCode(500, "Internal Server Error");
            }
        }

        // 2. Buy Units manually via UI (API fallback/Direct Payment Portal)
        public class DirectBuyRequest
        {
            public string HardwareId { get; set; } = string.Empty;
            public decimal AmountPaid { get; set; }
        }

        [HttpPost("buy-units")]
        public async Task<IActionResult> BuyUnits([FromBody] DirectBuyRequest request)
        {
            var system = await _context.SolarSystems.FirstOrDefaultAsync(s => s.HardwareId == request.HardwareId || s.StronMeterId == request.HardwareId);
            if (system == null) return NotFound("Solar System or Meter not found");

            string reference = "REF_MANUAL_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            
            var result = await ProcessPaymentInternal(
                system.VirtualAccountNumber ?? string.Empty, 
                system.HardwareId, 
                request.AmountPaid.ToString("F2"), 
                reference);

            if (result.Success)
            {
                return Ok(new 
                { 
                    Message = "Payment successful", 
                    Transaction = result.Transaction, 
                    System = result.System 
                });
            }
            
            return BadRequest(result.Message);
        }

        // 3. Simulate Squad Webhook Transfer from Frontend (convenient for developer testing)
        public class SimulateWebhookRequest
        {
            public string VirtualAccountNumber { get; set; } = string.Empty;
            public decimal Amount { get; set; }
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("simulate-webhook")]
        public async Task<IActionResult> SimulateWebhook([FromBody] SimulateWebhookRequest request)
        {
            var system = await _context.SolarSystems.FirstOrDefaultAsync(s => s.VirtualAccountNumber == request.VirtualAccountNumber);
            if (system == null) return NotFound("Virtual account not found on any system");

            string txRef = "REF_SIM_" + DateTime.UtcNow.ToString("yyyyMMddHHmmss") + "_" + new Random().Next(1000, 9999);
            string principalAmountStr = request.Amount.ToString("F2");
            string settledAmountStr = request.Amount.ToString("F2");
            string customerId = system.HardwareId;
            string currency = "NGN";

            // Generate payload
            var payload = new SquadWebhookPayload
            {
                transaction_reference = txRef,
                virtual_account_number = request.VirtualAccountNumber,
                principal_amount = principalAmountStr,
                settled_amount = settledAmountStr,
                currency = currency,
                customer_identifier = customerId
            };

            string jsonPayload = JsonSerializer.Serialize(payload);

            // Calculate valid signature for this simulation so the verification logic runs exactly
            bool useSandbox = _configuration.GetValue<bool>("Squad:UseSandbox");
            string secretKey = useSandbox
                ? _configuration["Squad:Sandbox:SecretKey"] ?? string.Empty
                : _configuration["Squad:Live:SecretKey"] ?? string.Empty;
            string dataToHash = $"{txRef}|{request.VirtualAccountNumber}|{currency}|{principalAmountStr}|{settledAmountStr}|{customerId}";
            string computedSig = GenerateHmacSHA512(dataToHash, secretKey);

            // Call Webhook endpoint directly using the generated signature
            _logger.LogInformation($"[Simulation] Simulating Squad webhook for account {request.VirtualAccountNumber} with amount {request.Amount}");
            
            // We can just call ProcessPaymentInternal directly to avoid HTTP overhead
            var result = await ProcessPaymentInternal(request.VirtualAccountNumber, customerId, principalAmountStr, txRef);

            if (result.Success)
            {
                return Ok(new
                {
                    status = 200,
                    success = true,
                    message = "Simulated bank transfer completed successfully.",
                    data = new
                    {
                        transaction_reference = txRef,
                        amount = request.Amount,
                        token = result.Transaction?.StsToken,
                        units_added = result.Transaction?.UnitsAdded
                    }
                });
            }

            return BadRequest(result.Message);
        }

        // --- INTERNAL LOGIC ---

        private async Task<(bool Success, string Message, Transaction? Transaction, SolarSystem? System)> ProcessPaymentInternal(
            string virtualAccountNumber, 
            string customerIdentifier, 
            string amountStr, 
            string reference)
        {
            if (!decimal.TryParse(amountStr, out var amountPaid) || amountPaid <= 0)
            {
                return (false, "Invalid amount", null, null);
            }

            // Prevent duplicate webhook processing (Idempotency check)
            bool txExists = await _context.Transactions.AnyAsync(t => t.PaymentReference == reference);
            if (txExists)
            {
                _logger.LogInformation("[ProcessPayment] Transaction {Reference} has already been processed. Skipping duplicate webhook to prevent spam.", reference);
                // Return success so the payment gateway stops retrying, but don't add units or send notifications again.
                return (true, "Duplicate transaction processed successfully", null, null);
            }

            // Find matching Solar System
            var system = await _context.SolarSystems.FirstOrDefaultAsync(s => 
                s.VirtualAccountNumber == virtualAccountNumber || 
                s.HardwareId == customerIdentifier || 
                s.StronMeterId == customerIdentifier);

            if (system == null)
            {
                return (false, "No solar system found matching the payment details", null, null);
            }

            // Calculate billing rate based on pricing model (₦2,500/kWh base, ₦1,250/kWh if > 500 kWh used)
            decimal rate = system.CumulativeKwhConsumed >= 500 ? 1250m : 2500m;
            decimal unitsToReceive = amountPaid / rate;

            // Require a linked Stron Meter ID — no meter, no token
            if (string.IsNullOrWhiteSpace(system.StronMeterId))
            {
                _logger.LogWarning("[ProcessPayment] Solar system {Id} has no Stron Meter ID configured.", system.Id);
                return (false, "Configuration error: No meter ID is linked to this solar system. Please contact your administrator to complete the setup before making a payment.", null, null);
            }

            // Call Stron API to generate a real STS vending token
            var vendResult = await _vendingService.GenerateVendingTokenAsync(system.StronMeterId, unitsToReceive, isVendByUnit: true);
            if (vendResult == null)
            {
                _logger.LogError("[ProcessPayment] Stron API returned no token for meter {MeterId}. Aborting transaction — no money will be deducted.", system.StronMeterId);
                return (false, "Payment could not be completed: The meter vending server is temporarily unavailable. Your account has NOT been charged. Please try again in a few minutes or contact support.", null, null);
            }

            string stsToken = vendResult.Token;
            decimal actualUnitsVended = vendResult.Units;

            // 1. Transmit generated STS token directly to the physical meter over the air (GPRS/OTA)
            _logger.LogInformation("[ProcessPayment] Transmitting STS token {Token} OTA to physical meter {MeterId}...", stsToken, system.StronMeterId);
            bool otaSuccess = await _vendingService.SendTokenRemotelyAsync(system.StronMeterId, stsToken);
            if (otaSuccess)
            {
                _logger.LogInformation("[ProcessPayment] OTA Token transmission SUCCESSFUL for meter {MeterId}", system.StronMeterId);
            }
            else
            {
                _logger.LogWarning("[ProcessPayment] OTA Token transmission did not confirm for meter {MeterId}. Token is still sent via Email/SMS for keypad entry.", system.StronMeterId);
            }

            // Update database records
            var transaction = new Transaction
            {
                SolarSystemId = system.Id,
                AmountPaid = amountPaid,
                UnitsAdded = actualUnitsVended,
                Status = "Completed",
                StsToken = stsToken,
                PaymentReference = reference,
                TransactionDate = DateTime.UtcNow
            };

            // Update system units and Naira cash balance
            system.AvailableUnits += actualUnitsVended;
            system.PrepaidNairaBalance += amountPaid;
            system.CumulativeKwhBought += actualUnitsVended; // Track total units ever purchased

            // 2. Automatically set system Active and close relay (Turn ON power) when balance/units > 0
            if (system.AvailableUnits > 0 || system.PrepaidNairaBalance > 0)
            {
                system.Status = "Active";
                system.RelayState = "1";
                if (!string.IsNullOrWhiteSpace(system.StronMeterId))
                {
                    _logger.LogInformation("[ProcessPayment] Sending Remote Switch ON command to meter {MeterId}...", system.StronMeterId);
                    await _vendingService.SetRemoteSwitchAsync(system.StronMeterId, turnOn: true);
                }
            }

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"[ProcessPayment] Completed payment: {amountPaid} Naira. Generated STS Token: {stsToken}. Added {actualUnitsVended} kWh.");

            // 1. Email notification
            if (!string.IsNullOrWhiteSpace(system.CustomerEmail))
            {
                string subject = "SolarPayGo Payment Received - STS Token Enclosed";
                string body = $@"
                    <h3>Payment Successful</h3>
                    <p>Dear {system.OwnerName ?? "Customer"},</p>
                    <p>Your payment of ₦{amountPaid:N2} has been successfully processed.</p>
                    <p><strong>STS Token:</strong> {stsToken}</p>
                    <p><strong>Units Added:</strong> {actualUnitsVended:F2} kWh</p>
                    <p><strong>New Balance:</strong> ₦{system.PrepaidNairaBalance:N2}</p>
                    <p>Thank you for using SolarPayGo!</p>
                ";
                try { await _emailService.SendEmailAsync(system.CustomerEmail, subject, body); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to send email notification."); }
            }

            // 2. SMS notification
            if (!string.IsNullOrWhiteSpace(system.CustomerPhone))
            {
                string smsMessage = $"SolarPayGo: Payment of N{amountPaid} received. STS Token: {stsToken}. Units: {actualUnitsVended:F2}kWh. Bal: N{system.PrepaidNairaBalance}";
                try { await _smsService.SendSmsAsync(system.CustomerPhone, smsMessage); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to send SMS notification."); }
            }

            // 3. Real-time Dashboard Update (SignalR)
            try
            {
                await _hubContext.Clients.Group(system.HardwareId).SendAsync("ReceiveSystemUpdate");
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to broadcast SignalR update."); }

            return (true, "Success", transaction, system);
        }

        // --- SIGNATURE HELPER METHODS ---

        private bool VerifySquadSignature(string rawJson, string expectedSignature, string secretKey)
        {
            try
            {
                using var jsonDoc = JsonDocument.Parse(rawJson);
                var root = jsonDoc.RootElement;

                // Extract the six fields required by Squad webhook v2/v3
                string txRef = root.GetProperty("transaction_reference").GetString() ?? "";
                string vaNum = root.GetProperty("virtual_account_number").GetString() ?? "";
                string currency = root.GetProperty("currency").GetString() ?? "";
                string principalAmount = root.GetProperty("principal_amount").GetString() ?? "";
                string settledAmount = root.GetProperty("settled_amount").GetString() ?? "";
                string customerId = root.GetProperty("customer_identifier").GetString() ?? "";

                // Squad v2/v3 signature: six fields joined with pipe separators
                // Format: transaction_reference|virtual_account_number|currency|principal_amount|settled_amount|customer_identifier
                string dataToHash = $"{txRef}|{vaNum}|{currency}|{principalAmount}|{settledAmount}|{customerId}";

                string computedHash = GenerateHmacSHA512(dataToHash, secretKey);

                _logger.LogDebug("[Signature] Data string: {Data}", dataToHash);
                _logger.LogDebug("[Signature] Computed:  {Computed}", computedHash);
                _logger.LogDebug("[Signature] Expected:  {Expected}", expectedSignature);

                return computedHash.Equals(expectedSignature, StringComparison.OrdinalIgnoreCase);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Signature] Error validating Squad webhook signature.");
                return false;
            }
        }

        private string GenerateHmacSHA512(string input, string key)
        {
            byte[] keyBytes = Encoding.UTF8.GetBytes(key);
            byte[] inputBytes = Encoding.UTF8.GetBytes(input);

            using var hmac = new HMACSHA512(keyBytes);
            byte[] hashBytes = hmac.ComputeHash(inputBytes);

            var sb = new StringBuilder(hashBytes.Length * 2);
            for (int i = 0; i < hashBytes.Length; i++)
            {
                sb.Append(hashBytes[i].ToString("x2"));
            }
            return sb.ToString();
        }

        // Webhook Payload structure
        public class SquadWebhookPayload
        {
            public string transaction_reference { get; set; } = string.Empty;
            public string virtual_account_number { get; set; } = string.Empty;
            public string principal_amount { get; set; } = string.Empty;
            public string settled_amount { get; set; } = string.Empty;
            public string currency { get; set; } = string.Empty;
            public string customer_identifier { get; set; } = string.Empty;
        }
    }
}
