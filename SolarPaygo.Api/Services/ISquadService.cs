using System.Collections.Generic;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    public interface ISquadService
    {
        Task<SquadVirtualAccountResponse?> CreateVirtualAccountAsync(
            string customerIdentifier, 
            string firstName, 
            string lastName, 
            string email, 
            string phone, 
            string bvn, 
            string dob, 
            string address, 
            string gender
        );

        Task<List<SquadMerchantTransactionItem>?> GetMerchantVirtualAccountTransactionsAsync();
    }

    public class SquadVirtualAccountResponse
    {
        public string VirtualAccountNumber { get; set; } = string.Empty;
        public string BankName { get; set; } = "Guaranty Trust Bank (Squad Sandbox)";
        public string? ErrorMessage { get; set; }
    }

    public class SquadMerchantTransactionItem
    {
        public string? transaction_reference { get; set; }
        public string? virtual_account_number { get; set; }
        public string? principal_amount { get; set; }
        public string? transaction_date { get; set; }
        public SquadTransactionCustomer? customer { get; set; }
    }

    public class SquadTransactionCustomer
    {
        public string? customer_identifier { get; set; }
    }
}