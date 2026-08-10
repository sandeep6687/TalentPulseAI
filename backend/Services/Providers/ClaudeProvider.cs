using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace TalentPulseApi.Services.Providers
{
    public class ClaudeProvider : IAIProvider
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly string _model;

        public string ProviderName => "Claude";
        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_CLAUDE_API_KEY";

        public ClaudeProvider(IConfiguration configuration)
        {
            _httpClient = new HttpClient();
            _apiKey = configuration["AiProviders:Claude:ApiKey"] ?? configuration["Claude:ApiKey"];
            _model = configuration["AiProviders:Claude:Model"] ?? configuration["Claude:Model"] ?? "claude-3-7-sonnet-latest";
        }

        public async Task<string> GetResponseAsync(string prompt)
        {
            if (!IsConfigured)
                throw new InvalidOperationException($"Claude provider is not configured. Add API key to appsettings.json at AiProviders:Claude:ApiKey");

            try
            {
                var jsonPayload = JsonSerializer.Serialize(new
                {
                    model = _model,
                    max_tokens = 4000,
                    messages = new[] { new { role = "user", content = prompt } }
                });

                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
                {
                    Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("x-api-key", _apiKey);
                request.Headers.Add("anthropic-version", "2023-06-01");

                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var rawText = doc.RootElement
                        .GetProperty("content")[0]
                        .GetProperty("text").GetString();

                    return rawText ?? throw new Exception("Empty response from Claude");
                }

                var errorMsg = await response.Content.ReadAsStringAsync();
                throw new Exception($"Claude API error: {response.StatusCode} - {errorMsg}");
            }
            catch (Exception ex)
            {
                throw new Exception($"Claude provider failed: {ex.Message}", ex);
            }
        }
    }
}
