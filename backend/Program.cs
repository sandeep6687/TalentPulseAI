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
var connString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Database=talentpulsedb;Username=postgres;Password=postgres";

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

app.MapControllers();
app.MapHub<InterviewHub>("/hubs/interview");

app.Run();
