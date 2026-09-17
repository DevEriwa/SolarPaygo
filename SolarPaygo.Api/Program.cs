using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Models;
using SolarPaygo.Api.Services;
using System.Linq;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReadCommentHandling = System.Text.Json.JsonCommentHandling.Skip;
        options.JsonSerializerOptions.AllowTrailingCommas = true;
    });
builder.Services.AddHttpClient();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SolarPaygo API",
        Version = "v1",
        Description = "Solar Prepaid Meter Management & Vending API"
    });

    // Allow Swagger to send JWT Bearer tokens for protected endpoints
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token below. Get it by calling POST /api/auth/login first."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<ISquadService, SquadService>();
builder.Services.AddScoped<IStronVendingService, StronVendingService>();
builder.Services.AddScoped<ISmsService, LoggingSmsService>();
builder.Services.AddHostedService<DailyBillingResetService>();
builder.Services.AddHostedService<TelemetrySyncService>();
builder.Services.AddHostedService<LowBalanceMonitorService>();

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = new List<string>
        {
            "https://idiascosolarsystem.co.uk",
             "http://idiascosolarsystem.co.uk",
            "https://www.idiascosolarsystem.co.uk",
            "https://app.idiascosolarsystem.co.uk",
            "http://app.idiascosolarsystem.co.uk",
             "http://appuat.idiascosolarsystem.co.uk",
              "https://appuat.idiascosolarsystem.co.uk",
               "http://uat.idiascosolarsystem.co.uk",
                "https://uat.idiascosolarsystem.co.uk",
        };

        if (builder.Environment.IsDevelopment())
        {
            allowedOrigins.AddRange(new[]
            {
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000"
            });
        }

        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
builder.Services.AddDbContext<SolarDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.Zero
        };

        // Important for SignalR with token in query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SolarDbContext>();

    // EnsureCreated() is a no-op on any database that already exists (local, UAT, production) —
    // it only creates a schema from scratch when the database doesn't exist at all yet, and does
    // NOT detect or apply incremental changes to an existing database. That job belongs entirely
    // to the idempotent ALTER TABLE/CREATE TABLE block below.
    db.Database.EnsureCreated();

    // Auto-migrate schema updates safely.
    //
    // NOTE ON MIGRATIONS: the files under Migrations/ are generated via `dotnet ef migrations add`
    // for historical record-keeping and EF model-snapshot diffing only. `Database.Migrate()` is
    // never called anywhere in this app, and no environment's database has EF migrations actually
    // applied to it — this block is the real, ongoing mechanism that evolves the schema. Do NOT run
    // `dotnet ef database update` against any environment's database: it will attempt to re-create
    // tables that already exist and fail.
    try
    {
        db.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SolarSystems') AND name = 'CumulativeKwhBought')
            BEGIN
                ALTER TABLE SolarSystems ADD CumulativeKwhBought DECIMAL(18, 2) NOT NULL DEFAULT 0.0;
            END
            
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SolarSystems') AND name = 'GeneratorCapacity')
            BEGIN
                ALTER TABLE SolarSystems ADD GeneratorCapacity NVARCHAR(50) NOT NULL DEFAULT '2KV';
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PricePlans')
            BEGIN
                CREATE TABLE PricePlans (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    Band NVARCHAR(10) NOT NULL,
                    Name NVARCHAR(100) NOT NULL,
                    PricePerKwh DECIMAL(18, 2) NOT NULL,
                    LoyaltyDiscountEnabled BIT NOT NULL DEFAULT 0,
                    LoyaltyThresholdKwh DECIMAL(18, 2) NOT NULL DEFAULT 500,
                    LoyaltyDiscountPercent DECIMAL(18, 2) NOT NULL DEFAULT 50,
                    TimeFloorProtectionEnabled BIT NOT NULL DEFAULT 0,
                    TimeFloorRatePerHour DECIMAL(18, 2) NOT NULL DEFAULT 313,
                    TimeFloorMinimumKwh DECIMAL(18, 2) NOT NULL DEFAULT 0.3,
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SolarSystems') AND name = 'PricePlanId')
            BEGIN
                ALTER TABLE SolarSystems ADD PricePlanId INT NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PricePlans') AND name = 'LoyaltyThresholdKwh')
            BEGIN
                ALTER TABLE PricePlans ADD LoyaltyThresholdKwh DECIMAL(18, 2) NOT NULL DEFAULT 500;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PricePlans') AND name = 'LoyaltyDiscountPercent')
            BEGIN
                ALTER TABLE PricePlans ADD LoyaltyDiscountPercent DECIMAL(18, 2) NOT NULL DEFAULT 50;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PricePlans') AND name = 'TimeFloorRatePerHour')
            BEGIN
                ALTER TABLE PricePlans ADD TimeFloorRatePerHour DECIMAL(18, 2) NOT NULL DEFAULT 313;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PricePlans') AND name = 'TimeFloorMinimumKwh')
            BEGIN
                ALTER TABLE PricePlans ADD TimeFloorMinimumKwh DECIMAL(18, 2) NOT NULL DEFAULT 0.3;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SolarSystems') AND name = 'PendingWalletBalance')
            BEGIN
                ALTER TABLE SolarSystems ADD PendingWalletBalance DECIMAL(18, 2) NOT NULL DEFAULT 0.0;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SolarSystems') AND name = 'LowBalanceNotified')
            BEGIN
                ALTER TABLE SolarSystems ADD LowBalanceNotified BIT NOT NULL DEFAULT 0;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Transactions') AND name = 'UsedAmount')
            BEGIN
                ALTER TABLE Transactions ADD UsedAmount DECIMAL(18, 2) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Transactions') AND name = 'AddedToWallet')
            BEGIN
                ALTER TABLE Transactions ADD AddedToWallet DECIMAL(18, 2) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Transactions') AND name = 'WalletBalanceAfter')
            BEGIN
                ALTER TABLE Transactions ADD WalletBalanceAfter DECIMAL(18, 2) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Transactions') AND name = 'RateAtTime')
            BEGIN
                ALTER TABLE Transactions ADD RateAtTime DECIMAL(18, 2) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminAccounts')
            BEGIN
                CREATE TABLE AdminAccounts (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    Username NVARCHAR(100) NOT NULL UNIQUE,
                    Password NVARCHAR(200) NOT NULL,
                    Role NVARCHAR(50) NOT NULL DEFAULT 'Admin',
                    IsActive BIT NOT NULL DEFAULT 1,
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GeneratorCapacities')
            BEGIN
                CREATE TABLE GeneratorCapacities (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    Code NVARCHAR(50) NOT NULL,
                    Name NVARCHAR(200) NOT NULL,
                    Watts INT NOT NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    DisplayOrder INT NOT NULL DEFAULT 0,
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                );
            END
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine("[DB Update] Error applying DB column updates: " + ex.Message);
    }

    // Seed the 3 fixed price bands (A/B/C) if none exist yet.
    // This never touches any SolarSystem row — PricePlanId stays null (legacy pricing)
    // for every existing customer until an admin explicitly assigns a band.
    try
    {
        if (!db.PricePlans.Any())
        {
            db.PricePlans.AddRange(
                new PricePlan { Band = "A", Name = "Band A", PricePerKwh = 2500m, LoyaltyDiscountEnabled = true, TimeFloorProtectionEnabled = true },
                new PricePlan { Band = "B", Name = "Band B", PricePerKwh = 2500m, LoyaltyDiscountEnabled = false, TimeFloorProtectionEnabled = true },
                new PricePlan { Band = "C", Name = "Band C", PricePerKwh = 2500m, LoyaltyDiscountEnabled = false, TimeFloorProtectionEnabled = false }
            );
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("[DB Seed] Error seeding price plans: " + ex.Message);
    }

    // Seed exactly the sizes the registration form already offered, so the picker looks
    // identical the first time this runs and no existing customer's stored capacity string
    // stops resolving. Watts are stated rather than parsed from the code: "7.5KV" read as
    // digits gives 75, and a 75000W ceiling is a relay that never trips.
    try
    {
        if (!db.AdminAccounts.Any())
        {
            db.AdminAccounts.AddRange(
                new AdminAccount { Username = "superadmin", Password = "SuperAdmin@2026!", Role = "SuperAdmin", IsActive = true },
                new AdminAccount { Username = "admin", Password = "admin123", Role = "Admin", IsActive = true }
            );
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("[DB Seed] Error seeding admin accounts: " + ex.Message);
    }

    try
    {
        if (!db.GeneratorCapacities.Any())
        {
            db.GeneratorCapacities.AddRange(
                new GeneratorCapacity { Code = "1KV",   Name = "Small (Residential, 1 room)",  Watts = 1000,  DisplayOrder = 1 },
                new GeneratorCapacity { Code = "2KV",   Name = "Medium (Standard Household)",  Watts = 2000,  DisplayOrder = 2 },
                new GeneratorCapacity { Code = "3KV",   Name = "Large (Small Business / Shop)", Watts = 3000, DisplayOrder = 3 },
                new GeneratorCapacity { Code = "5KV",   Name = "Extra Large (Commercial)",     Watts = 5000,  DisplayOrder = 4 },
                new GeneratorCapacity { Code = "7.5KV", Name = "Heavy Duty",                   Watts = 7500,  DisplayOrder = 5 },
                new GeneratorCapacity { Code = "10KV",  Name = "Industrial",                   Watts = 10000, DisplayOrder = 6 }
            );
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("[DB Seed] Error seeding generator capacities: " + ex.Message);
    }
}

// Enable Swagger UI in Development for debugging
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SolarPaygo API v1");
        c.RoutePrefix = "swagger";
        c.DisplayRequestDuration();
        c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
    });
}


app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseHsts();
app.MapHub<SolarPaygo.Api.Hubs.DashboardHub>("/hubs/dashboard");
app.Run();
