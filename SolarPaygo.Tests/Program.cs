using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Controllers;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;

Console.WriteLine("===================================================================");
Console.WriteLine("   SOLARPAYGO SMART REMITTANCE & EXIT GOVERNANCE TEST SUITE        ");
Console.WriteLine("===================================================================");

var options = new DbContextOptionsBuilder<SolarDbContext>()
    .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
    .Options;

using var db = new SolarDbContext(options);

// ── TEST 1: Backward Compatibility (Standard Group) ─────────────────
Console.WriteLine("\n[TEST 1] Testing Legacy / Standard Group Backward Compatibility...");
var dgc = new DeviceGroupController(db);
var standardGroupReq = new DeviceGroupController.UpsertGroupRequest
{
    Name = "Abuja Tab",
    Description = "Standard meter grouping",
    DisplayOrder = 1,
    IsActive = true,
    IsRoiEnabled = false,
    InvestorsCapital = 0m
};
var stdResult = await dgc.Create(standardGroupReq) as OkObjectResult;
var stdGroup = stdResult?.Value as DeviceGroup;

Assert(stdGroup != null, "Standard group created successfully");
Assert(!stdGroup!.IsRoiEnabled, "ROI is disabled by default for standard groups");
Assert(stdGroup.InvestorsCapital == 0m, "InvestorsCapital is 0");
Assert(!stdGroup.IsReturnCapital, "Return Capital is false");
Assert(stdGroup.InvestorAdminAccountId == null, "No investor account linked");
Console.WriteLine("  ✓ PASSED: Standard groups are unaffected by investment logic.");

// ── TEST 2: Create Investment Group (5M Capital, 15% ROI, Investor Login) ──
Console.WriteLine("\n[TEST 2] Creating Investment Portfolio (₦5M Capital, 15% ROI, Investor Account)...");
var investGroupReq = new DeviceGroupController.UpsertGroupRequest
{
    Name = "Commercial Sector 1",
    Description = "Generators serving market plaza",
    DisplayOrder = 2,
    IsActive = true,
    InvestorsCapital = 5_000_000m,
    IsRoiEnabled = true,
    RoiPercentage = 15m,
    RemittanceSharePercent = 100m,
    SettlementCycle = "Monthly",
    IsReturnCapital = false,
    InvestorEnabled = true,
    InvestorUsername = "investor_commercial1",
    InvestorPassword = "SecurePassword123!"
};

var invResult = await dgc.Create(investGroupReq) as OkObjectResult;
var invGroup = invResult?.Value as DeviceGroup;

Assert(invGroup != null, "Investment group created");
Assert(invGroup!.IsRoiEnabled, "ROI enabled is true");
Assert(invGroup.InvestorsCapital == 5_000_000m, "Capital is ₦5,000,000");
Assert(invGroup.RoiPercentage == 15m, "Annual ROI is 15%");
Assert(invGroup.InvestorAdminAccountId.HasValue, "Investor account linked");

var createdAccount = await db.AdminAccounts.FindAsync(invGroup.InvestorAdminAccountId!.Value);
Assert(createdAccount != null, "Investor AdminAccount found in DB");
Assert(createdAccount!.Role == "Investor", "Account assigned 'Investor' role");
Assert(createdAccount.Username == "investor_commercial1", "Username matches");
Assert(createdAccount.DeviceGroupId == invGroup.Id, "Account linked to DeviceGroupId");
Console.WriteLine("  ✓ PASSED: Portfolio group and investor credentials created and linked.");

// ── TEST 3: Meter Assignment & Smart Remittance Collections ───────────
Console.WriteLine("\n[TEST 3] Assigning Meters & Processing Energy Credit Purchases...");
var meter1 = new SolarSystem { HardwareId = "MTR-001", StronMeterId = "1001", OwnerName = "Plaza Shop 1", DeviceGroupId = invGroup.Id, Status = "Active", AvailableUnits = 50, Power = 450 };
var meter2 = new SolarSystem { HardwareId = "MTR-002", StronMeterId = "1002", OwnerName = "Plaza Shop 2", DeviceGroupId = invGroup.Id, Status = "Active", AvailableUnits = 30, Power = 300 };
db.SolarSystems.AddRange(meter1, meter2);
await db.SaveChangesAsync();

// End-user purchases ₦100,000 and ₦50,000 in energy credits
var tx1 = new Transaction { SolarSystemId = meter1.Id, AmountPaid = 100_000m, Status = "Completed", TransactionDate = DateTime.UtcNow };
var tx2 = new Transaction { SolarSystemId = meter2.Id, AmountPaid = 50_000m, Status = "Completed", TransactionDate = DateTime.UtcNow };
db.Transactions.AddRange(tx1, tx2);
await db.SaveChangesAsync();

var ic = new InvestorController(db);
SetInvestorContext(ic, invGroup.Id, "investor_commercial1");

var portResult = await ic.GetPortfolio(null) as OkObjectResult;
Assert(portResult != null, "Investor portfolio endpoint responded 200 OK");

var jsonDoc = JsonDocument.Parse(JsonSerializer.Serialize(portResult!.Value));
var root = jsonDoc.RootElement;
var fin = root.GetProperty("Financials");
decimal capital = fin.GetProperty("InvestorsCapital").GetDecimal();
decimal roi = fin.GetProperty("RoiPercentage").GetDecimal();
decimal milestone = fin.GetProperty("AnnualRoiMilestone").GetDecimal();
decimal remittedYear = fin.GetProperty("RemittedYear").GetDecimal();
decimal progress = fin.GetProperty("ProgressPercent").GetDecimal();
decimal remaining = fin.GetProperty("RemainingToMilestone").GetDecimal();

Assert(capital == 5_000_000m, "Portfolio capital is ₦5,000,000");
Assert(roi == 15m, "Annual ROI is 15%");
Assert(milestone == 750_000m, "Annual ROI Milestone is ₦750,000 (15% of 5M)");
Assert(remittedYear == 150_000m, "Remitted Year is ₦150,000 (100k + 50k)");
Assert(progress == 20m, "Progress towards milestone is 20% (150k / 750k)");
Assert(remaining == 600_000m, "Remaining to 15% milestone is ₦600,000");

var metersElem = root.GetProperty("Meters");
Assert(metersElem.GetArrayLength() == 2, "Both assigned meters appear in investor's fleet");
Console.WriteLine("  ✓ PASSED: Smart Remittance routed all kobo to investor portfolio towards 15% milestone.");

// ── TEST 4: Flexible Remittance Share Split (e.g. 80%) ───────────────
Console.WriteLine("\n[TEST 4] Testing Flexible Remittance Share Split (80% Investor / 20% Ops)...");
var updateShareReq = new DeviceGroupController.UpsertGroupRequest
{
    Name = invGroup.Name,
    Description = invGroup.Description,
    DisplayOrder = invGroup.DisplayOrder,
    IsActive = true,
    InvestorsCapital = 5_000_000m,
    IsRoiEnabled = true,
    RoiPercentage = 15m,
    RemittanceSharePercent = 80m, // 80% to investor
    SettlementCycle = "Monthly",
    IsReturnCapital = false
};
await dgc.Update(invGroup.Id, updateShareReq);

var portResult80 = await ic.GetPortfolio(null) as OkObjectResult;
var doc80 = JsonDocument.Parse(JsonSerializer.Serialize(portResult80!.Value));
decimal remitted80 = doc80.RootElement.GetProperty("Financials").GetProperty("RemittedYear").GetDecimal();
Assert(remitted80 == 120_000m, "80% of ₦150,000 gross is ₦120,000 allocated to investor");
Console.WriteLine("  ✓ PASSED: Remittance share splits dynamically and correctly.");

// ── TEST 5: Return Capital & 12-Month Liquidation Exit Governance ─────
Console.WriteLine("\n[TEST 5] Triggering Return Capital & 12-Month Exit Governance (15% -> 10% auto-shift)...");
var exitReq = new DeviceGroupController.UpsertGroupRequest
{
    Name = invGroup.Name,
    Description = invGroup.Description,
    DisplayOrder = invGroup.DisplayOrder,
    IsActive = true,
    InvestorsCapital = 5_000_000m,
    IsRoiEnabled = true,
    RoiPercentage = 10m, // switches to 10%
    RemittanceSharePercent = 100m,
    SettlementCycle = "Monthly",
    IsReturnCapital = true // Return Capital checked!
};
await dgc.Update(invGroup.Id, exitReq);

var exitGroup = await db.DeviceGroups.FindAsync(invGroup.Id);
Assert(exitGroup!.IsReturnCapital, "IsReturnCapital is true");
Assert(exitGroup.RoiPercentage == 10m, "Yield tier adjusted to 10% annual return rate");
Assert(exitGroup.ExitNoticeDate.HasValue, "12-month notice window clock started");
Assert(exitGroup.ExitTargetDate.HasValue, "Exit target date set 12 months ahead");
Assert(exitGroup.ExitCapitalAmount == 5_500_000m, "Liquidation target is ₦5,500,000 (Capital + 10% ROI)");

var exitPortResult = await ic.GetPortfolio(null) as OkObjectResult;
var exitDoc = JsonDocument.Parse(JsonSerializer.Serialize(exitPortResult!.Value));
var exitGroupElem = exitDoc.RootElement.GetProperty("Group");
int daysLeft = exitGroupElem.GetProperty("DaysRemainingInExitWindow").GetInt32();
decimal targetPayout = exitGroupElem.GetProperty("ExitCapitalAmount").GetDecimal();

Assert(daysLeft >= 364 && daysLeft <= 366, "Countdown shows ~365 days in 12-month window");
Assert(targetPayout == 5_500_000m, "Target payout reflects ₦5,500,000 (Full Capital + 10% Yield)");
Console.WriteLine("  ✓ PASSED: Exit Governance adjusted rate to 10%, set 12-month notice, and calculated full liquidation target.");

// ── TEST 6: Manual Settlement Recording ───────────────────────────────
Console.WriteLine("\n[TEST 6] Recording Manual Settlement Payout...");
var settleReq = new InvestorController.RecordSettlementRequest
{
    DeviceGroupId = invGroup.Id,
    Amount = 50_000m,
    SettlementCycle = "Monthly",
    Reference = "MANUAL-PAYOUT-001",
    Notes = "Monthly cash flow remittance transfer"
};
var settleResult = await ic.RecordSettlement(settleReq) as OkObjectResult;
Assert(settleResult != null, "Settlement recorded");

var settledPortResult = await ic.GetPortfolio(null) as OkObjectResult;
var settledDoc = JsonDocument.Parse(JsonSerializer.Serialize(settledPortResult!.Value));
decimal totalSettled = settledDoc.RootElement.GetProperty("Financials").GetProperty("TotalSettled").GetDecimal();
decimal pendingAccrued = settledDoc.RootElement.GetProperty("Financials").GetProperty("PendingSettlement").GetDecimal();

Assert(totalSettled == 50_000m, "Total settled reflects ₦50,000");
Assert(pendingAccrued == 100_000m, "Pending accrued balance is ₦100,000 (150k - 50k)");
Console.WriteLine("  ✓ PASSED: Manual settlement recorded and deducted from accrued balance.");

Console.WriteLine("\n===================================================================");
Console.WriteLine("   ALL 6 TEST PHASES PASSED WITH 100% SUCCESS!                    ");
Console.WriteLine("===================================================================");

static void Assert(bool condition, string message)
{
    if (!condition)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"  ✗ FAILED: {message}");
        Console.ResetColor();
        Environment.Exit(1);
    }
    else
    {
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"  ✔ {message}");
        Console.ResetColor();
    }
}

static void SetInvestorContext(ControllerBase controller, int deviceGroupId, string username)
{
    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, username),
        new Claim(ClaimTypes.Role, "Investor"),
        new Claim("DeviceGroupId", deviceGroupId.ToString())
    };
    var identity = new ClaimsIdentity(claims, "TestAuth");
    var principal = new ClaimsPrincipal(identity);
    controller.ControllerContext = new ControllerContext
    {
        HttpContext = new DefaultHttpContext { User = principal }
    };
}
