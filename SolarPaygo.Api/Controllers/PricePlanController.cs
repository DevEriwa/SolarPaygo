using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PricePlanController : ControllerBase
    {
        private readonly SolarDbContext _context;

        public PricePlanController(SolarDbContext context)
        {
            _context = context;
        }

        // GET /api/priceplan — list all price plans
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var plans = await _context.PricePlans.OrderBy(p => p.CreatedAt).ToListAsync();
            return Ok(plans);
        }

        public class UpsertPricePlanRequest
        {
            public string Name { get; set; } = string.Empty;
            public decimal PricePerKwh { get; set; }

            public bool LoyaltyDiscountEnabled { get; set; }
            public decimal LoyaltyThresholdKwh { get; set; }
            public decimal LoyaltyDiscountPercent { get; set; }

            public bool TimeFloorProtectionEnabled { get; set; }
            public decimal TimeFloorRatePerHour { get; set; }
            public decimal TimeFloorMinimumKwh { get; set; }
        }

        private static string? ValidatePlanRequest(UpsertPricePlanRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return "Name is required.";

            if (request.PricePerKwh <= 0)
                return "PricePerKwh must be greater than 0.";

            if (request.LoyaltyDiscountEnabled)
            {
                if (request.LoyaltyThresholdKwh < 0)
                    return "LoyaltyThresholdKwh cannot be negative.";
                if (request.LoyaltyDiscountPercent < 0 || request.LoyaltyDiscountPercent > 100)
                    return "LoyaltyDiscountPercent must be between 0 and 100.";
            }

            if (request.TimeFloorProtectionEnabled)
            {
                if (request.TimeFloorRatePerHour < 0)
                    return "TimeFloorRatePerHour cannot be negative.";
                if (request.TimeFloorMinimumKwh < 0)
                    return "TimeFloorMinimumKwh cannot be negative.";
            }

            return null;
        }

        // POST /api/priceplan — create a new price plan. No fixed limit on how many can exist;
        // the "Band" letter is a legacy label from the original 3 seeded plans and isn't required
        // for new ones — Name is the primary identifier everywhere in the app.
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UpsertPricePlanRequest request)
        {
            var error = ValidatePlanRequest(request);
            if (error != null) return BadRequest(error);

            var plan = new PricePlan
            {
                Name = request.Name.Trim(),
                PricePerKwh = request.PricePerKwh,
                LoyaltyDiscountEnabled = request.LoyaltyDiscountEnabled,
                LoyaltyThresholdKwh = request.LoyaltyThresholdKwh,
                LoyaltyDiscountPercent = request.LoyaltyDiscountPercent,
                TimeFloorProtectionEnabled = request.TimeFloorProtectionEnabled,
                TimeFloorRatePerHour = request.TimeFloorRatePerHour,
                TimeFloorMinimumKwh = request.TimeFloorMinimumKwh
            };

            _context.PricePlans.Add(plan);
            await _context.SaveChangesAsync();
            return Ok(plan);
        }

        // PUT /api/priceplan/{id} — update a plan's name, price, and loyalty/time-floor parameters.
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpsertPricePlanRequest request)
        {
            var plan = await _context.PricePlans.FindAsync(id);
            if (plan == null) return NotFound("Price plan not found.");

            var error = ValidatePlanRequest(request);
            if (error != null) return BadRequest(error);

            plan.Name = request.Name.Trim();
            plan.PricePerKwh = request.PricePerKwh;

            plan.LoyaltyDiscountEnabled = request.LoyaltyDiscountEnabled;
            plan.LoyaltyThresholdKwh = request.LoyaltyThresholdKwh;
            plan.LoyaltyDiscountPercent = request.LoyaltyDiscountPercent;

            plan.TimeFloorProtectionEnabled = request.TimeFloorProtectionEnabled;
            plan.TimeFloorRatePerHour = request.TimeFloorRatePerHour;
            plan.TimeFloorMinimumKwh = request.TimeFloorMinimumKwh;

            plan.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(plan);
        }

        // DELETE /api/priceplan/{id} — delete a plan. Any customer currently assigned to it is
        // explicitly reverted to standard pricing here (PricePlanId set to null) before the plan
        // row is removed. Note: this app's actual live schema is applied via the idempotent raw-SQL
        // block in Program.cs, not EF migrations, so the FK's OnDelete(DeleteBehavior.SetNull)
        // model configuration in SolarDbContext is never materialized as a real database
        // constraint — it has no effect unless the affected SolarSystem rows are already loaded
        // into this same tracked context, which they aren't by default. Doing it explicitly here
        // is what actually guarantees no customer is left pointing at a deleted plan.
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var plan = await _context.PricePlans.FindAsync(id);
            if (plan == null) return NotFound("Price plan not found.");

            var affectedSystems = await _context.SolarSystems.Where(s => s.PricePlanId == id).ToListAsync();
            foreach (var sys in affectedSystems)
            {
                sys.PricePlanId = null;
            }

            _context.PricePlans.Remove(plan);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = affectedSystems.Count > 0
                    ? $"Plan deleted. {affectedSystems.Count} customer(s) reverted to standard pricing."
                    : "Plan deleted.",
                affectedCustomers = affectedSystems.Count
            });
        }

        public class AssignPlanRequest
        {
            public int SolarSystemId { get; set; }
            public int? PricePlanId { get; set; } // null = unassign, revert to legacy pricing
        }

        // POST /api/priceplan/assign — assign or clear a band on a new or existing SolarSystem
        [Authorize(Roles = "Admin")]
        [HttpPost("assign")]
        public async Task<IActionResult> AssignPlan([FromBody] AssignPlanRequest request)
        {
            var system = await _context.SolarSystems.FindAsync(request.SolarSystemId);
            if (system == null) return NotFound("Solar system not found.");

            if (request.PricePlanId.HasValue)
            {
                bool exists = await _context.PricePlans.AnyAsync(p => p.Id == request.PricePlanId.Value);
                if (!exists) return BadRequest("Price plan not found.");
            }

            system.PricePlanId = request.PricePlanId;
            await _context.SaveChangesAsync();

            return Ok(system);
        }
    }
}
