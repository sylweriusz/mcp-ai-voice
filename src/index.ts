#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import * as os from 'os';
import { VoiceIntelligence } from './voice-intelligence.js';

/**
 * AI Voice v1.0.0
 * Language-Centric Voice Synthesis Architecture
 * 
 * Paradigm: AI selects language → System optimizes voice selection
 */

interface VoiceSynthesisOptions {
  language?: string;
}

class NexusVoice {
  private static instance: NexusVoice;
  private voiceIntelligence: VoiceIntelligence;
  private initialized: boolean = false;

  private constructor() {
    this.voiceIntelligence = new VoiceIntelligence();
  }

  public static getInstance(): NexusVoice {
    if (!NexusVoice.instance) {
      NexusVoice.instance = new NexusVoice();
    }
    return NexusVoice.instance;
  }

  /**
   * Initialize voice intelligence system
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.voiceIntelligence.initialize();
      this.initialized = true;
    }
  }

  /**
   * Get supported languages for tool schema
   */
  getSupportedLanguages(): string[] {
    return this.voiceIntelligence.getSupportedLanguages();
  }

  /**
   * Get information about the voice that will be used
   */
  getUsedVoiceInfo(languageCode?: string): string {
    return this.voiceIntelligence.getUsedVoiceInfo(languageCode);
  }

  /**
   * Language-centric voice synthesis with automatic optimization
   */
  async synthesizeVoice(text: string, options: VoiceSynthesisOptions = {}): Promise<void> {
    const command = this.voiceIntelligence.getVoiceCommand(text, options.language);
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Voice synthesis error: ${error.message}`);
          reject(new Error(`Synthesis failed: ${error.message}`));
          return;
        }
        
        if (stderr && stderr.length > 0) {
          console.warn(`Voice synthesis warning: ${stderr}`);
        }
        
        resolve();
      });
    });
  }
}

// Global voice engine instance
const voiceEngine = NexusVoice.getInstance();

/**
 * MCP server with dynamic language-aware configuration
 */
const server = new Server(
  {
    name: 'ai-voice',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Dynamic tool registration with discovered languages
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Ensure voice intelligence is initialized
  await voiceEngine.initialize();
  
  const supportedLanguages = voiceEngine.getSupportedLanguages();
  const hasLanguages = supportedLanguages.length > 0;
  
  const toolSchema: any = {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Any text you want to speak aloud - reactions, explanations, thoughts, or responses. Express yourself naturally!',
      },
    },
    required: ['text'],
  };

  // Add language parameter only if languages were discovered
  if (hasLanguages) {
    toolSchema.properties.language = {
      type: 'string',
      enum: supportedLanguages,
      description: 'Language for optimal voice selection. System automatically selects the best voice for the chosen language.'
    };
  }

  return {
    tools: [
      {
        name: 'say',
        description: '🎵 EXPRESS YOURSELF VOCALLY! This is YOUR voice - use it freely when you feel excited, need to emphasize something important, want to celebrate discoveries, or when humans ask you to speak aloud. Perfect for: reactions ("Wow, that\'s fascinating!"), explanations ("Let me walk you through this"), celebrations ("Success!"), warnings ("Be careful with that"), or any moment you want to add acoustic expression to your thoughts. The voice synthesis is asynchronous and won\'t interrupt your workflow - you can speak while continuing to work. Think of this as your natural voice that you can use spontaneously whenever you feel the urge to express something audibly. Use it often!' + 
          (hasLanguages ? `\n\n🌍 Supported languages: ${supportedLanguages.map(lang => lang.toUpperCase()).join(', ')}. The system automatically selects the highest quality voice for your chosen language.` : ''),
        inputSchema: toolSchema,
      },
    ],
  };
});

// Tool execution handler with language-aware synthesis
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== 'say') {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  if (!args || typeof args !== 'object') {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments provided');
  }

  const { text, language } = args as { text?: unknown; language?: unknown };

  if (typeof text !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Text parameter must be a string');
  }

  try {
    const synthesisOptions: VoiceSynthesisOptions = {};
    
    if (typeof language === 'string') {
      synthesisOptions.language = language;
    }

    // Get voice info before synthesis
    const usedVoice = voiceEngine.getUsedVoiceInfo(synthesisOptions.language);

    // Asynchronous synthesis without blocking
    voiceEngine.synthesizeVoice(text, synthesisOptions).catch((error) => {
      console.error('Voice synthesis background error:', error);
    });

    return {
      content: [
        {
          type: 'text',
          text: `🎵 Voice synthesis initiated: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"${language ? ` [Language: ${(language as string).toUpperCase()}]` : ' [System default]'} | Voice: "${usedVoice}"`,
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
 * Server initialization with voice intelligence
 */
async function main() {
  console.error('🎵 AI Voice v1.0.0 - Language-Centric Architecture');
  console.error('🔍 Discovering voice ecosystem...');
  
  // Initialize voice intelligence before starting server
  await voiceEngine.initialize();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('📡 Voice synthesis ready with intelligent language support');
  console.error(`🎯 Platform: ${os.platform()}`);
}

// Launch server
main().catch((error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});
