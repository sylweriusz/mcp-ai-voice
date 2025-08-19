# 🎵 MCP Nexus Voice v1.2.0

**Hybrid Voice Architecture: Platform + OpenAI TTS**

Enable AI agents to express themselves with natural voice synthesis through intelligent engine selection. Supports both zero-config platform voices and premium OpenAI TTS with automatic fallback.

## ✨ Features

### 🌩️ Hybrid Architecture
- **Platform TTS**: Zero-config system voices (macOS, Windows, Linux)
- **OpenAI TTS**: Premium cloud-based synthesis when API key provided
- **Intelligent Selection**: Automatic engine selection with graceful fallback
- **Asynchronous Processing**: Non-blocking voice synthesis

### 🎭 Voice Options
- **Platform Voices**: 34+ languages with quality optimization
- **OpenAI Voices**: 6 premium voices (alloy, echo, fable, onyx, nova, shimmer)
- **Quality Modes**: Standard (tts-1) and HD (tts-1-hd)
- **Speed Control**: 0.25x to 4.0x playback speed

### 🔄 Smart Fallback
- OpenAI → Platform fallback on errors
- Graceful degradation without workflow interruption
- Comprehensive error handling and logging
- **Background playback**: Audio plays directly without opening windows or applications

## 🚀 Quick Start

### Installation
```bash
npm install -g @sylweriusz/mcp-ai-voice
```

### Environment Configuration (.env)

For easier configuration, copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
```bash
# Required for OpenAI TTS
OPENAI_API_KEY=sk-your-actual-api-key-here

# Optional customizations
DEFAULT_TTS_VOICE=nova          # Your preferred OpenAI voice
DEFAULT_TTS_MODEL=tts-1-hd      # Higher quality model
DEFAULT_TTS_SPEED=1.2           # Slightly faster speech
```

### Claude Desktop Configuration

#### Basic Setup (Platform TTS only)
```json
{
  "mcpServers": {
    "ai-voice": {
      "command": "npx",
      "args": ["@sylweriusz/mcp-ai-voice"]
    }
  }
}
```

#### Hybrid Setup (Platform + OpenAI TTS)

**Option 1: Environment Variables**
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

**Option 2: Using .env file (Recommended)**
```json
{
  "mcpServers": {
    "ai-voice": {
      "command": "npx",
      "args": ["@sylweriusz/mcp-ai-voice"]
    }
  }
}
```
*Note: Ensure your `.env` file is in the project directory with `OPENAI_API_KEY` configured.*

## 🎮 Usage Examples

### Basic Voice Expression
```javascript
// Simple usage - auto-selects best engine
say("Hello! I'm excited to help you today!")

// Platform-specific language
say("Witam! Jak się masz?", { language: "pl" })

// macOS Easter Egg - exact voice names
say("Welcome to the future!", { language: "Fred" })
```

### OpenAI TTS Usage
```javascript
// Use OpenAI with default settings
say("This uses premium OpenAI synthesis!", { useOpenAI: true })

// Specific OpenAI voice and model
say("Deep, authoritative voice", {
  useOpenAI: true,
  openaiVoice: "onyx",
  openaiModel: "tts-1-hd"
})

// Speed control
say("Speaking at double speed!", {
  useOpenAI: true,
  openaiSpeed: 2.0
})

// Warm female voice with HD quality
say("Natural, engaging conversation", {
  useOpenAI: true,
  openaiVoice: "nova",
  openaiModel: "tts-1-hd"
})
```

### Engine Selection Strategy
```javascript
// Force platform engine (even if OpenAI available)
say("Using system voice", { useOpenAI: false })

// Auto-selection (prefers OpenAI if available)
say("Best available quality")

// Fallback demonstration
say("This will use OpenAI, but fall back to platform on error", {
  useOpenAI: true
})
```

## 🎭 Voice Characteristics

### OpenAI Voices
- **alloy**: Balanced, versatile voice
- **echo**: Clear, direct masculine voice ⭐ (Default)
- **fable**: Expressive, storytelling voice
- **onyx**: Deep, authoritative masculine voice
- **nova**: Warm, engaging feminine voice
- **shimmer**: Bright, energetic feminine voice

### Platform Voices
- **macOS**: Premium system voices with heritage options
- **Windows**: SAPI voices with quality detection
- **Linux**: espeak voices with language optimization

## ⚙️ Configuration

### Environment Variables
```bash
# Required for OpenAI TTS
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Default voice preference (OpenAI)
DEFAULT_TTS_VOICE=echo

# Optional: Audio player command override
AUDIO_PLAYER_COMMAND=vlc
```

### Tool Parameters
```javascript
{
  text: "Required text to synthesize",
  
  // Platform engine options
  language: "pl",           // Language code or macOS voice name
  
  // OpenAI engine options
  useOpenAI: true,          // Force OpenAI engine
  openaiVoice: "nova",      // OpenAI voice selection
  openaiModel: "tts-1-hd",  // Quality: tts-1 or tts-1-hd
  openaiSpeed: 1.5          // Speed: 0.25 to 4.0
}
```

## 🏗️ Architecture

### Hybrid Engine Selection
1. **API Key Check**: OpenAI available if `OPENAI_API_KEY` provided
2. **User Preference**: `useOpenAI` parameter overrides auto-selection
3. **Auto-Selection**: Prefers OpenAI when available
4. **Fallback**: OpenAI errors trigger platform engine fallback
5. **Platform Backup**: Always available as reliability baseline

### Performance Optimization
- **Asynchronous Processing**: Non-blocking synthesis
- **Background Audio**: Direct audio playback without opening windows or applications
- **Cleanup Management**: Automatic temporary file cleanup
- **Error Resilience**: Graceful degradation on API issues

## 🛠️ Development

### Build from Source
```bash
git clone https://github.com/sylweriusz/mcp-ai-voice.git
cd mcp-ai-voice
npm install
npm run build
npm start
```

### Testing Hybrid Setup
```bash
# Test platform engine only
node dist/index.js

# Test with OpenAI (requires API key)
OPENAI_API_KEY=sk-... node dist/index.js
```

## 📊 Monitoring

The system provides comprehensive logging:
```
🎵 AI Voice v1.2.0 - Hybrid Voice Architecture
🔍 Initializing voice ecosystem...
📊 Engine Status:
   🎯 Platform TTS: Available
   🌩️ OpenAI TTS: Available
   ⭐ Preferred: OPENAI
📡 Hybrid voice synthesis ready
🎯 Platform: darwin
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Test hybrid functionality with both engines
4. Submit pull request with test cases

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Repository**: https://github.com/sylweriusz/mcp-ai-voice
- **NPM Package**: https://www.npmjs.com/package/@sylweriusz/mcp-ai-voice
- **Issues**: https://github.com/sylweriusz/mcp-ai-voice/issues
- **OpenAI TTS Documentation**: https://platform.openai.com/docs/api-reference/audio/createSpeech

---

**🎵 Express yourself vocally - the hybrid way!**
