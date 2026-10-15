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

        // Helper to determine cycle start date for any timestamp given an anchor date
        private static DateTime GetCycleStart(DateTime txDate, DateTime? anchorDate)
        {
            if (!anchorDate.HasValue)
                return new DateTime(txDate.Year, 1, 1);

            var anchor = anchorDate.Value.Date;
            int diff = txDate.Year - anchor.Year;
            var start = anchor.AddYears(diff);
            if (start > txDate.Date) start = anchor.AddYears(diff - 1);
            return start;
        }

        // Helper to determine target annual milestone for a given cycle
        private static (decimal milestone, decimal roiRate, bool isCapReturn) GetCycleTarget(DateTime cycleStart, DeviceGroup group, DateTime now)
        {
            if (!group.IsRoiEnabled || group.InvestorsCapital <= 0)
                return (0m, group.RoiPercentage, false);

            if (group.IsReturnCapital)
            {
                var noticeDate = group.ExitNoticeDate?.Date ?? now.Date;
                if (cycleStart >= noticeDate)
                {
                    // In new / recurring return-capital cycle: 10% ROI + capital
                    decimal roi = 10m;
                    decimal yieldAmount = Math.Round(group.InvestorsCapital * (roi / 100m), 2);
                    return (yieldAmount + group.InvestorsCapital, roi, true);
                }
                else
                {
                    // Running cycle before the new recycle date: old yield (15%) continues till cycle end
                    decimal roi = 15m;
                    decimal yieldAmount = Math.Round(group.InvestorsCapital * (roi / 100m), 2);
                    return (yieldAmount, roi, false);
                }
            }

            decimal standardRoi = group.RoiPercentage > 0 ? group.RoiPercentage : 15m;
            decimal standardYield = Math.Round(group.InvestorsCapital * (standardRoi / 100m), 2);
            return (standardYield, standardRoi, false);
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
                .ToListAsync();

            var now = DateTime.UtcNow;
            var todayUtc = now.Date;
            var startOfWeek = todayUtc.AddDays(-(int)todayUtc.DayOfWeek);
            var startOfMonth = new DateTime(now.Year, now.Month, 1);

            // Determine current cycle window based on InvestmentStartDate
            DateTime cycleStart = GetCycleStart(now, group.InvestmentStartDate);
            DateTime cycleEnd = cycleStart.AddYears(1);
            DateTime reoccurringDate = cycleEnd;

            // Compute current cycle target milestone and capital return flags
            var (annualRoiMilestone, roiRate, isCapitalReturnCycle) = GetCycleTarget(cycleStart, group, now);

            bool isCapitalReturnQueued = group.IsReturnCapital && !isCapitalReturnCycle;
            DateTime? newCycleStartDate = group.IsReturnCapital ? (isCapitalReturnCycle ? cycleStart : cycleEnd) : null;
            DateTime? finalSettlementDate = group.IsReturnCapital ? (isCapitalReturnCycle ? cycleEnd : cycleEnd.AddYears(1)) : null;

            decimal baseYield = Math.Round(group.InvestorsCapital * (roiRate / 100m), 2);
            decimal capitalToReturn = isCapitalReturnCycle ? group.InvestorsCapital : 0m;

            // Remittance share ratio
            decimal shareRatio = (group.RemittanceSharePercent > 0 ? group.RemittanceSharePercent : 100m) / 100m;

            // Sort transactions chronologically (oldest to newest) to accurately track milestone fulfillment
            var chronologicalTx = transactions.OrderBy(t => t.TransactionDate).ToList();

            decimal grossTotal = 0m;
            decimal grossToday = 0m;
            decimal grossWeek = 0m;
            decimal grossMonth = 0m;
            decimal grossYear = 0m;

            decimal uncappedShareYear = 0m;
            decimal uncappedShareTotal = 0m;

            decimal runningYearInvestorShare = 0m;
            decimal remittedYear = 0m;
            decimal remittedMonth = 0m;
            decimal remittedWeek = 0m;
            decimal remittedToday = 0m;

            // Cycle-by-cycle tracking to ensure historical transactions strictly correlate with each year's target milestone
            var cycleShares = new Dictionary<DateTime, decimal>();

            var processedTransactions = new List<object>();

            foreach (var t in chronologicalTx)
            {
                grossTotal += t.AmountPaid;

                bool isCurrentCycle = t.TransactionDate >= cycleStart && t.TransactionDate < cycleEnd;
                bool isCurrentMonth = isCurrentCycle && t.TransactionDate >= startOfMonth;
                bool isCurrentWeek = isCurrentCycle && t.TransactionDate >= startOfWeek;
                bool isToday = isCurrentCycle && t.TransactionDate >= todayUtc;

                if (isCurrentCycle) grossYear += t.AmountPaid;
                if (isCurrentMonth) grossMonth += t.AmountPaid;
                if (isCurrentWeek) grossWeek += t.AmountPaid;
                if (isToday) grossToday += t.AmountPaid;

                decimal uncappedTxShare = Math.Round(t.AmountPaid * shareRatio, 2);
                if (isCurrentCycle) uncappedShareYear += uncappedTxShare;
                uncappedShareTotal += uncappedTxShare;

                // Determine transaction's specific cycle start & milestone cap
                var txCycleStart = GetCycleStart(t.TransactionDate, group.InvestmentStartDate);
                if (!cycleShares.ContainsKey(txCycleStart))
                    cycleShares[txCycleStart] = 0m;

                var (txCycleCap, _, _) = GetCycleTarget(txCycleStart, group, now);

                decimal remainingCap = txCycleCap > 0
                    ? Math.Max(0m, txCycleCap - cycleShares[txCycleStart])
                    : uncappedTxShare;

                decimal eligibleTxShare = txCycleCap > 0
                    ? Math.Min(uncappedTxShare, remainingCap)
                    : uncappedTxShare;

                cycleShares[txCycleStart] += eligibleTxShare;

                string statusText = "Credited";
                if (txCycleCap > 0)
                {
                    if (eligibleTxShare <= 0m && uncappedTxShare > 0m)
                        statusText = "Cap Reached";
                    else if (eligibleTxShare < uncappedTxShare)
                        statusText = "Cap Partially Reached";
                }

                if (isCurrentCycle)
                {
                    runningYearInvestorShare += eligibleTxShare;
                    remittedYear += eligibleTxShare;

                    if (isCurrentMonth) remittedMonth += eligibleTxShare;
                    if (isCurrentWeek) remittedWeek += eligibleTxShare;
                    if (isToday) remittedToday += eligibleTxShare;
                }

                var meter = systems.FirstOrDefault(s => s.Id == t.SolarSystemId);

                if (eligibleTxShare > 0)
                {
                    processedTransactions.Add(new
                    {
                        t.Id,
                        t.SolarSystemId,
                        HardwareId = meter?.HardwareId ?? "Meter",
                        RemittanceCredited = eligibleTxShare,
                        InvestorShareAmount = eligibleTxShare,
                        t.TransactionDate,
                        Status = statusText
                    });
                }
            }

            bool isCapReached = annualRoiMilestone > 0 && remittedYear >= annualRoiMilestone;
            decimal companySurplusYear = Math.Max(0m, uncappedShareYear - remittedYear);
            decimal companySurplusTotal = Math.Max(0m, uncappedShareTotal - remittedYear);

            decimal progressPercent = annualRoiMilestone > 0
                ? Math.Min(100m, Math.Round((remittedYear / annualRoiMilestone) * 100m, 2))
                : 100m;
            decimal remainingToMilestone = Math.Max(0m, annualRoiMilestone - remittedYear);

            // Exit liquidation stats
            int? daysRemainingExit = finalSettlementDate.HasValue
                ? Math.Max(0, (int)(finalSettlementDate.Value - now).TotalDays)
                : (int?)null;

            decimal exitTargetPayout = group.ExitCapitalAmount ?? (group.InvestorsCapital + Math.Round(group.InvestorsCapital * 0.10m, 2));

            // Settlements history
            var settlements = await _context.InvestorSettlements
                .Where(s => s.DeviceGroupId == targetGroupId)
                .OrderByDescending(s => s.SettledAt)
                .ToListAsync();

            decimal totalSettled = settlements.Where(s => s.Status == "Settled").Sum(s => s.Amount);

            // All-time remitted is sum of all eligible cycle yields
            decimal remittedAllTime = cycleShares.Values.Sum();
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
                    RoiPercentage = roiRate,
                    group.RemittanceSharePercent,
                    group.SettlementCycle,
                    group.InvestmentStartDate,
                    group.IsReturnCapital,
                    group.ExitNoticeDate,
                    ExitTargetDate = finalSettlementDate,
                    ExitCapitalAmount = exitTargetPayout,
                    DaysRemainingInExitWindow = daysRemainingExit,
                    group.IsAccountClosed,
                    CycleStartDate = cycleStart,
                    CycleEndDate = cycleEnd,
                    ReoccurringDate = reoccurringDate,
                    NewCycleStartDate = newCycleStartDate,
                    FinalSettlementDate = finalSettlementDate,
                    IsCapitalReturnCycle = isCapitalReturnCycle,
                    IsCapitalReturnQueued = isCapitalReturnQueued
                },
                Financials = new
                {
                    InvestorsCapital = group.InvestorsCapital,
                    RoiPercentage = roiRate,
                    AnnualRoiMilestone = annualRoiMilestone,
                    BaseYield = baseYield,
                    CapitalToReturn = isCapitalReturnCycle ? capitalToReturn : (isCapitalReturnQueued ? group.InvestorsCapital : 0m),
                    ProgressPercent = progressPercent,
                    RemainingToMilestone = remainingToMilestone,
                    IsCapReached = isCapReached,

                    // Cycle & Recurrence dates
                    InvestmentStartDate = group.InvestmentStartDate,
                    CycleStartDate = cycleStart,
                    CycleEndDate = cycleEnd,
                    ReoccurringDate = reoccurringDate,
                    NewCycleStartDate = newCycleStartDate,
                    FinalSettlementDate = finalSettlementDate,
                    IsCapitalReturnCycle = isCapitalReturnCycle,
                    IsCapitalReturnQueued = isCapitalReturnQueued,

                    // Capped Annual Investor Yield for current cycle
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
                    RemittedMonth = remittedMonth,
                    RemittedWeek = remittedWeek,
                    RemittedToday = remittedToday,

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
                RecentTransactions = processedTransactions.OrderByDescending(p => ((dynamic)p).TransactionDate).Take(30)
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
            var todayUtc = now.Date;
            var startOfWeek = todayUtc.AddDays(-(int)todayUtc.DayOfWeek);
            var startOfMonth = new DateTime(now.Year, now.Month, 1);

            var summaryList = new List<object>();

            foreach (var g in groups)
            {
                var gSystems = systems.Where(s => s.DeviceGroupId == g.Id).ToList();
                var gSystemIds = gSystems.Select(s => s.Id).ToList();
                var gTx = allTransactions.Where(t => gSystemIds.Contains(t.SolarSystemId)).OrderBy(t => t.TransactionDate).ToList();
                var gSettlements = allSettlements.Where(s => s.DeviceGroupId == g.Id).ToList();

                DateTime cycleStart = GetCycleStart(now, g.InvestmentStartDate);
                DateTime cycleEnd = cycleStart.AddYears(1);
                DateTime reoccurringDate = cycleEnd;

                var (annualRoiMilestone, roiRate, isCapitalReturnCycle) = GetCycleTarget(cycleStart, g, now);
                bool isCapitalReturnQueued = g.IsReturnCapital && !isCapitalReturnCycle;
                DateTime? newCycleStartDate = g.IsReturnCapital ? (isCapitalReturnCycle ? cycleStart : cycleEnd) : null;
                DateTime? finalSettlementDate = g.IsReturnCapital ? (isCapitalReturnCycle ? cycleEnd : cycleEnd.AddYears(1)) : null;

                decimal shareRatio = (g.RemittanceSharePercent > 0 ? g.RemittanceSharePercent : 100m) / 100m;

                decimal grossTotal = 0m;
                decimal grossYear = 0m;
                decimal grossMonth = 0m;
                decimal grossWeek = 0m;
                decimal grossToday = 0m;

                decimal uncappedYear = 0m;
                decimal remittedYear = 0m;
                decimal remittedMonth = 0m;
                decimal remittedWeek = 0m;
                decimal remittedToday = 0m;

                var cycleShares = new Dictionary<DateTime, decimal>();

                foreach (var t in gTx)
                {
                    grossTotal += t.AmountPaid;

                    bool isCurrentCycle = t.TransactionDate >= cycleStart && t.TransactionDate < cycleEnd;
                    bool isCurrentMonth = isCurrentCycle && t.TransactionDate >= startOfMonth;
                    bool isCurrentWeek = isCurrentCycle && t.TransactionDate >= startOfWeek;
                    bool isToday = isCurrentCycle && t.TransactionDate >= todayUtc;

                    if (isCurrentCycle) grossYear += t.AmountPaid;
                    if (isCurrentMonth) grossMonth += t.AmountPaid;
                    if (isCurrentWeek) grossWeek += t.AmountPaid;
                    if (isToday) grossToday += t.AmountPaid;

                    decimal uncappedTxShare = Math.Round(t.AmountPaid * shareRatio, 2);
                    if (isCurrentCycle) uncappedYear += uncappedTxShare;

                    var txCycleStart = GetCycleStart(t.TransactionDate, g.InvestmentStartDate);
                    if (!cycleShares.ContainsKey(txCycleStart))
                        cycleShares[txCycleStart] = 0m;

                    var (txCycleCap, _, _) = GetCycleTarget(txCycleStart, g, now);

                    decimal remainingCap = txCycleCap > 0
                        ? Math.Max(0m, txCycleCap - cycleShares[txCycleStart])
                        : uncappedTxShare;

                    decimal eligibleTxShare = txCycleCap > 0
                        ? Math.Min(uncappedTxShare, remainingCap)
                        : uncappedTxShare;

                    cycleShares[txCycleStart] += eligibleTxShare;

                    if (isCurrentCycle)
                    {
                        remittedYear += eligibleTxShare;
                        if (isCurrentMonth) remittedMonth += eligibleTxShare;
                        if (isCurrentWeek) remittedWeek += eligibleTxShare;
                        if (isToday) remittedToday += eligibleTxShare;
                    }
                }

                bool isCapReached = annualRoiMilestone > 0 && remittedYear >= annualRoiMilestone;
                decimal companySurplusYear = Math.Max(0m, uncappedYear - remittedYear);

                decimal totalSettled = gSettlements.Sum(s => s.Amount);
                decimal remittedAllTime = cycleShares.Values.Sum();
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
                    g.InvestmentStartDate,
                    g.IsRoiEnabled,
                    g.IsReturnCapital,
                    InvestorUsername = investorUsername,
                    MeterCount = gSystems.Count,

                    // Cycle & Liquidation dates
                    CycleStartDate = cycleStart,
                    CycleEndDate = cycleEnd,
                    ReoccurringDate = reoccurringDate,
                    NewCycleStartDate = newCycleStartDate,
                    FinalSettlementDate = finalSettlementDate,
                    IsCapitalReturnCycle = isCapitalReturnCycle,
                    IsCapitalReturnQueued = isCapitalReturnQueued,

                    // Financials
                    GrossYear = grossYear,
                    GrossMonth = grossMonth,
                    GrossWeek = grossWeek,
                    GrossToday = grossToday,
                    GrossTotal = grossTotal,

                    RemittedYear = remittedYear,
                    RemittedMonth = remittedMonth,
                    RemittedWeek = remittedWeek,
                    RemittedToday = remittedToday,
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
