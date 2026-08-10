using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Configuration;

namespace TalentPulseApi.Services.Providers
{
    /// <summary>
    /// Automatically selects the best available AI provider based on configuration
    /// </summary>
    public class AIProviderFactory
    {
        private readonly List<IAIProvider> _providers;
        private readonly string _preferredProvider;

        public AIProviderFactory(IConfiguration configuration, GeminiProvider gemini, OpenAIProvider openAI, ClaudeProvider claude)
        {
            _providers = new List<IAIProvider> { gemini, openAI, claude };
            _preferredProvider = configuration["AiProviders:PreferredProvider"] ?? "Gemini";
        }

        /// <summary>
        /// Get the best available provider (preferred first, then first configured one)
        /// </summary>
        public IAIProvider GetProvider()
        {
            // Try preferred provider first
            var preferred = _providers.FirstOrDefault(p => p.ProviderName == _preferredProvider && p.IsConfigured);
            if (preferred != null)
                return preferred;

            // Fall back to first configured provider
            var available = _providers.FirstOrDefault(p => p.IsConfigured);
            if (available != null)
                return available;

            // List what's needed
            var configured = string.Join(", ", _providers.Select(p => $"{p.ProviderName} ({(p.IsConfigured ? "✓" : "✗")})"));
            throw new InvalidOperationException($"No AI provider is configured. Available: {configured}. Configure API keys in appsettings.json under AiProviders section.");
        }

        /// <summary>
        /// Get a specific provider by name
        /// </summary>
        public IAIProvider GetProvider(string providerName)
        {
            var provider = _providers.FirstOrDefault(p => p.ProviderName == providerName);
            if (provider == null)
                throw new ArgumentException($"Provider '{providerName}' not found");
            if (!provider.IsConfigured)
                throw new InvalidOperationException($"Provider '{providerName}' is not configured");
            return provider;
        }

        /// <summary>
        /// Get all configured providers
        /// </summary>
        public IEnumerable<string> GetConfiguredProviders()
        {
            return _providers.Where(p => p.IsConfigured).Select(p => p.ProviderName);
        }
    }
}
