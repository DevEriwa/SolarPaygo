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
        /// <summary>
        /// How much of <see cref="AmountPaid"/> actually bought units, at the rate in force
        /// when it happened. Recorded rather than worked out later: units multiplied by
        /// today's rate would be wrong for any customer whose price band has changed since,
        /// and the history would quietly rewrite itself every time a band was edited.
        ///
        /// Null on transactions recorded before this was kept, which the admin table shows
        /// as a dash rather than guessing.
        /// </summary>
        public decimal? UsedAmount { get; set; }

        /// <summary>
        /// The remainder that stayed in the wallet, because units are vended in whole
        /// 0.1 kWh steps and a payment rarely divides evenly into them.
        /// </summary>
        public decimal? AddedToWallet { get; set; }

        /// <summary>The wallet balance once this transaction had been applied.</summary>
        public decimal? WalletBalanceAfter { get; set; }

        /// <summary>
        /// The price per kWh used here. Kept so the figures above can always be explained,
        /// and checked, against the rate that actually applied at the time.
        /// </summary>
        public decimal? RateAtTime { get; set; }

        public string? StsToken { get; set; }
        public string? PaymentReference { get; set; }

        public SolarSystem? SolarSystem { get; set; }
    }
}
