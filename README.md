# AI Voice

Give AI a voice that works immediately. One command, zero configuration, speaks in multiple languages using your system's built-in voice engine.

## Quick Start

```bash
npx @sylweriusz/mcp-ai-voice
```

Add to Claude Desktop (`~/.claude/mcp_config.json`):

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

That's it. AI can now speak.

## What It Does

- **Speaks text immediately** - AI calls `say()`, text gets spoken, AI continues working
- **Automatic language support** - Discovers available voices on startup, picks the best one per language
- **Zero setup** - Uses your system's built-in voice (macOS `say`, Windows SAPI, Linux `espeak`)
- **Works everywhere** - macOS, Windows, Linux. No external dependencies.

## Usage Examples

```javascript
// Basic usage
say("Processing complete")

// Language-specific (automatically picks best voice)
say("Hello world", language="en")
say("Witaj świecie", language="pl") 
say("Hola mundo", language="es")
```

## How It Works

The system automatically discovers what languages your computer can speak when it starts up. When AI wants to say something, it picks the best available voice for that language. On macOS this means Enhanced/Premium voices, on Windows it uses SAPI optimization, on Linux it uses language-specific espeak voices.

## Platform Support

| Platform | Voice Engine | What You Get |
|----------|--------------|--------------|
| macOS    | `say` command | Enhanced/Premium voices when available |
| Windows  | SAPI | Culture-aware voice selection |
| Linux    | `espeak` | Direct language parameter support |

## Requirements

- Node.js 18+
- Any supported OS (macOS/Windows/Linux)
- System voice engine (comes with the OS)

## Development

```bash
npm install
npm run build
npm start
```

## License

MIT - Use it for whatever you want.

---

**Philosophy**: AI needs to express itself vocally sometimes. This makes that happen without hassle.