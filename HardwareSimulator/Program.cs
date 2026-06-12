using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    private static readonly HttpClient client = new HttpClient();
    private const string API_URL = "https://localhost:7030/api/device/1/ping"; // ID 1 is SG-001
    private static bool isRelayOn = true;

    static async Task Main(string[] args)
    {
        Console.WriteLine("=============================================");
        Console.WriteLine("  SOLAR GENERATOR HARDWARE SIMULATOR (C#)    ");
        Console.WriteLine("  Hardware ID: SG-001 (Database ID: 1)");
        Console.WriteLine("=============================================\n");

        while (true)
        {
            try
            {
                // Simulate using 10 units every ping, IF the relay is on
                decimal powerUsed = isRelayOn ? 10.0M : 0M;

                // The API expects a raw decimal value, not a JSON object
                var content = new StringContent(powerUsed.ToString(), Encoding.UTF8, "application/json");
                
                Console.WriteLine($"[PING] Reporting {powerUsed} kWh used to API...");
                var response = await client.PostAsync(API_URL, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    var data = JsonSerializer.Deserialize<JsonElement>(responseString);
                    var remaining = data.GetProperty("availableUnits").GetDecimal();
                    var action = data.GetProperty("action").GetString();

                    Console.WriteLine($"[REPLY] Balance: {remaining} units remaining. Action Instructed: {action}");

                    // Check if the API instructed us to Lock or Unlock
                    if (action == "Lock" && isRelayOn)
                    {
                        isRelayOn = false;
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine(">>> HARDWARE: RELAY SWITCH TURNED OFF (Power Cut) <<<\n");
                        Console.ResetColor();
                    }
                    else if (action == "Unlock" && !isRelayOn)
                    {
                        isRelayOn = true;
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine(">>> HARDWARE: RELAY SWITCH IS ON (Power Flowing) <<<\n");
                        Console.ResetColor();
                    }
                }
                else
                {
                    Console.WriteLine($"[ERROR] API returned {response.StatusCode}. Make sure API is running.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to connect: {ex.Message}");
            }

            // Wait 5 seconds before next ping to make testing fast
            await Task.Delay(5000);
        }
    }
}
