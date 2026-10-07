using System;

namespace SolarPaygo.Api.Models
{
    public class DeviceGroup
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        // Investment & Smart Remittance Governance
        public decimal InvestorsCapital { get; set; } = 0m;
        public bool IsRoiEnabled { get; set; } = false;
        public decimal RoiPercentage { get; set; } = 15m;
        public decimal RemittanceSharePercent { get; set; } = 100m;
        public string SettlementCycle { get; set; } = "Monthly"; // "Daily", "Weekly", "Monthly"

        // Capital Exit & 12-Month Liquidation Notice Window
        public bool IsReturnCapital { get; set; } = false;
        public DateTime? ExitNoticeDate { get; set; }
        public DateTime? ExitTargetDate { get; set; } // Notice date + 12 months
        public decimal? ExitCapitalAmount { get; set; } // Capital + Exit ROI
        public bool IsAccountClosed { get; set; } = false;

        // Investor User Linkage
        public int? InvestorAdminAccountId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
