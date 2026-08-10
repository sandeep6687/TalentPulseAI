# Multi-Provider AI Setup Guide

The TalentPulse AI backend now supports **3 different AI providers**. Use whichever one works best for you!

## Available Providers

1. **Google Gemini** (Free tier available)
2. **OpenAI** (GPT-4 Turbo)
3. **Anthropic Claude** (Claude 3.5 Sonnet)

## How to Configure

Edit `backend/appsettings.json`:

```json
"AiProviders": {
  "PreferredProvider": "Gemini",  // Change this to switch providers
  "Gemini": {
    "ApiKey": "YOUR_GEMINI_API_KEY"
  },
  "OpenAI": {
    "ApiKey": "YOUR_OPENAI_API_KEY"
  },
  "Claude": {
    "ApiKey": "YOUR_CLAUDE_API_KEY"
  }
}
```

## Get API Keys

### 🔵 Google Gemini (Recommended - Free)
1. Visit: https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy and paste into `appsettings.json` under `AiProviders:Gemini:ApiKey`

### 🔴 OpenAI (ChatGPT-powered)
1. Visit: https://platform.openai.com/api-keys
2. Create a new API key
3. Add credits to your account (paid service)
4. Paste into `appsettings.json` under `AiProviders:OpenAI:ApiKey`

### 🟣 Anthropic Claude (Alternative)
1. Visit: https://console.anthropic.com/
2. Create API key
3. Paste into `appsettings.json` under `AiProviders:Claude:ApiKey`

## How It Works

The system will automatically:
1. Try your **PreferredProvider** first
2. If that fails, fall back to the first configured provider
3. If all AI fails, use a built-in heuristic analyzer

## Quick Test

After updating `appsettings.json`:
1. Restart backend: `Ctrl+C` then `dotnet run`
2. Go to frontend: http://localhost:3000
3. Upload a resume
4. Click "Generate ATS Resume"
5. The AI should work now!

## Switching Providers

To switch to a different provider, just change `PreferredProvider`:

```json
"AiProviders": {
  "PreferredProvider": "OpenAI",  // Switch to OpenAI
  ...
}
```

Then restart the backend. Done! 🎉
