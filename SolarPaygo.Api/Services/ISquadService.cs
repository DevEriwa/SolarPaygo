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
    }

    public class SquadVirtualAccountResponse
    {
        public string VirtualAccountNumber { get; set; } = string.Empty;
        public string BankName { get; set; } = "Guaranty Trust Bank (Squad Sandbox)";
        public string? ErrorMessage { get; set; }
    }
}
