namespace SolarPaygo.Api.Models
{
    public class SolarSystem
    {
        public int Id { get; set; }
        public string HardwareId { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // Active, Locked, Disabled
        public decimal AvailableUnits { get; set; }
        public string? OwnerName { get; set; }

        // Stron STE18-G Prepaid Meter Integration
        public string? StronMeterId { get; set; }
        
        // Squad Virtual Account Details
        public string? VirtualAccountNumber { get; set; }
        public string? VirtualBankName { get; set; } = "Guaranty Trust Bank (Squad)";
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerBvn { get; set; }
        public string? CustomerDob { get; set; } = "1990-01-01";
        public string? CustomerGender { get; set; } = "1"; // 1=Male,2=Female,3=Other

        // Hybrid Billing Fields
        public decimal PrepaidNairaBalance { get; set; }
        public decimal CumulativeKwhConsumed { get; set; }
        public DateTime? LastSyncTime { get; set; }
        public decimal LastSyncKwh { get; set; }

        // Pending Wallet: naira paid but not yet converted into a vended token (either below
        // the per-customer minimum threshold, or a leftover remainder after a conversion).
        // Entirely separate from PrepaidNairaBalance, which continues to feed the daily
        // hybrid-billing/relay-lock subsystem untouched.
        public decimal PendingWalletBalance { get; set; } = 0.0M;

        // Daily Watermark Billing & Overload Fields
        public int MaxLoadWatts { get; set; } = 400; // Configurable max load threshold
        public DateTime? LastBillingDate { get; set; }
        public decimal DailyKwhConsumed { get; set; }
        public decimal DailyTimeActiveHours { get; set; }
        public decimal DailyAmountCharged { get; set; }

        // Live Telemetry (Synced from Stron Meter)
        public decimal Voltage { get; set; } = 230; // V (default)
        public decimal Current { get; set; } // A
        public decimal Power { get; set; } // W
        public string RelayState { get; set; } = "1"; // "1" = closed/on, "0" = open/off
        public string CoverState { get; set; } = "0"; // "0" = normal, "1" = tampered

        // New properties for unit history and generator capacity tracking
        public decimal CumulativeKwhBought { get; set; } = 0.0M;
        public string GeneratorCapacity { get; set; } = "2KV";

        // Assigned Price Plan (Band). Null means legacy hardcoded pricing — preserves
        // existing billing behavior for any customer not explicitly assigned a band.
        public int? PricePlanId { get; set; }
        public PricePlan? PricePlan { get; set; }

        // True once a low-balance alert email has been sent for the CURRENT low-balance
        // episode. Reset to false once the balance recovers, so the next dip sends a fresh
        // alert instead of staying silent forever or re-sending every poll cycle.
        public bool LowBalanceNotified { get; set; } = false;
    }
}
