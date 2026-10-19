using System;

namespace SolarPaygo.Api.Models
{
    public class InvestorSettlement
    {
        public int Id { get; set; }
        public int DeviceGroupId { get; set; }
        public decimal Amount { get; set; }
        public string SettlementCycle { get; set; } = "Monthly";
        public string Status { get; set; } = "Settled"; // "Pending", "Settled"
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public DateTime SettledAt { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
