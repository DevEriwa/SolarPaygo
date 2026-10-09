using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using SolarPaygo.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace SolarPaygo.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly SolarDbContext _context;

        public AuthController(IConfiguration config, SolarDbContext context)
        {
            _config = config;
            _context = context;
        }

        public class LoginRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var username = request.Username?.Trim() ?? "";
            var password = request.Password?.Trim() ?? "";

            // Check DB AdminAccounts first
            try
            {
                var adminUser = await _context.AdminAccounts.FirstOrDefaultAsync(a => a.Username.ToLower() == username.ToLower());
                if (adminUser != null)
                {
                    if (!adminUser.IsActive)
                    {
                        return Unauthorized("This administrator account has been deactivated.");
                    }
                    if (adminUser.Password == password)
                    {
                        return Ok(new { Token = GenerateJwtToken(adminUser.Username, adminUser.Role, adminUser.DeviceGroupId ?? 0), Role = adminUser.Role, DeviceGroupId = adminUser.DeviceGroupId });
                    }
                    return Unauthorized("Invalid credentials");
                }
            }
            catch { /* fallback to hardcoded if table not yet queried */ }

            // SuperAdmin Check
            if (username.Equals("superadmin", StringComparison.OrdinalIgnoreCase) && password == "SuperAdmin@2026!")
            {
                return Ok(new { Token = GenerateJwtToken("superadmin", "SuperAdmin", 0) });
            }

            // Standard Admin Check
            if (username.Equals("admin", StringComparison.OrdinalIgnoreCase) && password == "admin123")
            {
                return Ok(new { Token = GenerateJwtToken("admin", "Admin", 0) });
            }

            // Customer Check: Username = Email
            var system = await _context.SolarSystems.FirstOrDefaultAsync(s => 
                s.CustomerEmail != null && s.CustomerEmail.ToLower() == username.ToLower());
                
            if (system != null)
            {
                if (system.Status == "Disabled" || system.Status == "Inactive")
                {
                    return Unauthorized("This customer account has been deactivated.");
                }

                // Password verification: custom password if set, otherwise fallback to HardwareId
                bool passwordMatches = !string.IsNullOrEmpty(system.CustomerPassword)
                    ? string.Equals(system.CustomerPassword, password, StringComparison.Ordinal)
                    : string.Equals(system.HardwareId, password, StringComparison.OrdinalIgnoreCase);

                if (passwordMatches)
                {
                    return Ok(new { Token = GenerateJwtToken(system.CustomerEmail ?? string.Empty, "Customer", system.Id) });
                }

                return Unauthorized("Invalid credentials");
            }

            return Unauthorized("Invalid credentials");
        }

        private string GenerateJwtToken(string subject, string role, int systemId)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, subject),
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, subject)
            };

            if (systemId > 0)
            {
                claims.Add(new Claim("SystemId", systemId.ToString()));
                claims.Add(new Claim("DeviceGroupId", systemId.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }



        [Authorize(Roles = "Admin")]
        [HttpGet("debug/customer/{email}")]
        public async Task<IActionResult> DebugCustomer(string email)
        {
            var system = await _context.SolarSystems
                .FirstOrDefaultAsync(s => s.CustomerEmail.ToLower() == email.ToLower());

            return system == null ? NotFound() : Ok(system);
        }

        [Authorize(Roles = "Customer")]
        [HttpPost("customer/change-password")]
        public async Task<IActionResult> ChangeCustomerPassword([FromBody] ChangeCustomerPasswordRequest request)
        {
            var systemIdClaim = User.Claims.FirstOrDefault(c => c.Type == "SystemId")?.Value;
            if (string.IsNullOrEmpty(systemIdClaim) || !int.TryParse(systemIdClaim, out int systemId))
            {
                return Unauthorized();
            }

            var system = await _context.SolarSystems.FindAsync(systemId);
            if (system == null) return NotFound("Account not found.");

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 4)
            {
                return BadRequest(new { message = "New password must be at least 4 characters long." });
            }

            // Verify current password
            bool currentMatches = !string.IsNullOrEmpty(system.CustomerPassword)
                ? string.Equals(system.CustomerPassword, request.CurrentPassword, StringComparison.Ordinal)
                : string.Equals(system.HardwareId, request.CurrentPassword, StringComparison.OrdinalIgnoreCase);

            if (!currentMatches)
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            system.CustomerPassword = request.NewPassword.Trim();
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully! Please use your new password next time you log in." });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("customer/{id}/reset-password")]
        public async Task<IActionResult> AdminResetCustomerPassword(int id)
        {
            var system = await _context.SolarSystems.FindAsync(id);
            if (system == null) return NotFound("Customer system not found.");

            system.CustomerPassword = null; // resets to default HardwareId
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Password has been reset to default ({system.HardwareId})." });
        }

        public class ChangeCustomerPasswordRequest
        {
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }
    }
}
