namespace SolarPaygo.Api.Models
{
    public class PricePlan
    {
        public int Id { get; set; }
        public string Band { get; set; } = string.Empty; // "A", "B", "C" — fixed, not user-creatable
        public string Name { get; set; } = string.Empty; // display label, e.g. "Band A"
        public decimal PricePerKwh { get; set; }

        public bool LoyaltyDiscountEnabled { get; set; }
        // Editable parameters for the loyalty tier, used only when LoyaltyDiscountEnabled is true.
        // Defaults match the platform's original hardcoded rule (500 kWh / 50% off).
        public decimal LoyaltyThresholdKwh { get; set; } = 500m;
        public decimal LoyaltyDiscountPercent { get; set; } = 50m;

        public bool TimeFloorProtectionEnabled { get; set; }
        // Editable parameters for the daily minimum charge, used only when TimeFloorProtectionEnabled is true.
        // Defaults match the platform's original hardcoded rule (₦313/hr, 0.3 kWh minimum).
        public decimal TimeFloorRatePerHour { get; set; } = 313m;
        public decimal TimeFloorMinimumKwh { get; set; } = 0.3m;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
