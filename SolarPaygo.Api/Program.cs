using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SolarPaygo.Api.Data;
using SolarPaygo.Api.Services;
using System.Text;
using System.IO;

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
// builder.Services.AddHostedService<LowBalanceMonitorService>();

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SolarDbContext>();
    if (app.Environment.IsDevelopment())
    {
        // One‑time DB reset: check for marker file
        var markerPath = Path.Combine(AppContext.BaseDirectory, "db_reset_done.marker");
        if (!File.Exists(markerPath))
        {
            // Delete all tables & data
            db.Database.EnsureDeleted();
            // Create marker to prevent future resets
            File.WriteAllText(markerPath, "Database reset completed at " + DateTime.UtcNow);
        }
    }
    // Ensure schema exists (creates tables if missing)
    db.Database.EnsureCreated();
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
app.UseCors("AllowAll");
// app.UseCors("DevCors"); // removed earlier line
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SolarPaygo.Api.Hubs.DashboardHub>("/hubs/dashboard");
app.Run();
