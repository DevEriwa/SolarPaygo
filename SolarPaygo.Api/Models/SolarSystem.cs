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
    }
}
