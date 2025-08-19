# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-08-19

### 🎯 Version Update for Multi-Platform Deployment

**Updated**
- **Version Synchronization**: Updated all version references across the codebase to 1.2.0
- **Smitery Compatibility**: Aligned version for Smitery deployment readiness  
- **Anyat-S Integration**: Prepared version for Anyat-S platform deployment
- **Documentation Consistency**: Synchronized version numbers in README, package.json, smithery.yaml, and source files
- **Build System**: Updated TypeScript compilation and distribution files

**Technical Changes**
- Updated package.json version to 1.2.0
- Updated smithery.yaml version configuration
- Updated README.md version references  
- Updated source code version comments and metadata
- Updated demo script version display

## [1.1.0] - 2025-08-19

### 🌩️ Major: Hybrid Voice Architecture

**Added**
- **OpenAI TTS Engine**: Premium cloud-based voice synthesis using OpenAI's TTS models
- **Hybrid Architecture**: Intelligent selection between Platform and OpenAI engines
- **6 OpenAI Voices**: alloy, echo, fable, onyx, nova, shimmer with personality descriptions
- **Quality Modes**: Standard (tts-1) and HD (tts-1-hd) models
- **Speed Control**: 0.25x to 4.0x playback speed adjustment
- **Automatic Fallback**: OpenAI → Platform fallback on errors or API issues
- **Enhanced Tool Schema**: New parameters for OpenAI-specific options
- **Engine Status Monitoring**: Real-time engine availability and preference reporting
- **Cleanup Management**: Automatic temporary file cleanup for OpenAI audio files
- **Background Audio Playback**: Direct audio output without opening windows or applications

**Configuration**
- `OPENAI_API_KEY` environment variable for OpenAI TTS activation
- `useOpenAI` parameter for explicit engine selection
- `openaiVoice` parameter for voice selection (alloy, echo, fable, onyx, nova, shimmer)
- `openaiModel` parameter for quality selection (tts-1, tts-1-hd)
- `openaiSpeed` parameter for speed control (0.25-4.0)

**Enhanced**
- Tool description now includes hybrid architecture information
- Response messages show selected engine and voice information
- Comprehensive error handling with graceful degradation
- Improved logging with engine status and performance metrics

**Dependencies**
- Added `openai` ^4.0.0 for OpenAI TTS API integration
- Maintained backward compatibility with existing platform-only setups

### 🔄 Architecture Changes
- **VoiceEngineSelector**: New hybrid engine management class
- **OpenAIVoiceEngine**: Dedicated OpenAI TTS implementation
- **NexusVoiceHybrid**: Enhanced main engine with dual capabilities
- **Graceful Fallback**: Automatic engine switching on failures

### 📈 Performance
- Non-blocking synthesis for both engines
- Background audio playback
- Intelligent file cleanup
- Error resilience with platform backup

## [1.0.1] - 2025-08-18

### Added
- **macOS Voice Name Easter Egg**: Direct voice name specification (e.g., "Fred", "Krzysztof")
- Enhanced voice command generation with exact name support
- Backward compatibility with language code system

### Enhanced
- Voice discovery algorithm improvements
- Better error handling for voice name resolution
- Updated documentation with Easter Egg examples

## [1.0.0] - 2025-08-17

### 🎉 Initial Release

**Core Features**
- **Language-Centric Architecture**: AI selects language → System optimizes voice
- **Cross-Platform Support**: macOS, Windows, Linux with native voice engines
- **Quality-First Algorithm**: GDD v2.3 voice selection with premium preference
- **Zero Configuration**: Immediate deployment with `npx @sylweriusz/mcp-ai-voice`
- **34+ Languages**: Comprehensive multilingual support
- **Asynchronous Processing**: Non-blocking voice synthesis

**Platform Engines**
- **macOS**: `say` command with heritage MacinTalk voices
- **Windows**: PowerShell + SAPI with System.Speech.Synthesis
- **Linux**: espeak with language optimization

**MCP Integration**
- Model Context Protocol v0.6.0 compliance
- Dynamic tool schema with discovered languages
- Claude Desktop integration with stdio transport
- Comprehensive error handling with McpError

**Voice Intelligence**
- Cross-platform voice discovery
- Quality detection (Premium, Enhanced, Standard)
- Gender preference (masculine default for Claude)
- Language mapping with best/alternative voices

**Documentation**
- Comprehensive README with usage examples
- Heritage voice documentation (EMOTIONAL_VOICE_GUIDE.md)
- Smithery MCP registry configuration
- NPM package deployment ready

---

### Migration Guides

#### From 1.0.x to 1.1.0
- **Backward Compatible**: Existing configurations continue to work
- **Optional OpenAI**: Add `OPENAI_API_KEY` to enable hybrid mode
- **New Parameters**: Use `useOpenAI`, `openaiVoice`, etc. for enhanced control
- **No Breaking Changes**: All existing functionality preserved

#### Environment Setup for 1.1.0
```bash
# Optional: Enable OpenAI TTS
export OPENAI_API_KEY=sk-your-api-key-here

# Existing installations work without changes
npx @sylweriusz/mcp-ai-voice
```
