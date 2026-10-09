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

            var accountIds = groups.Where(g => g.InvestorAdminAccountId.HasValue)
                                   .Select(g => g.InvestorAdminAccountId!.Value)
                                   .ToList();

            var accounts = await _context.AdminAccounts
                .Where(a => accountIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => new { a.Username, a.IsActive });

            var systemCounts = await _context.SolarSystems
                .Where(s => s.DeviceGroupId.HasValue)
                .GroupBy(s => s.DeviceGroupId!.Value)
                .Select(g => new { GroupId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.GroupId, g => g.Count);

            var result = groups.Select(g => new
            {
                g.Id,
                g.Name,
                g.Description,
                g.DisplayOrder,
                g.IsActive,
                g.InvestorsCapital,
                g.IsRoiEnabled,
                g.RoiPercentage,
                g.RemittanceSharePercent,
                g.SettlementCycle,
                g.IsReturnCapital,
                g.ExitNoticeDate,
                g.ExitTargetDate,
                g.ExitCapitalAmount,
                g.IsAccountClosed,
                g.InvestorAdminAccountId,
                DaysRemainingInExitWindow = g.ExitTargetDate.HasValue
                    ? Math.Max(0, (int)(g.ExitTargetDate.Value - DateTime.UtcNow).TotalDays)
                    : (int?)null,
                InvestorUsername = g.InvestorAdminAccountId.HasValue && accounts.ContainsKey(g.InvestorAdminAccountId.Value)
                    ? accounts[g.InvestorAdminAccountId.Value].Username
                    : null,
                MeterCount = systemCounts.ContainsKey(g.Id) ? systemCounts[g.Id] : 0,
                g.CreatedAt,
                g.UpdatedAt
            });

            return Ok(result);
        }

        // POST /api/devicegroup — Create a new group
        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UpsertGroupRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Group Name is required.");

            var name = request.Name.Trim();

            if (await _context.DeviceGroups.AnyAsync(g => g.Name == name))
                return BadRequest($"A group named \"{name}\" already exists.");

            var roi = request.RoiPercentage > 0 ? request.RoiPercentage : (request.IsReturnCapital ? 10m : 15m);
            var share = request.RemittanceSharePercent > 0 ? request.RemittanceSharePercent : 100m;
            var cycle = !string.IsNullOrWhiteSpace(request.SettlementCycle) ? request.SettlementCycle : "Monthly";

            DateTime? exitNotice = null;
            DateTime? exitTarget = null;
            decimal? exitCapital = null;

            if (request.IsReturnCapital)
            {
                exitNotice = DateTime.UtcNow;
                exitTarget = DateTime.UtcNow.AddYears(1);
                exitCapital = request.InvestorsCapital + (request.InvestorsCapital * (roi / 100m));
            }

            var group = new DeviceGroup
            {
                Name = name,
                Description = request.Description?.Trim(),
                DisplayOrder = request.DisplayOrder,
                IsActive = request.IsActive,
                InvestorsCapital = request.InvestorsCapital,
                IsRoiEnabled = request.IsRoiEnabled,
                RoiPercentage = roi,
                RemittanceSharePercent = share,
                SettlementCycle = cycle,
                IsReturnCapital = request.IsReturnCapital,
                ExitNoticeDate = exitNotice,
                ExitTargetDate = exitTarget,
                ExitCapitalAmount = exitCapital,
                IsAccountClosed = request.IsAccountClosed,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DeviceGroups.Add(group);
            await _context.SaveChangesAsync();

            // Link or create investor account if requested
            if (request.InvestorEnabled && !string.IsNullOrWhiteSpace(request.InvestorUsername))
            {
                var username = request.InvestorUsername.Trim();
                var account = await _context.AdminAccounts.FirstOrDefaultAsync(a => a.Username.ToLower() == username.ToLower());
                if (account == null)
                {
                    account = new AdminAccount
                    {
                        Username = username,
                        Password = !string.IsNullOrWhiteSpace(request.InvestorPassword) ? request.InvestorPassword.Trim() : "Inv@2026!",
                        Role = "Investor",
                        IsActive = true,
                        DeviceGroupId = group.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AdminAccounts.Add(account);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    account.Role = "Investor";
                    account.DeviceGroupId = group.Id;
                    if (!string.IsNullOrWhiteSpace(request.InvestorPassword))
                    {
                        account.Password = request.InvestorPassword.Trim();
                    }
                    await _context.SaveChangesAsync();
                }

                group.InvestorAdminAccountId = account.Id;
                await _context.SaveChangesAsync();
            }

            return Ok(group);
        }

        // PUT /api/devicegroup/{id} — Update a group
        [Authorize(Roles = "Admin,SuperAdmin")]
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

            var wasReturnCapital = group.IsReturnCapital;
            group.Name = name;
            group.Description = request.Description?.Trim();
            group.DisplayOrder = request.DisplayOrder;
            group.IsActive = request.IsActive;
            group.InvestorsCapital = request.InvestorsCapital;
            group.IsRoiEnabled = request.IsRoiEnabled;
            group.RemittanceSharePercent = request.RemittanceSharePercent > 0 ? request.RemittanceSharePercent : 100m;
            group.SettlementCycle = !string.IsNullOrWhiteSpace(request.SettlementCycle) ? request.SettlementCycle : "Monthly";
            group.IsReturnCapital = request.IsReturnCapital;
            group.IsAccountClosed = request.IsAccountClosed;

            // Handle transition into Return Capital
            if (request.IsReturnCapital)
            {
                if (!wasReturnCapital || !group.ExitNoticeDate.HasValue)
                {
                    group.ExitNoticeDate = DateTime.UtcNow;
                    group.ExitTargetDate = DateTime.UtcNow.AddYears(1);
                }

                // If user didn't explicitly override ROI, set to 10%
                group.RoiPercentage = request.RoiPercentage > 0 ? request.RoiPercentage : 10m;
                group.ExitCapitalAmount = group.InvestorsCapital + (group.InvestorsCapital * (group.RoiPercentage / 100m));
            }
            else
            {
                group.RoiPercentage = request.RoiPercentage > 0 ? request.RoiPercentage : 15m;
                group.ExitNoticeDate = null;
                group.ExitTargetDate = null;
                group.ExitCapitalAmount = null;
            }

            // Handle Investor Account linkage
            if (request.InvestorEnabled && !string.IsNullOrWhiteSpace(request.InvestorUsername))
            {
                var username = request.InvestorUsername.Trim();
                AdminAccount? account = null;

                if (group.InvestorAdminAccountId.HasValue)
                {
                    account = await _context.AdminAccounts.FindAsync(group.InvestorAdminAccountId.Value);
                }

                if (account == null)
                {
                    account = await _context.AdminAccounts.FirstOrDefaultAsync(a => a.Username.ToLower() == username.ToLower());
                }

                if (account == null)
                {
                    account = new AdminAccount
                    {
                        Username = username,
                        Password = !string.IsNullOrWhiteSpace(request.InvestorPassword) ? request.InvestorPassword.Trim() : "Inv@2026!",
                        Role = "Investor",
                        IsActive = true,
                        DeviceGroupId = group.Id,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AdminAccounts.Add(account);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    account.Username = username;
                    account.Role = "Investor";
                    account.DeviceGroupId = group.Id;
                    if (!string.IsNullOrWhiteSpace(request.InvestorPassword))
                    {
                        account.Password = request.InvestorPassword.Trim();
                    }
                    await _context.SaveChangesAsync();
                }

                group.InvestorAdminAccountId = account.Id;
            }

            group.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(group);
        }

        // DELETE /api/devicegroup/{id} — Delete a group
        [Authorize(Roles = "Admin,SuperAdmin")]
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

            // Optionally deactivate investor account
            if (group.InvestorAdminAccountId.HasValue)
            {
                var invAccount = await _context.AdminAccounts.FindAsync(group.InvestorAdminAccountId.Value);
                if (invAccount != null)
                {
                    invAccount.DeviceGroupId = null;
                }
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

            // Investment & Remittance
            public decimal InvestorsCapital { get; set; } = 0m;
            public bool IsRoiEnabled { get; set; } = false;
            public decimal RoiPercentage { get; set; } = 15m;
            public decimal RemittanceSharePercent { get; set; } = 100m;
            public string SettlementCycle { get; set; } = "Monthly";

            // Exit Governance
            public bool IsReturnCapital { get; set; } = false;
            public bool IsAccountClosed { get; set; } = false;

            // Investor User
            public bool InvestorEnabled { get; set; } = false;
            public string? InvestorUsername { get; set; }
            public string? InvestorPassword { get; set; }
        }
    }
}
