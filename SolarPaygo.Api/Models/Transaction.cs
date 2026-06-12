using System;

namespace SolarPaygo.Api.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public int SolarSystemId { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal UnitsAdded { get; set; }
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Completed";

        // STS Vending & Squad Payment Integration
        public string? StsToken { get; set; }
        public string? PaymentReference { get; set; }

        public SolarSystem? SolarSystem { get; set; }
    }
}
