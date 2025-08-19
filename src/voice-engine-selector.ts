/**
 * Voice Engine Selector - Hybrid Architecture
 * Automatically selects between Platform Voice Engine and OpenAI Voice Engine
 * based on configuration and availability
 */

import { VoiceIntelligence } from './voice-intelligence.js';
import { OpenAIVoiceEngine, OpenAIVoiceOptions, OpenAIVoiceResponse, OPENAI_VOICES, EchoOptions as OpenAIEchoOptions, CLAUDE_SIGNATURE_ECHO } from './openai-voice-engine.js';

export interface EchoOptions {
  delay?: number;     // ms delay (default: CLAUDE_SIGNATURE_ECHO.delay)
  volume?: number | number[];    // echo volume 0-1 (default: CLAUDE_SIGNATURE_ECHO.volume) - można podać tablicę dla każdego echa
  repeats?: number;   // liczba powtórzeń (default: CLAUDE_SIGNATURE_ECHO.repeats)
}

export interface HybridVoiceOptions {
  // Traditional system options
  language?: string;
  
  // Echo effect options
  echo?: boolean | EchoOptions;
  
  // OpenAI-specific options
  useOpenAI?: boolean;
  openaiVoice?: keyof typeof OPENAI_VOICES;
  openaiModel?: 'tts-1' | 'tts-1-hd';
  openaiFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
  openaiSpeed?: number;
}

export interface VoiceEngineResponse {
  engine: 'platform' | 'openai';
  success: boolean;
  voiceInfo: string;
  error?: string;
  openaiDetails?: OpenAIVoiceResponse;
  duration?: number;
}

export class VoiceEngineSelector {
  private voiceIntelligence: VoiceIntelligence;
  private openaiEngine: OpenAIVoiceEngine;
  private preferOpenAI: boolean = false;
  private fallbackEnabled: boolean = true;

  constructor() {
    // Initialize traditional platform engine
    this.voiceIntelligence = new VoiceIntelligence();
    
    // Initialize OpenAI engine (will be unavailable if no API key)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiEngine = new OpenAIVoiceEngine(openaiApiKey);
    
    // Set preference based on OpenAI availability
    this.preferOpenAI = this.openaiEngine.isEngineAvailable();
  }

  /**
   * Initialize voice intelligence system
   */
  async initialize(): Promise<void> {
    await this.voiceIntelligence.initialize();
    
    // Cleanup old OpenAI files on startup
    if (this.openaiEngine.isEngineAvailable()) {
      this.openaiEngine.cleanupOldFiles(24);
    }
  }

  /**
   * Check if OpenAI engine is available
   */
  isOpenAIAvailable(): boolean {
    return this.openaiEngine.isEngineAvailable();
  }

  /**
   * Get supported languages (combines both engines)
   */
  getSupportedLanguages(): string[] {
    const platformLanguages = this.voiceIntelligence.getSupportedLanguages();
    
    if (this.isOpenAIAvailable()) {
      // OpenAI voices as pseudo-languages for selection
      const openaiVoices = this.openaiEngine.getAvailableVoices();
      return [...platformLanguages, ...openaiVoices];
    }
    
    return platformLanguages;
  }

  /**
   * Get enhanced tool schema with OpenAI options
   */
  getEnhancedToolSchema(): any {
    const supportedLanguages = this.voiceIntelligence.getSupportedLanguages();
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

    // Traditional language parameter
    if (hasLanguages) {
      toolSchema.properties.language = {
        type: 'string',
        enum: supportedLanguages,
        description: 'Language for platform voice selection. System automatically selects the best voice for the chosen language. 🎭 Easter egg: On macOS, you can also specify exact voice names (e.g., "Fred", "Krzysztof", "Samantha") instead of language codes.'
      };
    }

    // Echo effect parameter
    toolSchema.properties.echo = {
      type: 'boolean',
      description: `🔊 Add echo effect to voice synthesis. Creates atmospheric depth with audio delay and volume decay. Default: Optimized Claude Signature Echo (${CLAUDE_SIGNATURE_ECHO.delay}ms delay, natural fade).`,
      default: true
    };

    // OpenAI-specific parameters (only if OpenAI is available)
    if (this.isOpenAIAvailable()) {
      toolSchema.properties.useOpenAI = {
        type: 'boolean',
        description: '🌩️ Use OpenAI TTS engine for premium cloud-based voice synthesis. Higher quality but requires API usage.',
        default: true
      };

      toolSchema.properties.openaiVoice = {
        type: 'string',
        enum: this.openaiEngine.getAvailableVoices(),
        description: '🎭 OpenAI voice selection: alloy (balanced), echo (male), fable (expressive), onyx (deep male), nova (warm female), shimmer (bright female)',
        default: 'nova'
      };

      toolSchema.properties.openaiModel = {
        type: 'string',
        enum: this.openaiEngine.getAvailableModels(),
        description: '⚡ OpenAI model: tts-1 (faster, standard quality) or tts-1-hd (slower, higher quality)',
        default: 'tts-1'
      };

      toolSchema.properties.openaiSpeed = {
        type: 'number',
        minimum: 0.25,
        maximum: 4.0,
        description: '🚀 Speech speed multiplier (0.25x to 4.0x). 1.0 is normal speed.',
        default: 1.0
      };
    }

    return toolSchema;
  }

  /**
   * Determine which engine to use based on options
   */
  private selectEngine(options: HybridVoiceOptions): 'platform' | 'openai' {
    // Explicit OpenAI request
    if (options.useOpenAI === true && this.isOpenAIAvailable()) {
      return 'openai';
    }
    
    // Explicit platform request
    if (options.useOpenAI === false) {
      return 'platform';
    }
    
    // Auto-selection: prefer OpenAI if available
    if (this.preferOpenAI && this.isOpenAIAvailable()) {
      return 'openai';
    }
    
    return 'platform';
  }

  /**
   * Synthesize voice with hybrid engine selection
   */
  async synthesizeVoice(text: string, options: HybridVoiceOptions = {}): Promise<VoiceEngineResponse> {
    const startTime = Date.now();
    const selectedEngine = this.selectEngine(options);

    try {
      if (selectedEngine === 'openai') {
        return await this.synthesizeWithOpenAI(text, options, startTime);
      } else {
        return await this.synthesizeWithPlatform(text, options, startTime);
      }
    } catch (error) {
      // Fallback logic: if OpenAI fails and fallback is enabled, try platform
      if (selectedEngine === 'openai' && this.fallbackEnabled) {
        return await this.synthesizeWithPlatform(text, options, startTime, error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Synthesize using OpenAI engine
   */
  private async synthesizeWithOpenAI(
    text: string, 
    options: HybridVoiceOptions, 
    startTime: number
  ): Promise<VoiceEngineResponse> {
    
    const openaiOptions: OpenAIVoiceOptions = {
      voice: options.openaiVoice,
      model: options.openaiModel,
      speed: options.openaiSpeed,
      echo: options.echo,
    };

    const response = await this.openaiEngine.synthesizeVoice(text, openaiOptions);
    const duration = Date.now() - startTime;

    return {
      engine: 'openai',
      success: response.success,
      voiceInfo: this.openaiEngine.getVoiceInfo(response.voiceUsed),
      openaiDetails: response,
      duration,
      error: response.error,
    };
  }

  /**
   * Synthesize using platform engine
   */
  private async synthesizeWithPlatform(
    text: string, 
    options: HybridVoiceOptions, 
    startTime: number,
    fallbackError?: Error
  ): Promise<VoiceEngineResponse> {
    const command = this.voiceIntelligence.getVoiceCommand(text, options.language);
    const voiceInfo = this.voiceIntelligence.getUsedVoiceInfo(options.language);

    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      exec(command, (error: any, stdout: any, stderr: any) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          reject(new Error(`Platform synthesis failed: ${error.message}`));
          return;
        }
        
        resolve({
          engine: 'platform',
          success: true,
          voiceInfo,
          duration,
          error: fallbackError ? `Fallback after OpenAI error: ${fallbackError.message}` : undefined,
        });
      });
    });
  }

  /**
   * Get information about voice that will be used
   */
  getUsedVoiceInfo(options: HybridVoiceOptions = {}): string {
    const selectedEngine = this.selectEngine(options);

    if (selectedEngine === 'openai') {
      const voice = options.openaiVoice || 'nova';
      return `OpenAI ${this.openaiEngine.getVoiceInfo(voice)}`;
    } else {
      return `Platform ${this.voiceIntelligence.getUsedVoiceInfo(options.language)}`;
    }
  }

  /**
   * Get engine status for diagnostics
   */
  getEngineStatus(): { platform: boolean; openai: boolean; preferred: string } {
    return {
      platform: true, // Platform engine is always available
      openai: this.isOpenAIAvailable(),
      preferred: this.preferOpenAI ? 'openai' : 'platform',
    };
  }

  /**
   * Enable/disable fallback behavior
   */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
  }
}
