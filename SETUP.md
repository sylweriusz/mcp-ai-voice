# 🚀 Quick Setup & Testing Guide

## Installation & Configuration

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure OpenAI TTS (Optional)
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Build Project
```bash
npm run build
```

## Testing

### Interactive Demo
```bash
npm run demo
```

### Manual Testing

#### Test Platform TTS Only
```bash
node dist/index.js
# Send: {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
```

#### Test with OpenAI TTS
```bash
# Make sure .env contains valid OPENAI_API_KEY
node dist/index.js
# Send: {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "say", "arguments": {"text": "Hello OpenAI!", "useOpenAI": true}}}
```

#### Test Fallback (OpenAI → Platform)
```bash
# Use invalid API key to trigger fallback
OPENAI_API_KEY=invalid node dist/index.js
```

## Expected Behaviors

### Without OpenAI API Key
```
🎯 Platform TTS: Available
🌩️ OpenAI TTS: Unavailable (no API key)
⭐ Preferred: PLATFORM
```

### With Valid OpenAI API Key
```
🎯 Platform TTS: Available
🌩️ OpenAI TTS: Available  
⭐ Preferred: OPENAI
```

### With Invalid OpenAI API Key
```
🎯 Platform TTS: Available
🌩️ OpenAI TTS: Available (but requests will fail)
⭐ Preferred: OPENAI
```

## Integration Testing

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "ai-voice": {
      "command": "npx",
      "args": ["@sylweriusz/mcp-ai-voice"],
      "env": {
        "OPENAI_API_KEY": "sk-your-api-key-here"
      }
    }
  }
}
```

### Test Commands in Claude
```
say("Test platform voice", { useOpenAI: false })
say("Test OpenAI voice", { useOpenAI: true, openaiVoice: "nova" })
say("Auto-selection test")
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Not Detected**
   - Check `.env` file exists and contains `OPENAI_API_KEY=sk-...`
   - Verify no spaces around the `=` sign
   - Restart the application after changing `.env`

2. **OpenAI API Errors**
   - Verify API key is valid at https://platform.openai.com/account/api-keys
   - Check API usage limits and billing status
   - Review error messages for specific OpenAI error codes

3. **Platform TTS Not Working**
   - Ensure system voices are available (`say -v ?` on macOS)
   - Check OS-specific TTS requirements
   - Verify audio output is not muted

4. **Build Errors**
   - Run `npm install` to ensure all dependencies
   - Check TypeScript version compatibility
   - Clear `dist/` and rebuild

### Debug Mode
Enable additional logging:
```bash
DEBUG_VOICE_SELECTION=true DEBUG_OPENAI_REQUESTS=true node dist/index.js
```

## Performance Notes

- **Platform TTS**: Near-instant startup, minimal resource usage
- **OpenAI TTS**: Network latency, API quota usage, higher quality
- **Hybrid Mode**: Best of both worlds with automatic fallback
- **File Cleanup**: Old OpenAI audio files cleaned automatically (24h default)
