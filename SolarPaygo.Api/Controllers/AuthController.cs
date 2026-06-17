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

            // Admin Check
            if (username.Equals("admin", StringComparison.OrdinalIgnoreCase) && password == "admin123")
            {
                return Ok(new { Token = GenerateJwtToken("admin", "Admin", 0) });
            }

            // Customer Check: Username = Email, Password = HardwareId
            var system = await _context.SolarSystems.FirstOrDefaultAsync(s => 
                s.CustomerEmail != null && s.CustomerEmail.ToLower() == username.ToLower() && 
                s.HardwareId == password);
                
            if (system != null)
            {
                return Ok(new { Token = GenerateJwtToken(system.CustomerEmail ?? string.Empty, "Customer", system.Id) });
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
                new Claim(ClaimTypes.Role, role)
            };

            if (systemId > 0)
            {
                claims.Add(new Claim("SystemId", systemId.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
