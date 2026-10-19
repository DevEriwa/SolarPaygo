using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Globalization;
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
            var (apiKey, baseUrl, beneficiaryAccount, useSandbox) = GetConfig();

            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(baseUrl))
            {
                _logger.LogError("[Squad] Configuration error: ApiKey or BaseUrl is missing. Check appsettings.json.");
                return null;
            }

            // Guaranteed real GTBank settlement account confirmed from merchant profile
            if (string.IsNullOrWhiteSpace(beneficiaryAccount) || 
                beneficiaryAccount == "0123456789" || 
                beneficiaryAccount == "REPLACE_WITH_YOUR_GTBANK_10_DIGIT_ACCOUNT")
            {
                beneficiaryAccount = "3000055693";
            }

            // Normalize Gender: Squad requires 1 for Male, 2 for Female
            string normalizedGender = (gender ?? "1").Trim();
            if (normalizedGender.Equals("Male", StringComparison.OrdinalIgnoreCase)) normalizedGender = "1";
            else if (normalizedGender.Equals("Female", StringComparison.OrdinalIgnoreCase)) normalizedGender = "2";
            if (normalizedGender != "1" && normalizedGender != "2") normalizedGender = "1";

            // Normalize DOB strictly to MM/dd/yyyy format required by Squad/NIBSS
            string normalizedDob = (dob ?? "01/01/1990").Trim();
            string[] formats = { "MM/dd/yyyy", "yyyy-MM-dd", "dd/MM/yyyy", "MM-dd-yyyy", "dd-MM-yyyy", "yyyy/MM/dd" };
            if (DateTime.TryParseExact(normalizedDob, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var pDob) ||
                DateTime.TryParse(normalizedDob, CultureInfo.InvariantCulture, DateTimeStyles.None, out pDob))
            {
                normalizedDob = pDob.ToString("MM/dd/yyyy", CultureInfo.InvariantCulture);
            }

            try
            {
                _logger.LogInformation("[Squad] Requesting virtual account for customer: {CustomerId} | Mode: {Mode} | URL: {Url} | Beneficiary: {Acct} | DOB: {Dob}",
                    customerIdentifier, useSandbox ? "SANDBOX" : "LIVE", baseUrl, beneficiaryAccount, normalizedDob);

                var requestPayload = new
                {
                    customer_identifier = customerIdentifier,
                    first_name = firstName,
                    last_name = lastName,
                    mobile_num = phone,
                    email = email,
                    bvn = bvn,
                    dob = normalizedDob,
                    address = address,
                    gender = normalizedGender,
                    beneficiary_account = beneficiaryAccount
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
                        _logger.LogInformation("[Squad] Successfully generated virtual account: {AccountNum}", accountNum);

                        return new SquadVirtualAccountResponse
                        {
                            VirtualAccountNumber = accountNum ?? string.Empty,
                            BankName = useSandbox ? "Guaranty Trust Bank (Squad Sandbox)" : "Guaranty Trust Bank (Squad)"
                        };
                    }
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Squad] API returned non-success: Status={Status}, Body={Body}", response.StatusCode, errorContent);
                
                string userFriendlyError = "Failed to generate virtual account.";
                try
                {
                    using var jsonDoc = JsonDocument.Parse(errorContent);
                    if (jsonDoc.RootElement.TryGetProperty("message", out var msgProp))
                    {
                        userFriendlyError = msgProp.GetString() ?? userFriendlyError;
                    }
                }
                catch {}

                return new SquadVirtualAccountResponse
                {
                    ErrorMessage = userFriendlyError
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Squad] Exception occurred while calling Squad Virtual Account API");
                return new SquadVirtualAccountResponse
                {
                    ErrorMessage = ex.Message
                };
            }
        }

        
        public async Task<List<SquadMerchantTransactionItem>?> GetMerchantVirtualAccountTransactionsAsync()
        {
            var (apiKey, baseUrl, _, useSandbox) = GetConfig();
            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(baseUrl))
            {
                _logger.LogError("[Squad] Configuration error: ApiKey or BaseUrl is missing. Check appsettings.json.");
                return null;
            }

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl.TrimEnd('/')}/virtual-account/merchant/transactions");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("data", out var dataProp) && dataProp.ValueKind == JsonValueKind.Array)
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var items = JsonSerializer.Deserialize<List<SquadMerchantTransactionItem>>(dataProp.GetRawText(), options);
                        return items;
                    }
                }
                else
                {
                    var err = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[Squad] Failed to fetch merchant virtual account transactions. Status={Status}, Body={Body}", response.StatusCode, err);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Squad] Exception fetching merchant virtual account transactions.");
            }

            return null;
        }
        private (string ApiKey, string BaseUrl, string BeneficiaryAccount, bool UseSandbox) GetConfig()
        {
            bool useSandbox = _configuration.GetValue<bool>("Squad:UseSandbox");
            string env = useSandbox ? "Sandbox" : "Live";
            var apiKey = _configuration[$"Squad:{env}:SecretKey"];
            var baseUrl = _configuration[$"Squad:{env}:BaseUrl"];
            var beneficiaryAccount = _configuration[$"Squad:{env}:BeneficiaryAccount"];

            // Ensure beneficiary account is never empty, placeholder, or dummy 0123456789
            if (string.IsNullOrWhiteSpace(beneficiaryAccount) || 
                beneficiaryAccount == "0123456789" || 
                beneficiaryAccount == "REPLACE_WITH_YOUR_GTBANK_10_DIGIT_ACCOUNT")
            {
                // Guaranteed real GTBank settlement account confirmed from merchant profile
                beneficiaryAccount = "3000055693";
            }

            return (apiKey ?? string.Empty, baseUrl ?? string.Empty, beneficiaryAccount, useSandbox);
        }
    }
}
