using System.Threading.Tasks;

namespace TalentPulseApi.Services.Providers
{
    /// <summary>
    /// Interface for AI provider implementations (Gemini, OpenAI, Claude, etc.)
    /// </summary>
    public interface IAIProvider
    {
        /// <summary>
        /// Name of the provider (e.g., "Gemini", "OpenAI", "Claude")
        /// </summary>
        string ProviderName { get; }

        /// <summary>
        /// Whether the provider is properly configured with a valid API key
        /// </summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Send a prompt to the AI model and get the response
        /// </summary>
        Task<string> GetResponseAsync(string prompt);
    }
}
