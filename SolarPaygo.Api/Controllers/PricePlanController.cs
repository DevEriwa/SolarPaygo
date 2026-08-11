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

        // GET /api/priceplan — list the 3 fixed bands
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var plans = await _context.PricePlans.OrderBy(p => p.Band).ToListAsync();
            return Ok(plans);
        }

        public class UpdatePricePlanRequest
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

        // PUT /api/priceplan/{id} — update a band's name, price, and loyalty/time-floor parameters.
        // Band letter (A/B/C) itself is immutable — only its configuration can change.
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePricePlanRequest request)
        {
            var plan = await _context.PricePlans.FindAsync(id);
            if (plan == null) return NotFound("Price plan not found.");

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Name is required.");

            if (request.PricePerKwh <= 0)
                return BadRequest("PricePerKwh must be greater than 0.");

            if (request.LoyaltyDiscountEnabled)
            {
                if (request.LoyaltyThresholdKwh < 0)
                    return BadRequest("LoyaltyThresholdKwh cannot be negative.");
                if (request.LoyaltyDiscountPercent < 0 || request.LoyaltyDiscountPercent > 100)
                    return BadRequest("LoyaltyDiscountPercent must be between 0 and 100.");
            }

            if (request.TimeFloorProtectionEnabled)
            {
                if (request.TimeFloorRatePerHour < 0)
                    return BadRequest("TimeFloorRatePerHour cannot be negative.");
                if (request.TimeFloorMinimumKwh < 0)
                    return BadRequest("TimeFloorMinimumKwh cannot be negative.");
            }

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
