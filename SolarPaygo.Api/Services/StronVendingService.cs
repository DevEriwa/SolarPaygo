using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace SolarPaygo.Api.Services
{
    public class StronVendingService : IStronVendingService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StronVendingService> _logger;

        public StronVendingService(HttpClient httpClient, IConfiguration configuration, ILogger<StronVendingService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        private (string Company, string User, string Pass, string BaseUrl) GetConfig()
        {
            var company = _configuration["Stron:CompanyName"] ?? "IdiascoIntegrated";
            var user = _configuration["Stron:UserName"] ?? "SimonLgbinedion";
            var pass = _configuration["Stron:PassWord"] ?? "123456";
            var baseUrl = _configuration["Stron:BaseUrl"] ?? "https://server-newa.stronpower.com";
            return (company, user, pass, baseUrl);
        }

        public async Task<StronVendingResponse?> GenerateVendingTokenAsync(string meterId, decimal amount, bool isVendByUnit)
        {
            var config = GetConfig();
            try
            {
                _logger.LogInformation("[Stron] Generating token for Meter ID: {MeterId}, amount/unit: {Amount}", meterId, amount);

                var payload = new
                {
                    CompanyName = config.Company,
                    UserName = config.User,
                    PassWord = config.Pass,
                    MeterID = meterId,
                    is_vend_by_unit = isVendByUnit ? "true" : "false",
                    Amount = amount.ToString("F2")
                };

                var response = await _httpClient.PostAsJsonAsync($"{config.BaseUrl.TrimEnd('/')}/api/VendingMeterRemotely", payload);

                if (response.IsSuccessStatusCode)
                {
                    var raw = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("[Stron] Raw response: {Raw}", raw);
                    
                    using var doc = JsonDocument.Parse(raw);
                    JsonElement root = doc.RootElement;
                    JsonElement targetElement = root;

                    if (root.ValueKind == JsonValueKind.Array)
                    {
                        if (root.GetArrayLength() > 0)
                        {
                            targetElement = root[0];
                        }
                        else
                        {
                            _logger.LogWarning("[Stron] Empty array returned.");
                            return null;
                        }
                    }

                    string token = "";
                    if (targetElement.TryGetProperty("Token", out var tokenProp))
                        token = tokenProp.GetString() ?? "";
                    else if (targetElement.TryGetProperty("token", out var tokenProp2))
                        token = tokenProp2.GetString() ?? "";

                    string unit = "";
                    if (targetElement.TryGetProperty("Total_unit", out var unitProp))
                        unit = unitProp.GetString() ?? "";
                    else if (targetElement.TryGetProperty("total_unit", out var unitProp2))
                        unit = unitProp2.GetString() ?? "";
                    else if (targetElement.TryGetProperty("Unit", out var unitProp3))
                        unit = unitProp3.GetString() ?? "";

                    string price = "";
                    if (targetElement.TryGetProperty("Price", out var priceProp))
                        price = priceProp.GetString() ?? "";
                    else if (targetElement.TryGetProperty("price", out var priceProp2))
                        price = priceProp2.GetString() ?? "";

                    if (!string.IsNullOrEmpty(token))
                    {
                        _logger.LogInformation("[Stron] Successfully parsed token: {Token} ({Unit} units)", token, unit);
                        decimal.TryParse(unit, out var unitDecimal);
                        decimal.TryParse(price, out var priceDecimal);

                        return new StronVendingResponse
                        {
                            Token = FormatToken(token),
                            Units = unitDecimal,
                            Price = priceDecimal
                        };
                    }
                    _logger.LogWarning("[Stron] Vending returned success status but token was missing or empty.");
                }
                else
                {
                    var err = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[Stron] Vending failed: Status={Status}, Error={Error}", response.StatusCode, err);
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "[Stron] Network error contacting Stron API for meter {MeterId}. The meter server may be offline.", meterId);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "[Stron] Request to Stron API timed out for meter {MeterId}.", meterId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Stron] Unexpected error during vending for meter {MeterId}.", meterId);
            }

            // Return null — no mock fallback. Caller must handle null as a hard failure and reject the transaction.
            return null;
        }

        public async Task<StronMeterStatusResponse?> QueryMeterStatusAsync(string meterId, DateTime date)
        {
            var config = GetConfig();
            try
            {
                var payload = new
                {
                    CompanyName = config.Company,
                    UserName = config.User,
                    PassWord = config.Pass,
                    MeterId = meterId,
                    Date = date.ToString("yyyy-MM-dd")
                };

                var response = await _httpClient.PostAsJsonAsync($"{config.BaseUrl.TrimEnd('/')}/api/QueryDailySinglePhaseMeter", payload);
                var rawResult = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var results = JsonSerializer.Deserialize<List<SinglePhaseDaliyInformationViewModel>>(rawResult, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (results != null && results.Count > 0)
                        {
                            var res = results[0];
                            decimal.TryParse(res.Residual_Amount, out var residual);
                            decimal.TryParse(res.Cumulative_Total_Consumption, out var cumulative);
                            decimal.TryParse(res.Voltage, out var voltage);
                            decimal.TryParse(res.Current, out var current);
                            decimal.TryParse(res.Power, out var power);

                            return new StronMeterStatusResponse
                            {
                                MeterId = res.MeterID,
                                ResidualAmount = residual,
                                CumulativeConsumption = cumulative,
                                Voltage = voltage,
                                Current = current,
                                Power = power,
                                RelayState = res.RelayState,
                                CoverState = res.CoverState
                            };
                        }
                    }
                    catch (Exception jsonEx)
                    {
                        _logger.LogWarning("[Stron] Failed to parse meter status JSON. Raw: {Raw}. Error: {Error}", rawResult, jsonEx.Message);
                    }
                }
                else
                {
                    _logger.LogWarning("[Stron] Meter status query failed: Status={Status}, Raw: {Raw}", response.StatusCode, rawResult);
                }
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning("[Stron] Network error querying meter {MeterId}: {Message}", meterId, ex.Message);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogWarning("[Stron] Meter status query timed out for {MeterId}: {Message}", meterId, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("[Stron] Unexpected error querying meter {MeterId}: {Message}", meterId, ex.Message);
            }

            // Return null — billing sync will skip this system gracefully if the meter is unreachable.
            return null;
        }

        public async Task<bool> SetRemoteSwitchAsync(string meterId, bool turnOn)
        {
            var config = GetConfig();
            try
            {
                _logger.LogInformation("[Stron] Remote switch command for meter {MeterId}: {Command}", meterId, turnOn ? "ON" : "OFF");

                var payload = new
                {
                    CompanyName = config.Company,
                    UserName = config.User,
                    PassWord = config.Pass,
                    MeterId = meterId,
                    Switch = turnOn ? "on" : "off"
                };

                var response = await _httpClient.PostAsJsonAsync($"{config.BaseUrl.TrimEnd('/')}/api/RemotelySwitch", payload);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("[Stron] Remote switch response for {MeterId}: {Result}", meterId, result);
                    return true;
                }

                var errBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Stron] Remote switch failed for {MeterId}: Status={Status}, Error={Error}", meterId, response.StatusCode, errBody);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "[Stron] Network error sending remote switch command to meter {MeterId}.", meterId);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "[Stron] Remote switch command timed out for meter {MeterId}.", meterId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Stron] Unexpected error during remote switch for meter {MeterId}.", meterId);
            }

            // Return false — the caller knows the hardware command did not execute.
            return false;
        }

        private string FormatToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token)) return string.Empty;
            token = token.Replace("-", "").Trim();
            if (token.Length != 20) return token;

            // Format as xxxx-xxxx-xxxx-xxxx-xxxx
            return $"{token.Substring(0, 4)}-{token.Substring(4, 4)}-{token.Substring(8, 4)}-{token.Substring(12, 4)}-{token.Substring(16, 4)}";
        }

        // Response ViewModels
        public class CreditInformationViewModel
        {
            public string Token { get; set; } = string.Empty;
            public string Unit { get; set; } = string.Empty;
            public string Price { get; set; } = string.Empty;
        }

        public class SinglePhaseDaliyInformationViewModel
        {
            public string MeterID { get; set; } = string.Empty;
            public string Date { get; set; } = string.Empty;
            public string Residual_Amount { get; set; } = string.Empty;
            public string Cumulative_Total_Consumption { get; set; } = string.Empty;
            public string Voltage { get; set; } = string.Empty;
            public string Current { get; set; } = string.Empty;
            public string Power { get; set; } = string.Empty;
            public string RelayState { get; set; } = string.Empty;
            public string CoverState { get; set; } = string.Empty;
        }
    }
}
