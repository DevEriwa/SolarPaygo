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
    public class GeneratorCapacityController : ControllerBase
    {
        private readonly SolarDbContext _context;

        public GeneratorCapacityController(SolarDbContext context)
        {
            _context = context;
        }

        // GET /api/generatorcapacity — the picker's list.
        // Readable by any signed-in user because the registration form needs it; only the
        // list is exposed, and nothing here is customer data.
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        {
            var query = _context.GeneratorCapacities.AsQueryable();

            if (!includeInactive)
                query = query.Where(c => c.IsActive);

            var capacities = await query
                .OrderBy(c => c.DisplayOrder)
                .ThenBy(c => c.Watts)
                .ToListAsync();

            return Ok(capacities);
        }

        // POST /api/generatorcapacity
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UpsertCapacityRequest request)
        {
            var error = Validate(request);
            if (error != null) return BadRequest(error);

            var code = request.Code.Trim();

            if (await _context.GeneratorCapacities.AnyAsync(c => c.Code == code))
                return BadRequest($"A capacity with the code \"{code}\" already exists.");

            var capacity = new GeneratorCapacity
            {
                Code = code,
                Name = request.Name.Trim(),
                Watts = request.Watts,
                IsActive = request.IsActive,
                DisplayOrder = request.DisplayOrder,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.GeneratorCapacities.Add(capacity);
            await _context.SaveChangesAsync();

            return Ok(capacity);
        }

        // PUT /api/generatorcapacity/{id}
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpsertCapacityRequest request)
        {
            var error = Validate(request);
            if (error != null) return BadRequest(error);

            var capacity = await _context.GeneratorCapacities.FindAsync(id);
            if (capacity == null) return NotFound("Capacity not found.");

            var code = request.Code.Trim();

            if (await _context.GeneratorCapacities.AnyAsync(c => c.Code == code && c.Id != id))
                return BadRequest($"A capacity with the code \"{code}\" already exists.");

            // Customers store the code, not the id. Renaming a code in use would leave those
            // rows pointing at a value that no longer exists, so the customers are moved with
            // it in the same save - either both change or neither does.
            var inUse = await _context.SolarSystems.CountAsync(s => s.GeneratorCapacity == capacity.Code);
            var oldCode = capacity.Code;

            capacity.Code = code;
            capacity.Name = request.Name.Trim();
            capacity.Watts = request.Watts;
            capacity.IsActive = request.IsActive;
            capacity.DisplayOrder = request.DisplayOrder;
            capacity.UpdatedAt = DateTime.UtcNow;

            // Customers on this size are updated in the same save: the code so their stored
            // value stays valid, and the ceiling so it matches what the size now means.
            // Leaving the ceiling behind would let a generator run past its rated load until
            // the next sync recalculated it, which is the window where a relay should have
            // tripped and did not.
            var affected = await _context.SolarSystems
                .Where(s => s.GeneratorCapacity == oldCode)
                .ToListAsync();

            foreach (var sys in affected)
            {
                sys.GeneratorCapacity = code;
                sys.MaxLoadWatts = request.Watts;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                capacity,
                message = oldCode != code && inUse > 0
                    ? $"Capacity updated. {inUse} customer(s) moved from \"{oldCode}\" to \"{code}\"."
                    : "Capacity updated.",
                affectedCustomers = oldCode != code ? inUse : 0
            });
        }

        // DELETE /api/generatorcapacity/{id}
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var capacity = await _context.GeneratorCapacities.FindAsync(id);
            if (capacity == null) return NotFound("Capacity not found.");

            var inUse = await _context.SolarSystems.CountAsync(s => s.GeneratorCapacity == capacity.Code);

            // Refused rather than cascaded. A customer whose capacity vanished has no load
            // ceiling to check against, and unlike a price band there is no sane default to
            // fall back to - so a size in use is retired, not removed.
            if (inUse > 0)
            {
                return BadRequest(new
                {
                    message = $"\"{capacity.Code}\" is assigned to {inUse} customer(s) and cannot be deleted. " +
                              "Set it inactive instead - it will disappear from the picker while those " +
                              "customers keep working.",
                    affectedCustomers = inUse
                });
            }

            _context.GeneratorCapacities.Remove(capacity);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"\"{capacity.Code}\" deleted." });
        }

        private static string? Validate(UpsertCapacityRequest request)
        {
            if (request == null) return "No capacity supplied.";
            if (string.IsNullOrWhiteSpace(request.Code)) return "Code is required, for example \"2KV\".";
            if (string.IsNullOrWhiteSpace(request.Name)) return "Name is required.";

            // A zero or negative ceiling would either trip instantly or never trip at all.
            if (request.Watts <= 0) return "Watts must be greater than zero.";
            if (request.Watts > 1_000_000) return "Watts looks wrong - that is over a megawatt.";

            return null;
        }

        public class UpsertCapacityRequest
        {
            public string Code { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public int Watts { get; set; }
            public bool IsActive { get; set; } = true;
            public int DisplayOrder { get; set; }
        }
    }
}
