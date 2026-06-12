import requests
import time
import random
import urllib3

# Ignore SSL warnings for local development
urllib3.disable_warnings()

API_URL = "https://localhost:7030/api/device"
SYSTEM_ID = 1  # Assuming the first registered system gets ID 1

def simulate_hardware():
    print("=========================================")
    print(f" SOLAR HARDWARE SIMULATOR STARTED")
    print(f" Target System ID: {SYSTEM_ID}")
    print("=========================================\n")
    
    while True:
        try:
            # Simulate using between 0.1 and 1.5 kWh per ping
            units_used = round(random.uniform(0.1, 1.5), 2)
            print(f"[HW] Reporting usage: {units_used} kWh consumed...")
            
            response = requests.post(f"{API_URL}/{SYSTEM_ID}/ping", json=units_used, verify=False)
            
            if response.status_code == 200:
                data = response.json()
                action = data.get("action")
                balance = data.get("availableUnits")
                
                print(f"[API] Response: Action='{action}', Remaining Balance={balance:.2f} kWh")
                
                if action == "Lock":
                    print(">>> HARDWARE: RELAY SWITCH TURNED OFF (Power Cut) <<<")
                else:
                    print(">>> HARDWARE: RELAY SWITCH IS ON (Power Flowing) <<<")
            else:
                print(f"[API] Error: Server returned {response.status_code} - Is the system registered?")
                
        except Exception as e:
            print(f"Connection failed. Is the ASP.NET API running? Error: {e}")
            
        print("\nWaiting 10 seconds before next report...\n")
        time.sleep(10)

if __name__ == "__main__":
    simulate_hardware()
