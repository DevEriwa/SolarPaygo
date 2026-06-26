using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    public class SquadService : ISquadService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SquadService> _logger;

        public SquadService(HttpClient httpClient, IConfiguration configuration, ILogger<SquadService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<SquadVirtualAccountResponse?> CreateVirtualAccountAsync(
            string customerIdentifier, 
            string firstName, 
            string lastName, 
            string email, 
            string phone, 
            string bvn, 
            string dob, 
            string address, 
            string gender)
        {
            var (apiKey, baseUrl) = GetConfig();

            // Validate configuration values before making the call
            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(baseUrl))
            {
                _logger.LogError("[Squad] Configuration error: ApiKey or BaseUrl is missing. Check appsettings.json.");
                return null;
            }

            try
            {
                _logger.LogInformation($"[Squad] Requesting virtual account for customer: {customerIdentifier} using BaseUrl={baseUrl}");

                var requestPayload = new
                {
                    customer_identifier = customerIdentifier,
                    first_name = firstName,
                    last_name = lastName,
                    mobile_num = phone,
                    email = email,
                    bvn = bvn,
                    dob = dob,
                    address = address,
                    gender = gender,
                    beneficiary_account = "0123456789" // Squad requires a 10-digit settlement account number
                };

                var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/virtual-account")
                {
                    Content = JsonContent.Create(requestPayload)
                };
                
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                var response = await _httpClient.SendAsync(request);
                
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<JsonElement>();
                    if (result.TryGetProperty("success", out var successProp) && successProp.GetBoolean())
                    {
                        var data = result.GetProperty("data");
                        var accountNum = data.GetProperty("virtual_account_number").GetString();
                        _logger.LogInformation($"[Squad] Successfully generated virtual account: {accountNum}");

                        return new SquadVirtualAccountResponse
                        {
                            VirtualAccountNumber = accountNum ?? string.Empty,
                            BankName = "Guaranty Trust Bank (Squad Sandbox)"
                        };
                    }
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Squad] API returned non-success: Status={Status}, Body={Body}", response.StatusCode, errorContent);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Squad] Exception occurred while calling Squad Virtual Account API");
            }

            return null;
        }
        private (string ApiKey, string BaseUrl) GetConfig()
        {
            bool useSandbox = _configuration.GetValue<bool>("Squad:UseSandbox");
            var apiKey = useSandbox ? _configuration["Squad:Sandbox:SecretKey"] : _configuration["Squad:Live:SecretKey"];
            var baseUrl = useSandbox ? _configuration["Squad:Sandbox:BaseUrl"] : _configuration["Squad:Live:BaseUrl"];
            return (apiKey ?? string.Empty, baseUrl ?? string.Empty);
        }
    }
}
