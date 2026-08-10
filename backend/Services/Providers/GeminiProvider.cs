using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace TalentPulseApi.Services.Providers
{
    public class GeminiProvider : IAIProvider
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly string _model;

        public string ProviderName => "Gemini";
        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_GEMINI_API_KEY";

        public GeminiProvider(IConfiguration configuration)
        {
            _httpClient = new HttpClient();
            _apiKey = configuration["AiProviders:Gemini:ApiKey"] ?? configuration["Gemini:ApiKey"];
            _model = configuration["AiProviders:Gemini:Model"] ?? configuration["Gemini:Model"] ?? "gemini-flash-latest";
        }

        public async Task<string> GetResponseAsync(string prompt)
        {
            if (!IsConfigured)
                throw new InvalidOperationException($"Gemini provider is not configured. Add API key to appsettings.json at AiProviders:Gemini:ApiKey");

            try
            {
                var jsonPayload = JsonSerializer.Serialize(new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } }
                });

                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var rawText = doc.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text").GetString();

                    return rawText ?? throw new Exception("Empty response from Gemini");
                }

                var errorMsg = await response.Content.ReadAsStringAsync();
                throw new Exception($"Gemini API error: {response.StatusCode} - {errorMsg}");
            }
            catch (Exception ex)
            {
                throw new Exception($"Gemini provider failed: {ex.Message}", ex);
            }
        }
    }
}
