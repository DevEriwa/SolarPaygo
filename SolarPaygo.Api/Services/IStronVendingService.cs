using System;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    public interface IStronVendingService
    {
        Task<StronVendingResponse?> GenerateVendingTokenAsync(string meterId, decimal amount, bool isVendByUnit);
        Task<StronMeterStatusResponse?> QueryMeterStatusAsync(string meterId, DateTime date);
        Task<bool> SetRemoteSwitchAsync(string meterId, bool turnOn);
        Task<string?> GenerateClearTamperTokenAsync(string meterId);
        Task<string?> GenerateClearCreditTokenAsync(string meterId);
        Task<bool> SendTokenRemotelyAsync(string meterId, string token);
    }

    public class StronVendingResponse
    {
        public string Token { get; set; } = string.Empty;
        public decimal Units { get; set; }
        public decimal Price { get; set; }
    }

    public class StronMeterStatusResponse
    {
        public string MeterId { get; set; } = string.Empty;
        public decimal ResidualAmount { get; set; } // kWh remaining
        public decimal CumulativeConsumption { get; set; } // Cumulative kWh
        public decimal Voltage { get; set; }
        public decimal Current { get; set; }
        public decimal Power { get; set; }
        public string RelayState { get; set; } = "1"; // "1"=closed/on, "0"=open/off
        public string CoverState { get; set; } = "0"; // "1"=tampered, "0"=normal
    }
}
