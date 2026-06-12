using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;

namespace SolarPaygo.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DeviceController : ControllerBase
    {
        private readonly SolarDbContext _context;

        public DeviceController(SolarDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> RegisterDevice([FromBody] string hardwareId)
        {
            if (string.IsNullOrWhiteSpace(hardwareId))
                return BadRequest("HardwareId is required.");

            var existing = await _context.SolarSystems.FirstOrDefaultAsync(s => s.HardwareId == hardwareId);
            if (existing != null)
                return Ok(existing);

            var newSystem = new SolarSystem
            {
                HardwareId = hardwareId,
                Status = "Active",
                AvailableUnits = 100m // Default free units
            };

            _context.SolarSystems.Add(newSystem);
            await _context.SaveChangesAsync();

            return Ok(newSystem);
        }

        [HttpPost("{id}/ping")]
        public async Task<IActionResult> Ping(int id, [FromBody] decimal unitsUsed)
        {
            var system = await _context.SolarSystems.FindAsync(id);
            if (system == null)
                return NotFound();

            if (system.Status == "Disabled")
                return Ok(new { Action = "Disable" });

            if (unitsUsed > 0 && system.Status == "Active")
            {
                system.AvailableUnits -= unitsUsed;
                
                var log = new UsageLog
                {
                    SolarSystemId = id,
                    UnitsConsumed = unitsUsed
                };
                _context.UsageLogs.Add(log);

                if (system.AvailableUnits <= 0)
                {
                    system.AvailableUnits = 0;
                    system.Status = "Locked";
                }

                await _context.SaveChangesAsync();
            }

            string action = system.Status == "Locked" ? "Lock" : "Unlock";
            return Ok(new { Action = action, AvailableUnits = system.AvailableUnits });
        }
    }
}
