using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    /// <summary>
    /// Background service that manages:
    /// 1. Daily midnight billing counter resets.
    /// 2. Idiasco Loan Contract evaluations:
    ///    - Post-Agreement 1% daily penalty accrual on unpaid balance after 1-day grace.
    ///    - Asset Repossession Flagging when (Unpaid + Penalties >= TotalProductCost).
    ///    - Monthly quota monitoring and auto-relay cutoff if AutoRelayCutOnUnmetQuota is enabled.
    /// 
    /// Non-loan customers (LoanedCapital == null or IsLoanFinanced == false) are completely ignored.
    /// </summary>
    public class LoanContractService
    {
        public class LoanSummary
        {
            public decimal TotalProductCost { get; set; }
            public decimal LoanedCapital { get; set; }
            public decimal MonthlyInterestPercent { get; set; }
            public int AgreementMonths { get; set; }
            public decimal TotalInterestAmount { get; set; }
            public decimal TotalRepaymentRequired { get; set; }
            public decimal MonthlyQuotaNaira { get; set; }
            public decimal TotalAmountPaid { get; set; }
            public decimal RemainingBalance { get; set; }
            public decimal AccumulatedPenalties { get; set; }
            public decimal TotalAmountOwed { get; set; } // RemainingBalance + AccumulatedPenalties
            public bool IsOverdue { get; set; }
            public bool IsRepossessionFlagged { get; set; }
            public decimal CurrentMonthPaid { get; set; }
            public decimal CurrentMonthDeficit { get; set; }
            public bool MetCurrentMonthQuota { get; set; }
        }

        /// <summary>
        /// Pure calculation helper for loan numbers. Zero database side-effects.
        /// </summary>
        public static LoanSummary CalculateLoanSummary(SolarSystem system, decimal totalAmountPaid, decimal currentMonthPaid = 0)
        {
            var summary = new LoanSummary();
            if (system == null) return summary;

            summary.TotalProductCost = system.TotalProductCost ?? 0m;
            summary.LoanedCapital = system.LoanedCapital ?? 0m;
            summary.MonthlyInterestPercent = system.MonthlyLoanInterestPercent > 0 ? system.MonthlyLoanInterestPercent : 10.0m;
            summary.AgreementMonths = system.AgreementMonths > 0 ? system.AgreementMonths : 6;

            // Simple 10% monthly interest on loaned capital across agreement duration:
            // e.g. 1M loan, 10% interest for 6 months = 1M + (1M * 0.10 * 6) = 1.6M
            summary.TotalInterestAmount = summary.LoanedCapital * (summary.MonthlyInterestPercent / 100m) * summary.AgreementMonths;
            summary.TotalRepaymentRequired = summary.LoanedCapital + summary.TotalInterestAmount;
            summary.MonthlyQuotaNaira = summary.AgreementMonths > 0 ? (summary.TotalRepaymentRequired / summary.AgreementMonths) : summary.TotalRepaymentRequired;

            summary.TotalAmountPaid = totalAmountPaid;
            summary.RemainingBalance = Math.Max(0m, summary.TotalRepaymentRequired - summary.TotalAmountPaid);
            summary.AccumulatedPenalties = system.AccumulatedDailyPenalty;
            summary.TotalAmountOwed = summary.RemainingBalance + summary.AccumulatedPenalties;

            // Check if duration expired (AgreementStartDate + AgreementMonths) + 1 day grace
            var startDate = system.AgreementStartDate ?? DateTime.UtcNow;
            var agreementEndDate = startDate.AddMonths(summary.AgreementMonths);
            var graceEndDate = agreementEndDate.AddDays(1);

            summary.IsOverdue = DateTime.UtcNow > graceEndDate && summary.RemainingBalance > 0;
            summary.IsRepossessionFlagged = system.IsRepossessionFlagged || (summary.TotalProductCost > 0 && summary.TotalAmountOwed >= summary.TotalProductCost);

            summary.CurrentMonthPaid = currentMonthPaid;
            summary.CurrentMonthDeficit = Math.Max(0m, summary.MonthlyQuotaNaira - summary.CurrentMonthPaid);
            summary.MetCurrentMonthQuota = summary.CurrentMonthDeficit <= 0m;

            return summary;
        }

        /// <summary>
        /// Evaluates daily 1% penalty on overdue loan balances and checks repossession thresholds.
        /// Runs safely at midnight.
        /// </summary>
        public static async Task EvaluateDailyPenaltiesAsync(SolarDbContext db, ILogger logger, CancellationToken ct)
        {
            var loanSystems = await db.SolarSystems
                .Where(s => s.DeletedAt == null && s.IsLoanFinanced && s.LoanedCapital != null && s.LoanedCapital > 0)
                .ToListAsync(ct);

            if (loanSystems.Count == 0) return;

            var today = DateTime.UtcNow.Date;

            foreach (var sys in loanSystems)
            {
                // Only process once per calendar day
                if (sys.LastPenaltyAccrualDate.HasValue && sys.LastPenaltyAccrualDate.Value.Date >= today)
                {
                    continue;
                }

                int months = sys.AgreementMonths > 0 ? sys.AgreementMonths : 6;
                var startDate = sys.AgreementStartDate ?? DateTime.UtcNow;
                var agreementEndDate = startDate.AddMonths(months);
                var graceEndDate = agreementEndDate.AddDays(1);

                // Check if agreement duration + 1 day grace has expired
                if (DateTime.UtcNow <= graceEndDate)
                {
                    continue;
                }

                // Sum all completed payments made for this system
                decimal totalPaid = await db.Transactions
                    .Where(t => t.SolarSystemId == sys.Id && t.Status == "Completed")
                    .SumAsync(t => t.AmountPaid, ct);

                decimal interestRate = sys.MonthlyLoanInterestPercent > 0 ? sys.MonthlyLoanInterestPercent : 10.0m;
                decimal totalRequired = (sys.LoanedCapital ?? 0m) * (1m + (interestRate / 100m * months));
                decimal remainingBalance = Math.Max(0m, totalRequired - totalPaid);

                if (remainingBalance > 0)
                {
                    // 1% daily penalty on whatever is left to be paid
                    decimal dailyPenalty = Math.Round(remainingBalance * 0.01m, 2);
                    sys.AccumulatedDailyPenalty += dailyPenalty;
                    sys.LastPenaltyAccrualDate = today;

                    logger.LogInformation("[LoanContract] System {HardwareId}: Accrued 1% daily penalty ₦{Penalty} on remaining balance ₦{Balance}. Total penalties: ₦{TotalPenalties}",
                        sys.HardwareId, dailyPenalty, remainingBalance, sys.AccumulatedDailyPenalty);

                    decimal totalOwed = remainingBalance + sys.AccumulatedDailyPenalty;
                    decimal productCost = sys.TotalProductCost ?? 0m;

                    // If total owed reaches or exceeds TotalProductCost -> trigger Repossession Flag!
                    if (productCost > 0m && totalOwed >= productCost)
                    {
                        sys.IsRepossessionFlagged = true;
                        logger.LogWarning("[LoanContract] ⚠️ REPOSSESSION ALERT for {HardwareId} ({Owner}): Total owed ₦{Owed} has reached or exceeded product value ₦{Cost}!",
                            sys.HardwareId, sys.OwnerName, totalOwed, productCost);
                    }
                }
                else
                {
                    // Loan fully paid off
                    sys.LastPenaltyAccrualDate = today;
                }
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
