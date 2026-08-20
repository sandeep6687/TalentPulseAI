using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TalentPulseApi.Data;
using TalentPulseApi.Hubs;
using TalentPulseApi.Services;
using TalentPulseApi.Services.Providers;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers & Swagger API Documentation
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SignalR Real-Time WebSockets Engine
builder.Services.AddSignalR();

// Configure PostgreSQL Database Context via Entity Framework Core
var rawConnString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration["DATABASE_URL"];

if (string.IsNullOrWhiteSpace(rawConnString) || rawConnString.StartsWith("${"))
{
    rawConnString = "Host=localhost;Database=talentpulsedb;Username=postgres;Password=postgres";
}

var connString = FormatPostgresConnectionString(rawConnString);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connString));


// Register AI Providers (Multi-Provider Support: Gemini, OpenAI, Claude)
builder.Services.AddSingleton<GeminiProvider>();
builder.Services.AddSingleton<OpenAIProvider>();
builder.Services.AddSingleton<ClaudeProvider>();
builder.Services.AddSingleton<AIProviderFactory>();

// Register Service Interfaces
builder.Services.AddScoped<IAIEngineService, AIEngineService>();
builder.Services.AddScoped<IResumeParsingService, ResumeParsingService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// JWT Authentication via httpOnly Cookies
var jwtKey = builder.Configuration["Jwt:Key"] ?? "TalentPulseSuperSecureSecretKey_2026_Production_JWT_Token_9988!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "talentpulse-api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "talentpulse-client";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = !string.IsNullOrEmpty(jwtIssuer),
            ValidateAudience = !string.IsNullOrEmpty(jwtAudience),
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };

        // Read JWT from httpOnly cookie instead of Authorization header
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.ContainsKey("tp_auth"))
                    ctx.Token = ctx.Request.Cookies["tp_auth"];
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// CORS policy for React Client (must allow credentials for cookies)
var allowedFrontend = Environment.GetEnvironmentVariable("FrontendUrl") ?? "";
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
            // Allow explicit frontend URL if set
            if (!string.IsNullOrEmpty(allowedFrontend) && uri.GetLeftPart(UriPartial.Authority) == allowedFrontend)
                return true;
            // Fallback to previous host checks
            return uri.Host == "localhost"
                || uri.Host == "127.0.0.1"
                || uri.Host == "::1"
                || uri.Host == "0.0.0.0"
                || uri.Host.StartsWith("192.168.")
                || uri.Host.StartsWith("10.")
                || uri.Host.StartsWith("172.")
                || uri.Host.EndsWith(".vercel.app")
                || uri.Host.EndsWith(".onrender.com");
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// ── Global Exception Handler (returns JSON with error details) ──
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = 500;
        var error = new
        {
            error = ex.GetType().Name,
            message = ex.Message,
            inner = ex.InnerException?.Message,
            stack = ex.StackTrace?[..Math.Min(ex.StackTrace?.Length ?? 0, 500)]
        };
        await context.Response.WriteAsJsonAsync(error);
    }
});

// Enable Swagger UI Documentation Page
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "TalentPulse AI API v1");
    });
}

app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

// Automatically initialize PostgreSQL schema on deployment startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        app.Logger.LogInformation("Database schema initialization completed successfully.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "DATABASE INIT FAILED: {Message} | Inner: {Inner}", ex.Message, ex.InnerException?.Message);
    }
}

// Diagnostic endpoint to check DB connection and env vars
app.MapGet("/api/diagnostics", async (AppDbContext db) =>
{
    var results = new Dictionary<string, string>();
    results["timestamp"] = DateTime.UtcNow.ToString("o");
    results["environment"] = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "unknown";
    results["frontendUrl"] = Environment.GetEnvironmentVariable("FrontendUrl") ?? "NOT SET";
    results["jwtKeySet"] = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("Jwt__Key")) ? "YES" : "NO (using fallback)";
    results["connStringSource"] = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")) ? "ENV_VAR" : "config/fallback";

    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        results["dbConnection"] = canConnect ? "SUCCESS" : "FAILED (CanConnect returned false)";

        if (canConnect)
        {
            var tableCount = db.Database.GetAppliedMigrations().Count();
            results["appliedMigrations"] = tableCount.ToString();

            // Check if Users table exists by attempting a count
            try
            {
                var userCount = await db.Users.CountAsync();
                results["usersTableExists"] = "YES";
                results["userCount"] = userCount.ToString();
            }
            catch (Exception tableEx)
            {
                results["usersTableExists"] = "ERROR: " + tableEx.Message;
            }
        }
    }
    catch (Exception dbEx)
    {
        results["dbConnection"] = "ERROR: " + dbEx.Message;
        if (dbEx.InnerException != null)
            results["dbInnerError"] = dbEx.InnerException.Message;
    }

    return Results.Ok(results);
});

app.MapControllers();
app.MapHub<InterviewHub>("/hubs/interview");

app.Run();

static string FormatPostgresConnectionString(string rawConn)
{
    if (string.IsNullOrWhiteSpace(rawConn) || rawConn.StartsWith("${"))
        return "Host=localhost;Database=talentpulsedb;Username=postgres;Password=postgres";

    if (rawConn.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        rawConn.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            var uri = new Uri(rawConn);
            var userInfo = uri.UserInfo.Split(':');
            var username = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var database = uri.AbsolutePath.TrimStart('/');
            var port = uri.Port > 0 ? uri.Port : 5432;

            return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Prefer;Trust Server Certificate=true;";
        }
        catch
        {
            return rawConn;
        }
    }

    // If it's already a standard Npgsql key=value string, ensure Trust Server Certificate
    if (!rawConn.Contains("Trust Server Certificate", StringComparison.OrdinalIgnoreCase))
    {
        rawConn += ";Trust Server Certificate=true;";
    }

    return rawConn;
}


