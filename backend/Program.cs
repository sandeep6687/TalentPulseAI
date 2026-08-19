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
var rawConnString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["DATABASE_URL"]
    ?? "Host=localhost;Database=talentpulsedb;Username=postgres;Password=postgres";

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
var jwtKey = builder.Configuration["Jwt:Key"] ?? "TalentPulseSecretKey_SuperSecure_2026_XyZ!";
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
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

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
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not automatically initialize database on startup. Ensure PostgreSQL is connected.");
    }
}

app.MapControllers();
app.MapHub<InterviewHub>("/hubs/interview");

app.Run();

static string FormatPostgresConnectionString(string rawConn)
{
    if (string.IsNullOrWhiteSpace(rawConn))
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

            return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
        }
        catch
        {
            return rawConn;
        }
    }

    return rawConn;
}


