using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace SolarPaygo.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "SuperAdmin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly SolarDbContext _context;
        private readonly IConfiguration _config;

        public SuperAdminController(SolarDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public class AdminDto
        {
            public int Id { get; set; }
            public string Username { get; set; } = string.Empty;
            public string Role { get; set; } = string.Empty;
            public bool IsActive { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            var admins = await _context.AdminAccounts
                .Select(a => new AdminDto {
                    Id = a.Id,
                    Username = a.Username,
                    Role = a.Role,
                    IsActive = a.IsActive,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            if (!admins.Any())
            {
                admins.Add(new AdminDto { Id = 1, Username = "superadmin", Role = "SuperAdmin", IsActive = true, CreatedAt = DateTime.UtcNow });
                admins.Add(new AdminDto { Id = 2, Username = "admin", Role = "Admin", IsActive = true, CreatedAt = DateTime.UtcNow });
            }

            var customers = await _context.SolarSystems
                .Select(s => new {
                    s.Id,
                    s.HardwareId,
                    s.OwnerName,
                    s.CustomerEmail,
                    s.CustomerPhone,
                    s.StronMeterId,
                    s.Status,
                    s.AvailableUnits,
                    s.PrepaidNairaBalance,
                    s.PendingWalletBalance,
                    s.CumulativeKwhConsumed,
                    s.Power,
                    s.RelayState
                })
                .OrderByDescending(s => s.Id)
                .ToListAsync();

            var totalSystems = customers.Count;
            var activeSystems = customers.Count(s => s.Status == "Active");
            var totalBalance = customers.Sum(s => s.PrepaidNairaBalance);

            return Ok(new
            {
                Admins = admins,
                Customers = customers,
                Summary = new
                {
                    TotalSystems = totalSystems,
                    ActiveSystems = activeSystems,
                    TotalBalance = totalBalance
                }
            });
        }

        public class ToggleStatusRequest
        {
            public int Id { get; set; }
            public bool IsActive { get; set; }
        }

        [HttpPost("toggle-admin")]
        public async Task<IActionResult> ToggleAdminStatus([FromBody] ToggleStatusRequest req)
        {
            var admin = await _context.AdminAccounts.FindAsync(req.Id);
            if (admin == null) return NotFound("Admin not found");
            if (admin.Role == "SuperAdmin") return BadRequest("SuperAdmin status cannot be modified.");

            admin.IsActive = req.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, isActive = admin.IsActive });
        }

        [HttpPost("toggle-customer")]
        public async Task<IActionResult> ToggleCustomerStatus([FromBody] ToggleStatusRequest req)
        {
            var system = await _context.SolarSystems.FindAsync(req.Id);
            if (system == null) return NotFound("Customer system not found");

            system.Status = req.IsActive ? "Active" : "Disabled";
            await _context.SaveChangesAsync();
            return Ok(new { success = true, status = system.Status });
        }

        public class ImpersonateRequest
        {
            public string TargetType { get; set; } = "Admin"; // "Admin" or "Customer"
            public string TargetIdentifier { get; set; } = string.Empty;
        }

        [HttpPost("impersonate")]
        public async Task<IActionResult> Impersonate([FromBody] ImpersonateRequest req)
        {
            if (req.TargetType.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                var username = string.IsNullOrWhiteSpace(req.TargetIdentifier) ? "admin" : req.TargetIdentifier;
                var token = GenerateImpersonatedJwt(username, "Admin", 0);
                return Ok(new { Token = token, Role = "Admin", Target = username });
            }
            else if (req.TargetType.Equals("Customer", StringComparison.OrdinalIgnoreCase))
            {
                SolarSystem? system = null;
                if (int.TryParse(req.TargetIdentifier, out int sysId))
                {
                    system = await _context.SolarSystems.FindAsync(sysId);
                }
                else
                {
                    system = await _context.SolarSystems.FirstOrDefaultAsync(s => s.CustomerEmail != null && s.CustomerEmail.ToLower() == req.TargetIdentifier.ToLower());
                }

                if (system == null) return NotFound("Customer system not found for impersonation");

                var token = GenerateImpersonatedJwt(system.CustomerEmail ?? system.HardwareId, "Customer", system.Id);
                return Ok(new { Token = token, Role = "Customer", Target = system.OwnerName ?? system.CustomerEmail ?? system.HardwareId, SystemId = system.Id });
            }

            return BadRequest("Invalid target type");
        }

        private string GenerateImpersonatedJwt(string subject, string role, int systemId)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, subject),
                new Claim(ClaimTypes.Role, role),
                new Claim("GhostMode", "true"),
                new Claim("ImpersonatedBy", "superadmin")
            };

            if (systemId > 0)
            {
                claims.Add(new Claim("SystemId", systemId.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(4),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
