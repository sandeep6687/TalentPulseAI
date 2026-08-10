using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace TalentPulseApi.Services.Providers
{
    public class OpenAIProvider : IAIProvider
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly string _model;

        public string ProviderName => "OpenAI";
        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_OPENAI_API_KEY";

        public OpenAIProvider(IConfiguration configuration)
        {
            _httpClient = new HttpClient();
            _apiKey = configuration["AiProviders:OpenAI:ApiKey"] ?? configuration["OpenAI:ApiKey"];
            _model = configuration["AiProviders:OpenAI:Model"] ?? configuration["OpenAI:Model"] ?? "gpt-4.1";
        }

        public async Task<string> GetResponseAsync(string prompt)
        {
            if (!IsConfigured)
                throw new InvalidOperationException($"OpenAI provider is not configured. Add API key to appsettings.json at AiProviders:OpenAI:ApiKey");

            try
            {
                var jsonPayload = JsonSerializer.Serialize(new
                {
                    model = _model,
                    messages = new[] { new { role = "user", content = prompt } },
                    temperature = 0.7,
                    max_tokens = 4000
                });

                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
                {
                    Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("Authorization", $"Bearer {_apiKey}");

                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var rawText = doc.RootElement
                        .GetProperty("choices")[0]
                        .GetProperty("message")
                        .GetProperty("content").GetString();

                    return rawText ?? throw new Exception("Empty response from OpenAI");
                }

                var errorMsg = await response.Content.ReadAsStringAsync();
                throw new Exception($"OpenAI API error: {response.StatusCode} - {errorMsg}");
            }
            catch (Exception ex)
            {
                throw new Exception($"OpenAI provider failed: {ex.Message}", ex);
            }
        }
    }
}
