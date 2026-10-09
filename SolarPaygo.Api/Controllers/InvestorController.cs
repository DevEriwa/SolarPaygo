using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class InvestorController : ControllerBase
    {
        private readonly SolarDbContext _context;

        public InvestorController(SolarDbContext context)
        {
            _context = context;
        }

        // GET /api/investor/portfolio — Fetch complete portfolio metrics for investor
        [Authorize(Roles = "Investor,Admin,SuperAdmin")]
        [HttpGet("portfolio")]
        public async Task<IActionResult> GetPortfolio([FromQuery] int? groupId)
        {
            int targetGroupId = 0;

            var role = User.FindFirstValue(ClaimTypes.Role);
            if (role == "Investor")
            {
                var groupClaim = User.FindFirstValue("DeviceGroupId");
                if (int.TryParse(groupClaim, out var claimId) && claimId > 0)
                {
                    targetGroupId = claimId;
                }
                else
                {
                    // Fallback to lookup AdminAccount by username
                    var username = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name;
                    if (!string.IsNullOrEmpty(username))
                    {
                        var account = await _context.AdminAccounts.FirstOrDefaultAsync(a => a.Username.ToLower() == username.ToLower());
                        if (account?.DeviceGroupId.HasValue == true)
                        {
                            targetGroupId = account.DeviceGroupId.Value;
                        }
                    }
                }
            }
            else
            {
                // Admin or SuperAdmin viewing an investor group
                targetGroupId = groupId ?? 0;
            }

            if (targetGroupId <= 0)
            {
                return BadRequest("No active investment portfolio found for this account.");
            }

            var group = await _context.DeviceGroups.FindAsync(targetGroupId);
            if (group == null)
            {
                return NotFound("Investment portfolio not found.");
            }

            // Get meters assigned to this group
            var systems = await _context.SolarSystems
                .Where(s => s.DeviceGroupId == targetGroupId)
                .OrderBy(s => s.HardwareId)
                .ToListAsync();

            var systemIds = systems.Select(s => s.Id).ToList();

            // Completed transactions on these meters
            var transactions = await _context.Transactions
                .Where(t => systemIds.Contains(t.SolarSystemId) && t.Status == "Completed")
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync();

            var now = DateTime.UtcNow;
            var todayUtc = now.Date;
            var startOfWeek = todayUtc.AddDays(-(int)todayUtc.DayOfWeek);
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var startOfYear = new DateTime(now.Year, 1, 1);

            // Remittance share ratio
            decimal shareRatio = (group.RemittanceSharePercent > 0 ? group.RemittanceSharePercent : 100m) / 100m;

            decimal grossTotal = transactions.Sum(t => t.AmountPaid);
            decimal grossToday = transactions.Where(t => t.TransactionDate >= todayUtc).Sum(t => t.AmountPaid);
            decimal grossWeek = transactions.Where(t => t.TransactionDate >= startOfWeek).Sum(t => t.AmountPaid);
            decimal grossMonth = transactions.Where(t => t.TransactionDate >= startOfMonth).Sum(t => t.AmountPaid);
            decimal grossYear = transactions.Where(t => t.TransactionDate >= startOfYear).Sum(t => t.AmountPaid);

            decimal remittedAllTime = Math.Round(grossTotal * shareRatio, 2);
            decimal remittedToday = Math.Round(grossToday * shareRatio, 2);
            decimal remittedWeek = Math.Round(grossWeek * shareRatio, 2);
            decimal remittedMonth = Math.Round(grossMonth * shareRatio, 2);
            decimal remittedYear = Math.Round(grossYear * shareRatio, 2);

            // Annual ROI target milestone
            decimal roiRate = group.RoiPercentage > 0 ? group.RoiPercentage : 15m;
            decimal annualRoiMilestone = Math.Round(group.InvestorsCapital * (roiRate / 100m), 2);
            decimal progressPercent = annualRoiMilestone > 0
                ? Math.Min(100m, Math.Round((remittedYear / annualRoiMilestone) * 100m, 2))
                : 0m;
            decimal remainingToMilestone = Math.Max(0m, annualRoiMilestone - remittedYear);

            // Exit liquidation stats
            int? daysRemainingExit = group.ExitTargetDate.HasValue
                ? Math.Max(0, (int)(group.ExitTargetDate.Value - now).TotalDays)
                : (int?)null;

            decimal exitTargetPayout = group.ExitCapitalAmount ?? (group.InvestorsCapital + (group.InvestorsCapital * (roiRate / 100m)));

            // Settlements history
            var settlements = await _context.InvestorSettlements
                .Where(s => s.DeviceGroupId == targetGroupId)
                .OrderByDescending(s => s.SettledAt)
                .ToListAsync();

            decimal totalSettled = settlements.Where(s => s.Status == "Settled").Sum(s => s.Amount);
            decimal pendingSettlement = Math.Max(0m, remittedAllTime - totalSettled);

            return Ok(new
            {
                Group = new
                {
                    group.Id,
                    group.Name,
                    group.Description,
                    group.InvestorsCapital,
                    group.IsRoiEnabled,
                    group.RoiPercentage,
                    group.RemittanceSharePercent,
                    group.SettlementCycle,
                    group.IsReturnCapital,
                    group.ExitNoticeDate,
                    group.ExitTargetDate,
                    ExitCapitalAmount = exitTargetPayout,
                    DaysRemainingInExitWindow = daysRemainingExit,
                    group.IsAccountClosed
                },
                Financials = new
                {
                    InvestorsCapital = group.InvestorsCapital,
                    RoiPercentage = roiRate,
                    AnnualRoiMilestone = annualRoiMilestone,
                    ProgressPercent = progressPercent,
                    RemainingToMilestone = remainingToMilestone,
                    RemittedAllTime = remittedAllTime,
                    RemittedYear = remittedYear,
                    RemittedMonth = remittedMonth,
                    RemittedWeek = remittedWeek,
                    RemittedToday = remittedToday,
                    TotalSettled = totalSettled,
                    PendingSettlement = pendingSettlement,
                    SettlementCycle = group.SettlementCycle
                },
                Meters = systems.Select(s => new
                {
                    s.Id,
                    s.HardwareId,
                    s.StronMeterId,
                    s.OwnerName,
                    s.Status,
                    s.AvailableUnits,
                    s.PrepaidNairaBalance,
                    s.CumulativeKwhConsumed,
                    s.Power,
                    s.Voltage,
                    s.Current,
                    s.RelayState,
                    s.LastSyncTime
                }),
                Settlements = settlements,
                RecentTransactions = transactions.Take(25).Select(t => new
                {
                    t.Id,
                    t.SolarSystemId,
                    HardwareId = systems.FirstOrDefault(s => s.Id == t.SolarSystemId)?.HardwareId ?? "Meter",
                    CustomerName = systems.FirstOrDefault(s => s.Id == t.SolarSystemId)?.OwnerName ?? "Customer",
                    GrossAmount = t.AmountPaid,
                    InvestorShareAmount = Math.Round(t.AmountPaid * shareRatio, 2),
                    t.TransactionDate,
                    t.Status
                })
            });
        }

        // POST /api/investor/settle — Admin records manual payout/settlement
        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost("settle")]
        public async Task<IActionResult> RecordSettlement([FromBody] RecordSettlementRequest request)
        {
            if (request.DeviceGroupId <= 0 || request.Amount <= 0)
                return BadRequest("Valid DeviceGroupId and Amount are required.");

            var group = await _context.DeviceGroups.FindAsync(request.DeviceGroupId);
            if (group == null) return NotFound("Device group not found.");

            var settlement = new InvestorSettlement
            {
                DeviceGroupId = request.DeviceGroupId,
                Amount = request.Amount,
                SettlementCycle = !string.IsNullOrWhiteSpace(request.SettlementCycle) ? request.SettlementCycle : group.SettlementCycle,
                Status = "Settled",
                Reference = request.Reference?.Trim(),
                Notes = request.Notes?.Trim(),
                SettledAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.InvestorSettlements.Add(settlement);
            await _context.SaveChangesAsync();

            return Ok(settlement);
        }

        public class RecordSettlementRequest
        {
            public int DeviceGroupId { get; set; }
            public decimal Amount { get; set; }
            public string? SettlementCycle { get; set; }
            public string? Reference { get; set; }
            public string? Notes { get; set; }
        }
    }
}
