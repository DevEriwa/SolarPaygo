using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using System;
using System.Collections.Generic;
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

            // Uncapped amounts directly derived from meter collections
            decimal uncappedShareTotal = Math.Round(grossTotal * shareRatio, 2);
            decimal uncappedShareYear = Math.Round(grossYear * shareRatio, 2);
            decimal uncappedShareMonth = Math.Round(grossMonth * shareRatio, 2);
            decimal uncappedShareWeek = Math.Round(grossWeek * shareRatio, 2);
            decimal uncappedShareToday = Math.Round(grossToday * shareRatio, 2);

            // Annual ROI target milestone (e.g. 15% of InvestorsCapital)
            decimal roiRate = group.RoiPercentage > 0 ? group.RoiPercentage : 15m;
            decimal annualRoiMilestone = Math.Round(group.InvestorsCapital * (roiRate / 100m), 2);

            // CAPPED REMITTANCE: Investor earnings stop once the annual 15% ROI milestone is reached
            decimal remittedYear = annualRoiMilestone > 0
                ? Math.Min(annualRoiMilestone, uncappedShareYear)
                : uncappedShareYear;

            bool isCapReached = annualRoiMilestone > 0 && uncappedShareYear >= annualRoiMilestone;
            decimal companySurplusYear = Math.Max(0m, uncappedShareYear - remittedYear);
            decimal companySurplusTotal = Math.Max(0m, uncappedShareTotal - remittedYear);

            decimal progressPercent = annualRoiMilestone > 0
                ? Math.Min(100m, Math.Round((remittedYear / annualRoiMilestone) * 100m, 2))
                : 100m;
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

            // Remitted all-time is capped at eligible yield to date, preventing overpayment
            decimal remittedAllTime = remittedYear;
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
                    IsCapReached = isCapReached,

                    // Capped Annual Investor Yield
                    RemittedYear = remittedYear,
                    UncappedShareYear = uncappedShareYear,
                    CompanySurplusYear = companySurplusYear,
                    CompanySurplusTotal = companySurplusTotal,

                    // All-Time & Payouts
                    RemittedAllTime = remittedAllTime,
                    TotalSettled = totalSettled,
                    PendingSettlement = pendingSettlement,

                    // Gross collections
                    GrossTotal = grossTotal,
                    GrossYear = grossYear,
                    GrossMonth = grossMonth,
                    GrossWeek = grossWeek,
                    GrossToday = grossToday,

                    // Period breakdown
                    RemittedMonth = uncappedShareMonth,
                    RemittedWeek = uncappedShareWeek,
                    RemittedToday = uncappedShareToday,

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

        // GET /api/investor/admin-summary — Complete portfolio and payout status for Admin
        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpGet("admin-summary")]
        public async Task<IActionResult> GetAdminSummary()
        {
            var groups = await _context.DeviceGroups
                .Where(g => g.IsActive)
                .OrderBy(g => g.DisplayOrder)
                .ThenBy(g => g.Name)
                .ToListAsync();

            var accounts = await _context.AdminAccounts
                .ToDictionaryAsync(a => a.Id, a => a.Username);

            var systems = await _context.SolarSystems
                .Where(s => s.DeviceGroupId.HasValue)
                .ToListAsync();

            var systemIds = systems.Select(s => s.Id).ToList();

            var allTransactions = await _context.Transactions
                .Where(t => systemIds.Contains(t.SolarSystemId) && t.Status == "Completed")
                .ToListAsync();

            var allSettlements = await _context.InvestorSettlements
                .Where(s => s.Status == "Settled")
                .ToListAsync();

            var now = DateTime.UtcNow;
            var startOfYear = new DateTime(now.Year, 1, 1);
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var startOfWeek = now.Date.AddDays(-(int)now.Date.DayOfWeek);
            var todayUtc = now.Date;

            var summaryList = new List<object>();

            foreach (var g in groups)
            {
                var gSystems = systems.Where(s => s.DeviceGroupId == g.Id).ToList();
                var gSystemIds = gSystems.Select(s => s.Id).ToList();
                var gTx = allTransactions.Where(t => gSystemIds.Contains(t.SolarSystemId)).ToList();
                var gSettlements = allSettlements.Where(s => s.DeviceGroupId == g.Id).ToList();

                decimal shareRatio = (g.RemittanceSharePercent > 0 ? g.RemittanceSharePercent : 100m) / 100m;
                decimal roiRate = g.RoiPercentage > 0 ? g.RoiPercentage : 15m;
                decimal annualRoiMilestone = Math.Round(g.InvestorsCapital * (roiRate / 100m), 2);

                decimal grossTotal = gTx.Sum(t => t.AmountPaid);
                decimal grossYear = gTx.Where(t => t.TransactionDate >= startOfYear).Sum(t => t.AmountPaid);
                decimal grossMonth = gTx.Where(t => t.TransactionDate >= startOfMonth).Sum(t => t.AmountPaid);
                decimal grossWeek = gTx.Where(t => t.TransactionDate >= startOfWeek).Sum(t => t.AmountPaid);
                decimal grossToday = gTx.Where(t => t.TransactionDate >= todayUtc).Sum(t => t.AmountPaid);

                decimal uncappedYear = Math.Round(grossYear * shareRatio, 2);
                decimal uncappedTotal = Math.Round(grossTotal * shareRatio, 2);
                decimal remittedYear = annualRoiMilestone > 0 ? Math.Min(annualRoiMilestone, uncappedYear) : uncappedYear;
                bool isCapReached = annualRoiMilestone > 0 && uncappedYear >= annualRoiMilestone;
                decimal companySurplusYear = Math.Max(0m, uncappedYear - remittedYear);

                decimal totalSettled = gSettlements.Sum(s => s.Amount);
                decimal remittedAllTime = remittedYear;
                decimal pendingSettlement = Math.Max(0m, remittedAllTime - totalSettled);

                string? investorUsername = g.InvestorAdminAccountId.HasValue && accounts.ContainsKey(g.InvestorAdminAccountId.Value)
                    ? accounts[g.InvestorAdminAccountId.Value]
                    : null;

                summaryList.Add(new
                {
                    g.Id,
                    g.Name,
                    g.Description,
                    g.InvestorsCapital,
                    RoiPercentage = roiRate,
                    AnnualRoiMilestone = annualRoiMilestone,
                    RemittanceSharePercent = g.RemittanceSharePercent,
                    g.SettlementCycle,
                    g.IsRoiEnabled,
                    g.IsReturnCapital,
                    InvestorUsername = investorUsername,
                    MeterCount = gSystems.Count,

                    // Financials
                    GrossYear = grossYear,
                    GrossMonth = grossMonth,
                    GrossWeek = grossWeek,
                    GrossToday = grossToday,
                    GrossTotal = grossTotal,

                    RemittedYear = remittedYear,
                    UncappedShareYear = uncappedYear,
                    CompanySurplusYear = companySurplusYear,
                    IsCapReached = isCapReached,

                    RemittedAllTime = remittedAllTime,
                    TotalSettled = totalSettled,
                    PendingSettlement = pendingSettlement
                });
            }

            return Ok(summaryList);
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
