using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using SolarPaygo.Api.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly SolarDbContext _context;
        private readonly ISquadService _squadService;
        private readonly IStronVendingService _vendingService;
        private readonly ILogger<DashboardController> _logger;
        private readonly IConfiguration _configuration;

        public DashboardController(
            SolarDbContext context, 
            ISquadService squadService, 
            IStronVendingService vendingService,
            ILogger<DashboardController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _squadService = squadService;
            _vendingService = vendingService;
            _logger = logger;
            _configuration = configuration;
        }

        // 1. Fetch Systems (and sync live metrics + apply hybrid billing in the process)
        [Authorize(Roles = "Admin")]
        [HttpGet("systems")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var systems = await _context.SolarSystems.ToListAsync();
            
            // Sync each system sequentially because DbContext is not thread-safe for parallel operations
            foreach (var sys in systems)
            {
                await SyncSystemAndApplyBilling(sys);
            }
            
            await _context.SaveChangesAsync();

            // Calculate today's revenue
            var today = DateTime.UtcNow.Date;
            var revenueToday = await _context.Transactions
                .Where(t => t.Status == "Completed" && t.TransactionDate >= today)
                .SumAsync(t => t.AmountPaid);
                
            // Get recent payments
            var recentPayments = await _context.Transactions
                .Include(t => t.SolarSystem)
                .Where(t => t.Status == "Completed")
                .OrderByDescending(t => t.TransactionDate)
                .Take(10)
                .Select(t => new {
                    t.Id,
                    HardwareId = t.SolarSystem!.HardwareId,
                    StronMeterId = t.SolarSystem!.StronMeterId,
                    t.AmountPaid,
                    t.UnitsAdded,
                    t.StsToken,
                    t.TransactionDate
                })
                .ToListAsync();

            return Ok(new {
                Systems = systems,
                RevenueToday = revenueToday,
                RecentPayments = recentPayments
            });
        }

        // Helper: Syncs live Stron telemetry, applies overload cutoff, and calculates daily hybrid billing
        private async Task SyncSystemAndApplyBilling(SolarSystem sys)
        {
            if (string.IsNullOrWhiteSpace(sys.StronMeterId)) return;

            // 1. Call Stron live API to get the current meter status
            var status = await _vendingService.QueryMeterStatusAsync(sys.StronMeterId, DateTime.UtcNow);
            if (status == null) return;

            // Update live telemetry data
            sys.Voltage = status.Voltage;
            sys.Current = status.Current;
            sys.Power = status.Power;
            sys.CoverState = status.CoverState;

            // Ensure MaxLoadWatts aligns with declared GeneratorCapacity (e.g., 2KV => 2000W)
            if (!string.IsNullOrWhiteSpace(sys.GeneratorCapacity))
            {
                int capacityKw = ParseCapacityKw(sys.GeneratorCapacity);
                sys.MaxLoadWatts = capacityKw * 1000;
            }

            // 2. Enforce Maximum Load Limit
            if (sys.Power > sys.MaxLoadWatts && sys.Status != "Locked")
            {
                _logger.LogWarning("[Overload] System {Id} exceeded {Max}W. Current Power: {Power}W. Locking system.", sys.Id, sys.MaxLoadWatts, sys.Power);
                sys.Status = "Locked";
                sys.RelayState = "0";
                await _vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: false);
                return; // Stop billing/processing for this cycle since we just cut it off
            }

            // 3. Perform Billing calculations if it has been synced before
            DateTime now = DateTime.UtcNow;
            if (sys.LastSyncTime.HasValue)
            {
                // Reset daily trackers if it is a new day
                var today = now.Date;
                if (sys.LastBillingDate != today)
                {
                    sys.LastBillingDate = today;
                    sys.DailyKwhConsumed = 0;
                    sys.DailyTimeActiveHours = 0;
                    sys.DailyAmountCharged = 0;
                }

                double hoursElapsed = (now - sys.LastSyncTime.Value).TotalHours;
                
                // Track kWh difference
                decimal kwhUsed = status.CumulativeConsumption - sys.LastSyncKwh;
                if (kwhUsed < 0) kwhUsed = 0; // Handle meter resets

                // Only process billing if they actually drew power (used units) or the relay is actively drawing current
                if (kwhUsed > 0 || sys.Power > 0)
                {
                    // Increment daily trackers
                    sys.DailyKwhConsumed += kwhUsed;
                    sys.DailyTimeActiveHours += (decimal)hoursElapsed;
                    sys.CumulativeKwhConsumed += kwhUsed;

                    // Deduct actual kWh from available units
                    sys.AvailableUnits -= kwhUsed;
                    if (sys.AvailableUnits < 0) sys.AvailableUnits = 0;

                    // Rate is ₦2,500/kWh base, ₦1,250/kWh (50% discount) if cumulative > 500 kWh
                    decimal rate = sys.CumulativeKwhConsumed >= 500m ? 1250m : 2500m;

                    // A) Calculate energy charge and time charge so far today
                    decimal energyCharge = sys.DailyKwhConsumed * rate;
                    decimal timeCharge = sys.DailyTimeActiveHours * 313m;
                    
                    // B) The strict minimum charge for the day if ANY power is used is 0.3 kWh worth
                    decimal minimumDailyCharge = 0.3m * rate;

                    // C) Target daily charge is the highest of the three scenarios
                    decimal targetDailyCharge = Math.Max(minimumDailyCharge, Math.Max(energyCharge, timeCharge));

                    // D) Deduct the difference between what they SHOULD pay for today and what they ALREADY paid today
                    decimal amountToDeduct = targetDailyCharge - sys.DailyAmountCharged;

                    if (amountToDeduct > 0)
                    {
                        sys.PrepaidNairaBalance -= amountToDeduct;
                        if (sys.PrepaidNairaBalance < 0) sys.PrepaidNairaBalance = 0;
                        
                        sys.DailyAmountCharged += amountToDeduct; // Mark as charged for the day
                    }

                    // Enforce lock if prepaid balance or units are fully depleted
                    if (sys.PrepaidNairaBalance <= 0 || sys.AvailableUnits <= 0)
                    {
                        if (sys.Status != "Locked")
                        {
                            sys.Status = "Locked";
                            sys.RelayState = "0"; // Relay off
                            await _vendingService.SetRemoteSwitchAsync(sys.StronMeterId, turnOn: false);
                        }
                    }
                }

                // Update sync markers
                sys.LastSyncTime = now;
                sys.LastSyncKwh = status.CumulativeConsumption;
            }
            else
            {
                // First sync initialization
                sys.LastSyncTime = now;
                sys.LastSyncKwh = status.CumulativeConsumption;
                sys.LastBillingDate = now.Date;
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("systems/{id}")]
        public async Task<IActionResult> GetSystemDetails(int id)
        {
            var system = await _context.SolarSystems.FindAsync(id);
            if (system == null) return NotFound();

            // Sync this specific system before returning details
            await SyncSystemAndApplyBilling(system);
            await _context.SaveChangesAsync();

            var logs = await _context.UsageLogs
                .Where(l => l.SolarSystemId == id)
                .OrderByDescending(l => l.Timestamp)
                .Take(20)
                .ToListAsync();

            var transactions = await _context.Transactions
                .Where(t => t.SolarSystemId == id)
                .OrderByDescending(t => t.TransactionDate)
                .Take(10)
                .ToListAsync();

            return Ok(new { System = system, RecentUsage = logs, RecentTransactions = transactions });
        }

        // New endpoint for Customers to fetch only their system
        [Authorize(Roles = "Customer")]
        [HttpGet("my-system")]
        public async Task<IActionResult> GetMySystem()
        {
            var systemIdClaim = User.Claims.FirstOrDefault(c => c.Type == "SystemId")?.Value;
            if (string.IsNullOrEmpty(systemIdClaim) || !int.TryParse(systemIdClaim, out int systemId))
            {
                return Unauthorized();
            }

            var system = await _context.SolarSystems.FindAsync(systemId);
            if (system == null) return NotFound();

            // Sync this specific system
            await SyncSystemAndApplyBilling(system);
            await _context.SaveChangesAsync();

            var logs = await _context.UsageLogs
                .Where(l => l.SolarSystemId == systemId)
                .OrderByDescending(l => l.Timestamp)
                .Take(20)
                .ToListAsync();

            var transactions = await _context.Transactions
                .Where(t => t.SolarSystemId == systemId)
                .OrderByDescending(t => t.TransactionDate)
                .Take(10)
                .ToListAsync();

            return Ok(new { System = system, RecentUsage = logs, RecentTransactions = transactions });
        }

        public class RegisterSystemRequest
        {
            public string HardwareId { get; set; } = string.Empty;
            public string OwnerName { get; set; } = string.Empty;
            public string StronMeterId { get; set; } = string.Empty;
            public string CustomerEmail { get; set; } = string.Empty;
            public string CustomerPhone { get; set; } = string.Empty;
            public string CustomerBvn { get; set; } = string.Empty;
            public string CustomerDob { get; set; } = "1990-01-01";
            public string CustomerAddress { get; set; } = "Lagos, Nigeria";
            public string CustomerGender { get; set; } = ""; // Gender will be selected by user/admin
            public string GeneratorCapacity { get; set; } = "2KV"; // e.g. 1KV, 2KV, 3KV, 5KV, 10KV

            // Support snake_case/Squad-style names if sent directly
            public string? customer_identifier { get; set; }
            public string? first_name { get; set; }
            public string? last_name { get; set; }
            public string? mobile_num { get; set; }
            public string? email { get; set; }
            public string? bvn { get; set; }
            public string? dob { get; set; }
            public string? address { get; set; }
            public string? gender { get; set; }
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("register")]
        public async Task<IActionResult> RegisterDevice([FromBody] RegisterSystemRequest request)
        {
            // Normalize alternate/snake_case/Squad request properties
            if (string.IsNullOrWhiteSpace(request.HardwareId) && !string.IsNullOrWhiteSpace(request.customer_identifier))
                request.HardwareId = request.customer_identifier;
            if (string.IsNullOrWhiteSpace(request.OwnerName) && (!string.IsNullOrWhiteSpace(request.first_name) || !string.IsNullOrWhiteSpace(request.last_name)))
                request.OwnerName = $"{request.first_name} {request.last_name}".Trim();
            if (string.IsNullOrWhiteSpace(request.CustomerEmail) && !string.IsNullOrWhiteSpace(request.email))
                request.CustomerEmail = request.email;
            if (string.IsNullOrWhiteSpace(request.CustomerPhone) && !string.IsNullOrWhiteSpace(request.mobile_num))
                request.CustomerPhone = request.mobile_num;
            if (string.IsNullOrWhiteSpace(request.CustomerBvn) && !string.IsNullOrWhiteSpace(request.bvn))
                request.CustomerBvn = request.bvn;
            if (string.IsNullOrWhiteSpace(request.CustomerDob) && !string.IsNullOrWhiteSpace(request.dob))
                request.CustomerDob = request.dob;
            if (string.IsNullOrWhiteSpace(request.CustomerAddress) && !string.IsNullOrWhiteSpace(request.address))
                request.CustomerAddress = request.address;
            if (string.IsNullOrWhiteSpace(request.CustomerGender) && !string.IsNullOrWhiteSpace(request.gender))
                request.CustomerGender = request.gender;

            if (string.IsNullOrWhiteSpace(request.HardwareId))
                return BadRequest("HardwareId is required.");

            // --- Server-side validation before calling Squad ---
            if (string.IsNullOrWhiteSpace(request.CustomerGender))
                return BadRequest("Gender is required. Please select Male or Female.");

            if (string.IsNullOrWhiteSpace(request.CustomerBvn) || request.CustomerBvn.Length != 11)
                return BadRequest("A valid 11-digit BVN is required.");

            if (string.IsNullOrWhiteSpace(request.CustomerEmail))
                return BadRequest("Customer email is required.");

            if (string.IsNullOrWhiteSpace(request.CustomerPhone))
                return BadRequest("Customer phone number is required.");

            if (string.IsNullOrWhiteSpace(request.CustomerDob))
                return BadRequest("Date of birth is required.");

            // Safe DOB parse — prevents 500 crash on malformed dates
            if (!DateTime.TryParse(request.CustomerDob, out DateTime parsedDob))
                return BadRequest($"Invalid date of birth format: '{request.CustomerDob}'. Use YYYY-MM-DD.");

            string formattedDob = parsedDob.ToString("MM/dd/yyyy"); // Squad expects MM/dd/yyyy

            var existing = await _context.SolarSystems.FirstOrDefaultAsync(s => s.HardwareId == request.HardwareId);
            if (existing != null)
                return Ok(existing);

            // Generate dedicated Squad Virtual Account for bank transfer payments
            _logger.LogInformation("[Register] Registering customer and generating Squad virtual account for {OwnerName}", request.OwnerName);
            
            var squadAccount = await _squadService.CreateVirtualAccountAsync(
                request.HardwareId,
                GetFirstName(request.OwnerName),
                GetLastName(request.OwnerName),
                request.CustomerEmail,
                request.CustomerPhone,
                request.CustomerBvn,
                formattedDob,           // ✅ Safe parsed & formatted DOB
                request.CustomerAddress,
                request.CustomerGender
            );

            if (squadAccount == null || !string.IsNullOrEmpty(squadAccount.ErrorMessage))
            {
                bool useSandbox = _configuration.GetValue<bool>("Squad:UseSandbox");
                if (useSandbox)
                {
                    _logger.LogWarning("[Register] Squad Sandbox Virtual Account generation failed (merchant limit reached). Falling back to a simulated account for testing.");
                    squadAccount = new SquadVirtualAccountResponse
                    {
                        VirtualAccountNumber = "999" + new Random().Next(10000000, 99999999).ToString(),
                        BankName = "Guaranty Trust Bank (Simulated Sandbox)"
                    };
                }
                else
                {
                    string errMsg = squadAccount?.ErrorMessage ?? "Failed to generate a virtual account with Squad. Please verify customer details and try again.";
                    return BadRequest(errMsg);
                }
            }

            var newSystem = new SolarSystem
            {
                HardwareId = request.HardwareId,
                OwnerName = request.OwnerName,
                StronMeterId = request.StronMeterId,
                VirtualAccountNumber = squadAccount?.VirtualAccountNumber,
                VirtualBankName = squadAccount?.BankName ?? "Guaranty Trust Bank (Squad)",
                CustomerEmail = request.CustomerEmail,
                CustomerPhone = request.CustomerPhone,
                CustomerBvn = request.CustomerBvn,
                CustomerDob = request.CustomerDob,
                CustomerGender = request.CustomerGender,
                GeneratorCapacity = !string.IsNullOrWhiteSpace(request.GeneratorCapacity) ? request.GeneratorCapacity : "2KV",
                // Derive MaxLoadWatts from GeneratorCapacity (KV -> Watts)
                MaxLoadWatts = (int)(ParseCapacityKw(request.GeneratorCapacity) * 1000),
                Status = "Locked",
                AvailableUnits = 0.0M,
                PrepaidNairaBalance = 0.0M,
                CumulativeKwhBought = 0.0M,
                CumulativeKwhConsumed = 0m,
                LastSyncTime = DateTime.UtcNow,
                LastSyncKwh = 0m
            };

            _context.SolarSystems.Add(newSystem);
            await _context.SaveChangesAsync();

            return Ok(newSystem);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("systems/{id}/disable")]
        public async Task<IActionResult> DisableSystem(int id)
        {
            var system = await _context.SolarSystems.FindAsync(id);
            if (system == null) return NotFound();

            system.Status = "Disabled";
            system.RelayState = "0";
            if (!string.IsNullOrWhiteSpace(system.StronMeterId))
            {
                await _vendingService.SetRemoteSwitchAsync(system.StronMeterId, turnOn: false);
            }

            await _context.SaveChangesAsync();
            return Ok(system);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("systems/{id}/enable")]
        public async Task<IActionResult> EnableSystem(int id)
        {
            var system = await _context.SolarSystems.FindAsync(id);
            if (system == null) return NotFound();

            system.Status = system.PrepaidNairaBalance > 0 && system.AvailableUnits > 0 ? "Active" : "Locked";
            system.RelayState = system.Status == "Active" ? "1" : "0";
            
            if (!string.IsNullOrWhiteSpace(system.StronMeterId))
            {
                await _vendingService.SetRemoteSwitchAsync(system.StronMeterId, turnOn: system.Status == "Active");
            }

            await _context.SaveChangesAsync();
            return Ok(system);
        }

        // Helper Split Name Methods for Squad Model
        private string GetFirstName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "Customer";
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length > 0 ? parts[0] : "Customer";
        }

        // Helper to parse numeric kW from a string like "2KV".
        private static int ParseCapacityKw(string capacity)
        {
            if (string.IsNullOrWhiteSpace(capacity))
                return 2; // Default fallback
            var numeric = new string(capacity.Where(char.IsDigit).ToArray());
            if (int.TryParse(numeric, out var kw))
                return kw;
            return 2;
        }

        private string GetLastName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "User";
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length > 1 ? parts[parts.Length - 1] : "User";
        }
    }
}
