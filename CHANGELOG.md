# Changelog

All notable changes to MCP Nexus Voice will be documented in this file.

## [1.0.1] - 2025-05-24

### Added
- **Easter Egg**: macOS voice name support - specify exact voice names (e.g., "Fred", "Krzysztof", "Trinoids") instead of language codes
- Voice name detection for strings longer than 2 characters on macOS platform
- "Easter Egg" status indicator in voice info responses when specific voice names are used
- Enhanced tool description hinting at macOS voice name capability

### Changed
- Improved voice selection logic to handle both language codes and specific voice names
- Enhanced error handling for voice name fallback scenarios

### Technical Details
- Added `isVoiceName()` method for detecting voice names vs language codes
- Added `findVoiceByName()` method for exact voice matching
- Updated `getVoiceCommand()` and `getUsedVoiceInfo()` methods to support easter egg functionality
- Maintained full backward compatibility with existing language code system

## [1.0.0] - 2025-05-24

### Added
- Initial release with language-centric voice synthesis architecture
- Cross-platform support (macOS, Windows, Linux)
- Intelligent voice selection with quality prioritization
- MCP protocol compliance for AI integration
- Zero-configuration deployment via NPX
- Support for 34+ languages with automatic voice optimization
- Asynchronous voice synthesis without blocking AI workflow

### Features
- Language-first design with automatic platform-optimized voice selection
- Black box simplicity - `npx mcp-nexus-voice` deployment
- CPU-only operation for universal compatibility
- System voice integration (macOS `say`, Windows SAPI, Linux `espeak`)
- Dynamic tool schema generation with discovered languages
- Masculine voice preference for consistency

### Technical Architecture
- TypeScript implementation with comprehensive type safety
- Voice Intelligence module with cross-platform abstraction
- Platform-specific optimization layers
- Quality assessment algorithm (Enhanced > Premium > Standard)
- Graceful fallback mechanisms
- Secure text sanitization for voice synthesis