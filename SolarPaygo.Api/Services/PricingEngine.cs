using SolarPaygo.Api.Models;

namespace SolarPaygo.Api.Services
{
    // Single source of truth for per-kWh rate and daily billing-floor calculations.
    // Replaces the identical hardcoded logic that used to live independently in
    // PaymentController, TelemetrySyncService, and DashboardController.
    public static class PricingEngine
    {
        public const decimal LegacyBaseRate = 2500m;
        public const decimal LegacyDiscountRate = 1250m;
        public const decimal LoyaltyThresholdKwh = 500m;
        public const decimal TimeFloorRatePerHour = 313m;
        public const decimal MinimumDailyChargeFactor = 0.3m;

        // Resolves the rate to charge per kWh for a given system.
        // sys.PricePlan must already be loaded (via .Include) for band-assigned systems —
        // if it's null (unassigned OR not loaded), this reproduces the original hardcoded
        // behavior exactly: byte-for-byte legacy pricing.
        public static decimal ResolveRate(SolarSystem sys)
        {
            var plan = sys.PricePlan;
            if (plan == null)
            {
                // Legacy path — deliberately left as a literal copy of the original ternary.
                return sys.CumulativeKwhConsumed >= LoyaltyThresholdKwh ? LegacyDiscountRate : LegacyBaseRate;
            }

            if (plan.LoyaltyDiscountEnabled && sys.CumulativeKwhConsumed >= plan.LoyaltyThresholdKwh)
            {
                decimal discountFraction = Math.Clamp(plan.LoyaltyDiscountPercent, 0m, 100m) / 100m;
                return plan.PricePerKwh * (1m - discountFraction);
            }

            return plan.PricePerKwh;
        }

        // Computes today's target billing charge given the already-resolved rate.
        // When TimeFloorProtectionEnabled is false, billing is plain per-kWh with no minimum.
        // Unassigned systems (plan == null) always have the floor applied, matching legacy behavior.
        public static decimal ComputeTargetDailyCharge(SolarSystem sys, decimal rate)
        {
            decimal energyCharge = sys.DailyKwhConsumed * rate;

            var plan = sys.PricePlan;
            bool floorEnabled = plan?.TimeFloorProtectionEnabled ?? true;
            if (!floorEnabled)
            {
                return energyCharge;
            }

            decimal timeFloorRatePerHour = plan?.TimeFloorRatePerHour ?? TimeFloorRatePerHour;
            decimal minimumChargeFactor = plan?.TimeFloorMinimumKwh ?? MinimumDailyChargeFactor;

            decimal timeCharge = sys.DailyTimeActiveHours * timeFloorRatePerHour;
            decimal minimumDailyCharge = minimumChargeFactor * rate;
            return Math.Max(minimumDailyCharge, Math.Max(energyCharge, timeCharge));
        }
    }
}
