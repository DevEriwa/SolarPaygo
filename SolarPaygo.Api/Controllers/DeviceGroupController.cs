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
    public class DeviceGroupController : ControllerBase
    {
        private readonly SolarDbContext _context;

        public DeviceGroupController(SolarDbContext context)
        {
            _context = context;
        }

        // GET /api/devicegroup — List device groups/tabs
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        {
            var query = _context.DeviceGroups.AsQueryable();

            if (!includeInactive)
                query = query.Where(g => g.IsActive);

            var groups = await query
                .OrderBy(g => g.DisplayOrder)
                .ThenBy(g => g.Name)
                .ToListAsync();

            return Ok(groups);
        }

        // POST /api/devicegroup — Create a new group
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UpsertGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Group Name is required.");

            var name = request.Name.Trim();

            if (await _context.DeviceGroups.AnyAsync(g => g.Name == name))
                return BadRequest($"A group named \"{name}\" already exists.");

            var group = new DeviceGroup
            {
                Name = name,
                Description = request.Description?.Trim(),
                DisplayOrder = request.DisplayOrder,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DeviceGroups.Add(group);
            await _context.SaveChangesAsync();

            return Ok(group);
        }

        // PUT /api/devicegroup/{id} — Update a group
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpsertGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Group Name is required.");

            var group = await _context.DeviceGroups.FindAsync(id);
            if (group == null) return NotFound("Device group not found.");

            var name = request.Name.Trim();

            if (await _context.DeviceGroups.AnyAsync(g => g.Name == name && g.Id != id))
                return BadRequest($"A group named \"{name}\" already exists.");

            group.Name = name;
            group.Description = request.Description?.Trim();
            group.DisplayOrder = request.DisplayOrder;
            group.IsActive = request.IsActive;
            group.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(group);
        }

        // DELETE /api/devicegroup/{id} — Delete a group
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var group = await _context.DeviceGroups.FindAsync(id);
            if (group == null) return NotFound("Device group not found.");

            var affectedSystems = await _context.SolarSystems.Where(s => s.DeviceGroupId == id).ToListAsync();
            foreach (var sys in affectedSystems)
            {
                sys.DeviceGroupId = null;
            }

            _context.DeviceGroups.Remove(group);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = affectedSystems.Count > 0
                    ? $"Group deleted. {affectedSystems.Count} customer(s) reverted to Ungrouped."
                    : "Group deleted.",
                affectedCustomers = affectedSystems.Count
            });
        }

        public class UpsertGroupRequest
        {
            public string Name { get; set; } = string.Empty;
            public string? Description { get; set; }
            public int DisplayOrder { get; set; }
            public bool IsActive { get; set; } = true;
        }
    }
}
