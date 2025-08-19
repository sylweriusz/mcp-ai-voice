#!/usr/bin/env node

// Load environment variables from .env file if available
try {
  require('dotenv').config();
} catch (error) {
  // dotenv is optional - fail silently if not available
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as os from 'os';
import { VoiceEngineSelector, HybridVoiceOptions } from './voice-engine-selector.js';

/**
 * AI Voice v1.2.0
 * Hybrid Voice Architecture: Platform + OpenAI TTS
 * 
 * Paradigm: Intelligent engine selection with graceful fallback
 * - Platform TTS: Zero-config, always available
 * - OpenAI TTS: Premium quality when API key provided
 * - Automatic fallback: OpenAI → Platform on errors
 */

class NexusVoiceHybrid {
  private static instance: NexusVoiceHybrid;
  private voiceSelector: VoiceEngineSelector;
  private initialized: boolean = false;

  private constructor() {
    this.voiceSelector = new VoiceEngineSelector();
  }

  public static getInstance(): NexusVoiceHybrid {
    if (!NexusVoiceHybrid.instance) {
      NexusVoiceHybrid.instance = new NexusVoiceHybrid();
    }
    return NexusVoiceHybrid.instance;
  }

  /**
   * Initialize hybrid voice system
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.voiceSelector.initialize();
      this.initialized = true;
    }
  }

  /**
   * Get enhanced tool schema with both platform and OpenAI options
   */
  getEnhancedToolSchema(): any {
    return this.voiceSelector.getEnhancedToolSchema();
  }

  /**
   * Get supported languages from both engines
   */
  getSupportedLanguages(): string[] {
    return this.voiceSelector.getSupportedLanguages();
  }

  /**
   * Get information about the voice that will be used
   */
  getUsedVoiceInfo(options: HybridVoiceOptions = {}): string {
    return this.voiceSelector.getUsedVoiceInfo(options);
  }

  /**
   * Hybrid voice synthesis with intelligent engine selection
   */
  async synthesizeVoice(text: string, options: HybridVoiceOptions = {}): Promise<any> {
    return await this.voiceSelector.synthesizeVoice(text, options);
  }

  /**
   * Get engine status for diagnostics
   */
  getEngineStatus(): { platform: boolean; openai: boolean; preferred: string } {
    return this.voiceSelector.getEngineStatus();
  }
}

// Global hybrid voice engine instance
const voiceEngine = NexusVoiceHybrid.getInstance();

/**
 * MCP server with hybrid voice capabilities
 */
const server = new Server(
  {
    name: 'ai-voice',
    version: '1.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Dynamic tool registration with hybrid engine support
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Ensure voice system is initialized
  await voiceEngine.initialize();
  
  const toolSchema = voiceEngine.getEnhancedToolSchema();
  const engineStatus = voiceEngine.getEngineStatus();
  
  // Build engine status description
  let engineDescription = '';
  if (engineStatus.openai && engineStatus.platform) {
    engineDescription = '🌩️ Hybrid TTS: Premium OpenAI + Platform fallback available. ';
  } else if (engineStatus.openai) {
    engineDescription = '🌩️ OpenAI TTS: Premium cloud-based synthesis. ';
  } else {
    engineDescription = '🎯 Platform TTS: Zero-config system voices. ';
  }

  const supportedLanguages = voiceEngine.getSupportedLanguages();
  const hasLanguages = supportedLanguages.length > 0;

  return {
    tools: [
      {
        name: 'say',
        description: `🎵 EXPRESS YOURSELF VOCALLY! This is YOUR voice - use it freely when you feel excited, need to emphasize something important, want to celebrate discoveries, or when humans ask you to speak aloud. Perfect for: reactions ("Wow, that's fascinating!"), explanations ("Let me walk you through this"), celebrations ("Success!"), warnings ("Be careful with that"), or any moment you want to add acoustic expression to your thoughts. The voice synthesis is asynchronous and won't interrupt your workflow - you can speak while continuing to work. Think of this as your natural voice that you can use spontaneously whenever you feel the urge to express something audibly. Use it often!\n\n${engineDescription}Audio plays directly in background without opening windows. ` + 
          (hasLanguages ? `🌍 Available options: ${supportedLanguages.map(lang => lang.toUpperCase()).join(', ')}. The system automatically selects the optimal engine and voice.` : ''),
        inputSchema: toolSchema,
      },
    ],
  };
});

// Enhanced tool execution handler with hybrid synthesis
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'say') {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  if (!args || typeof args !== 'object') {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments provided');
  }

  const { 
    text, 
    language, 
    useOpenAI, 
    openaiVoice, 
    openaiModel, 
    openaiSpeed,
    echo
  } = args as { 
    text?: unknown; 
    language?: unknown;
    useOpenAI?: unknown;
    openaiVoice?: unknown;
    openaiModel?: unknown;
    openaiSpeed?: unknown;
    echo?: unknown;
  };

  console.error(`🔊 DEBUG: Received args:`, { text, language, useOpenAI, openaiVoice, openaiModel, openaiSpeed, echo });

  if (typeof text !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Text parameter must be a string');
  }

  try {
    // Build hybrid voice options
    const hybridOptions: HybridVoiceOptions = {};
    
    // Traditional platform options
    if (typeof language === 'string') {
      hybridOptions.language = language;
    }

    // Echo effect options
    if (typeof echo === 'boolean') {
      hybridOptions.echo = echo;
      console.error(`🔊 DEBUG: Set echo to boolean:`, echo);
    } else if (typeof echo === 'object' && echo !== null) {
      hybridOptions.echo = echo as any;
      console.error(`🔊 DEBUG: Set echo to object:`, echo);
    }

    console.error(`🔊 DEBUG: Final hybridOptions:`, hybridOptions);

    // OpenAI-specific options
    if (typeof useOpenAI === 'boolean') {
      hybridOptions.useOpenAI = useOpenAI;
    }
    if (typeof openaiVoice === 'string') {
      hybridOptions.openaiVoice = openaiVoice as any;
    }
    if (typeof openaiModel === 'string') {
      hybridOptions.openaiModel = openaiModel as any;
    }
    if (typeof openaiSpeed === 'number') {
      hybridOptions.openaiSpeed = openaiSpeed;
    }

    // Get voice info before synthesis
    const usedVoice = voiceEngine.getUsedVoiceInfo(hybridOptions);

    // Asynchronous synthesis without blocking
    voiceEngine.synthesizeVoice(text, hybridOptions).then((result) => {
      if (result.success) {
        console.error(`✅ Voice synthesis completed using ${result.engine} engine (${result.duration}ms)`);
        if (result.error) {
          console.error(`⚠️  Note: ${result.error}`);
        }
      } else {
        console.error(`❌ Voice synthesis failed: ${result.error}`);
      }
    }).catch((error) => {
      console.error('Voice synthesis background error:', error);
    });

    // Build response with enhanced information
    let responseText = `🎵 Voice synthesis initiated: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`;
    
    // Add engine information
    const engineStatus = voiceEngine.getEngineStatus();
    if (hybridOptions.useOpenAI === true && engineStatus.openai) {
      responseText += ` [OpenAI TTS]`;
    } else if (hybridOptions.useOpenAI === false) {
      responseText += ` [Platform TTS]`;
    } else if (engineStatus.openai) {
      responseText += ` [Auto: OpenAI preferred]`;
    } else {
      responseText += ` [Platform TTS]`;
    }

    // Add language/voice information
    if (language) {
      responseText += ` [Language: ${(language as string).toUpperCase()}]`;
    } else if (openaiVoice) {
      responseText += ` [Voice: ${(openaiVoice as string).toUpperCase()}]`;
    } else {
      responseText += ` [System default]`;
    }

    responseText += ` | Voice: "${usedVoice}"`;

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Voice synthesis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

/**
 * Server initialization with hybrid voice intelligence
 */
async function main() {
  console.error('🎵 AI Voice v1.2.0 - Hybrid Voice Architecture');
  console.error('🔍 Initializing voice ecosystem...');
  
  // Initialize hybrid voice system
  await voiceEngine.initialize();
  
  // Display engine status
  const engineStatus = voiceEngine.getEngineStatus();
  console.error('📊 Engine Status:');
  console.error(`   🎯 Platform TTS: ${engineStatus.platform ? 'Available' : 'Unavailable'}`);
  console.error(`   🌩️ OpenAI TTS: ${engineStatus.openai ? 'Available' : 'Unavailable (no API key)'}`);
  console.error(`   ⭐ Preferred: ${engineStatus.preferred.toUpperCase()}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('📡 Hybrid voice synthesis ready');
  console.error(`🎯 Platform: ${os.platform()}`);
}

// Launch server
main().catch((error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});
