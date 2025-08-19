/**
 * OpenAI TTS Engine for MCP Nexus Voice
 * Provides premium cloud-based voice synthesis using OpenAI's TTS models
 */

import OpenAI from 'openai';
import { APIError } from 'openai/error.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';

// OpenAI TTS voices with their characteristics
export const OPENAI_VOICES = {
  alloy: { gender: 'neutral', description: 'Balanced, versatile voice' },
  echo: { gender: 'male', description: 'Clear, direct masculine voice' },
  fable: { gender: 'neutral', description: 'Expressive, storytelling voice' },
  onyx: { gender: 'male', description: 'Deep, authoritative masculine voice' },
  nova: { gender: 'female', description: 'Warm, engaging feminine voice' },
  shimmer: { gender: 'female', description: 'Bright, energetic feminine voice' },
} as const;

export type OpenAIVoice = keyof typeof OPENAI_VOICES;
export type OpenAIModel = 'tts-1' | 'tts-1-hd';
export type OpenAIFormat = 'mp3' | 'opus' | 'aac' | 'flac';

export interface EchoOptions {
  delay?: number;     // ms delay (default: 60 - Optimized Claude Signature)
  volume?: number | number[];    // echo volume 0-1 (default: [0.3, 0.09, 0.027, 0.0081] - Optimized Claude Signature)
  repeats?: number;   // liczba powtórzeń (default: 4 - Optimized Claude Signature)
}

export interface OpenAIVoiceOptions {
  voice?: OpenAIVoice;
  model?: OpenAIModel;
  response_format?: OpenAIFormat;
  speed?: number; // 0.25 to 4.0
  echo?: boolean | EchoOptions; // Echo effect
}

export interface OpenAIVoiceResponse {
  success: boolean;
  filePath?: string;
  voiceUsed: OpenAIVoice;
  model: OpenAIModel;
  format: OpenAIFormat;
  error?: string;
  duration?: number;
}

export class OpenAIVoiceEngine {
  private openai: OpenAI | null = null;
  private outputDir: string;
  private isAvailable: boolean = false;
  private defaultVoice: OpenAIVoice;
  private defaultModel: OpenAIModel;
  private audioPlayerCommand: string;

  constructor(apiKey?: string) {
    // Output directory setup
    this.outputDir = path.join(os.tmpdir(), 'mcp-nexus-voice-openai');
    
    // Default configurations from environment or fallbacks
    this.defaultVoice = this.getOptimalVoice();
    this.defaultModel = (process.env.DEFAULT_TTS_MODEL as OpenAIModel) || 'tts-1';
    this.audioPlayerCommand = this.getBackgroundAudioCommand();

    // Initialize OpenAI client if API key provided
    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.openai = new OpenAI({ apiKey });
        this.isAvailable = true;
        console.error(`🌩️ OpenAI TTS Engine initialized with key: ${apiKey.substring(0, 8)}...`);
      } catch (error) {
        console.error('🚫 OpenAI TTS Engine initialization failed:', error);
        this.isAvailable = false;
      }
    } else {
      this.isAvailable = false;
      console.error('🔑 No OpenAI API key provided - OpenAI TTS unavailable');
    }
  }

  /**
   * Check if OpenAI TTS is available
   */
  public isEngineAvailable(): boolean {
    return this.isAvailable && this.openai !== null;
  }

  /**
   * Get optimal voice based on Claude's characteristics and environment config
   */
  private getOptimalVoice(): OpenAIVoice {
    // Check environment variable first
    const envVoice = process.env.DEFAULT_TTS_VOICE as OpenAIVoice;
    if (envVoice && Object.keys(OPENAI_VOICES).includes(envVoice)) {
      return envVoice;
    }
    
    // Following existing GDD v2.3 Quality-First algorithm preference for warm, engaging voice
    return 'nova'; // Warm, engaging feminine voice
  }

  /**
   * Get platform-specific background audio command (no UI windows)
   */
  private getBackgroundAudioCommand(): string {
    const platform = os.platform();
    switch (platform) {
      case 'darwin': 
        // Use afplay instead of open - plays audio without opening apps/windows
        return 'afplay';
      case 'win32': 
        // Use PowerShell with WindowStyle Hidden to avoid popup windows
        return 'powershell -WindowStyle Hidden -Command "(New-Object Media.SoundPlayer \'%FILE%\').PlaySync();"';
      case 'linux': 
        // Use aplay (ALSA) or paplay (PulseAudio) for direct audio output
        return 'command -v paplay >/dev/null 2>&1 && paplay || aplay';
      default: 
        return 'afplay'; // Default fallback
    }
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.error(`📁 Created OpenAI TTS output directory: ${this.outputDir}`);
    }
  }

  /**
   * Synthesize speech using OpenAI TTS
   */
  public async synthesizeVoice(
    text: string, 
    options: OpenAIVoiceOptions = {}
  ): Promise<OpenAIVoiceResponse> {
    if (!this.isAvailable || !this.openai) {
      throw new Error('OpenAI TTS Engine is not available (no API key configured)');
    }

    const startTime = Date.now();
    
    // Configuration with defaults from environment
    const voice = options.voice || this.defaultVoice;
    const model = options.model || this.defaultModel;
    const response_format = options.response_format || 'mp3';
    const speed = Math.max(0.25, Math.min(4.0, options.speed || parseFloat(process.env.DEFAULT_TTS_SPEED || '1.0')));

    try {
      this.ensureOutputDirectory();

      console.error(`🌩️ Generating OpenAI TTS with voice: ${voice}, model: ${model}`);

      // Call OpenAI TTS API
      const speechResponse = await this.openai.audio.speech.create({
        model,
        voice,
        input: text,
        response_format,
        speed,
      });

      // Save audio file
      const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
      const timestamp = Date.now();
      const filename = `openai_tts_${timestamp}.${response_format}`;
      const filePath = path.join(this.outputDir, filename);

      fs.writeFileSync(filePath, audioBuffer);
      
      const duration = Date.now() - startTime;
      console.error(`💾 OpenAI audio saved to: ${filePath} (${duration}ms)`);

      // Play audio in background without opening UI windows
      this.playAudioInBackground(filePath, options.echo);

      return {
        success: true,
        filePath,
        voiceUsed: voice,
        model,
        format: response_format,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      let errorMessage = 'Unknown OpenAI TTS error';
      
      if (error instanceof APIError) {
        errorMessage = `OpenAI API Error (${error.status}): ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error(`❌ OpenAI TTS failed: ${errorMessage} (${duration}ms)`);

      return {
        success: false,
        voiceUsed: voice,
        model,
        format: response_format,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Play audio file in background without opening UI windows or interrupting other audio
   */
  private playAudioInBackground(filePath: string, echoOptions?: boolean | EchoOptions): void {
    const platform = os.platform();
    
    // Claude Signature Echo - domyślnie włączone dla OpenAI TTS
    const defaultEnabled = true;
    const enableEcho = echoOptions !== false; // Wyłączone tylko jeśli explicite false
    
    // Claude Signature Echo settings (domyślne) - zoptymalizowane na podstawie acoustics research
    let echo: EchoOptions = { 
      delay: 66, 
      volume: [0.35, 0.15, 0.077, 0.03], 
      repeats: 4 
    };
    
    console.error(`🔊 DEBUG: Echo options received:`, echoOptions);
    console.error(`🔊 DEBUG: Enable echo:`, enableEcho);
    
    if (typeof echoOptions === 'object' && echoOptions !== null) {
      echo = {
        delay: echoOptions.delay || 66,
        volume: echoOptions.volume || [0.35, 0.15, 0.077, 0.03],
        repeats: echoOptions.repeats || 4
      };
      console.error(`🔊 DEBUG: Parsed echo settings:`, echo);
    }

    let command: string;

    switch (platform) {
      case 'darwin':
        if (enableEcho) {
          // macOS: Use afplay with Claude Signature Echo
          command = this.createMacOSEchoCommand(filePath, echo);
          console.error(`🔊 DEBUG: Claude Signature Echo command:`, command);
        } else {
          // macOS: Standard afplay (only if explicitly disabled)
          command = `afplay "${filePath}"`;
          console.error(`🔊 DEBUG: Standard command:`, command);
        }
        break;
      case 'win32':
        // Windows: Use PowerShell with media player and echo support
        if (enableEcho) {
          command = this.createWindowsEchoCommand(filePath, echo);
        } else {
          command = `powershell -WindowStyle Hidden -Command "(New-Object Media.SoundPlayer '${filePath}').PlaySync();"`;
        }
        break;
      case 'linux':
        // Linux: Use PulseAudio/ALSA with echo support
        if (enableEcho) {
          command = this.createLinuxEchoCommand(filePath, echo);
        } else {
          command = `(command -v paplay >/dev/null 2>&1 && paplay "${filePath}") || (command -v aplay >/dev/null 2>&1 && aplay "${filePath}")`;
        }
        break;
      default:
        console.error('🔊 Unsupported platform for background audio playback');
        return;
    }

    // Execute in background with minimal logging
    console.error(`🔊 DEBUG: Executing command: ${command}`);
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`🔊 Background audio playback failed: ${error.message}`);
      }
      if (stderr) {
        console.error(`🔊 Audio stderr: ${stderr}`);
      }
      if (stdout) {
        console.error(`🔊 Audio stdout: ${stdout}`);
      }
      // Success is silent for normal execution
    });
  }

  /**
   * Create macOS echo command with parallel afplay processes
   * Optimized Claude Signature Echo: 60ms delay, [0.3, 0.09, 0.027, 0.0081] volumes, 4 repeats
   */
  private createMacOSEchoCommand(filePath: string, echo: EchoOptions): string {
    const commands: string[] = [];
    
    // Optimized Claude Signature Echo defaults
    const delay = echo.delay || 66;
    const volume = echo.volume || [0.35, 0.15, 0.077, 0.03];
    const repeats = echo.repeats || 4;
    
    console.error(`🔊 DEBUG: Creating Optimized Claude Signature Echo with delay=${delay}ms, volume=${JSON.stringify(volume)}, repeats=${repeats}`);
    
    // Original audio
    commands.push(`afplay "${filePath}"`);
    
    // Echo repeats with custom or calculated volumes
    for (let i = 1; i <= repeats; i++) {
      const echoDelay = (delay * i) / 1000; // Convert ms to seconds
      
      let echoVolume: number;
      if (Array.isArray(volume)) {
        // Use specific volume from array, or last value if array is shorter
        echoVolume = volume[i - 1] || volume[volume.length - 1] || 0.1;
      } else {
        // Use progressive decay as before
        echoVolume = Math.max(0.1, volume / i);
      }
      
      const echoCommand = `sleep ${echoDelay}; afplay "${filePath}" -v ${echoVolume}`;
      commands.push(echoCommand);
      console.error(`🔊 DEBUG: Echo ${i}: delay=${echoDelay}s, volume=${echoVolume}`);
    }
    
    // Execute all commands in background with simpler approach
    const finalCommand = commands.map(cmd => `(${cmd}) &`).join(' ');
    console.error(`🔊 DEBUG: Final Claude Signature command:`, finalCommand);
    return finalCommand;
  }

  /**
   * Create Windows echo command with parallel PowerShell processes
   * Optimized Claude Signature Echo: 60ms delay, progressive volume fade, 4 repeats
   */
  private createWindowsEchoCommand(filePath: string, echo: EchoOptions): string {
    const delay = echo.delay || 66;
    const volume = echo.volume || [0.35, 0.15, 0.077, 0.03];
    const repeats = echo.repeats || 4;
    
    console.error(`🔊 DEBUG: Creating Windows Echo with delay=${delay}ms, volume=${JSON.stringify(volume)}, repeats=${repeats}`);
    
    const commands: string[] = [];
    
    // Generate echo commands with delays and volume adjustments
    for (let i = 0; i <= repeats; i++) {
      const echoDelay = (delay * i) / 1000; // Convert to seconds
      let echoVolume = i === 0 ? 1 : (Array.isArray(volume) ? (volume[i-1] || 0.1) : volume);
      
      if (i === 0) {
        // Original sound
        commands.push(`(New-Object Media.SoundPlayer '${filePath}').PlaySync()`);
      } else {
        // Echo with delay and volume (Windows doesn't support volume control via SoundPlayer easily)
        commands.push(`Start-Sleep -Milliseconds ${delay * i}; (New-Object Media.SoundPlayer '${filePath}').PlaySync()`);
      }
      
      console.error(`🔊 DEBUG: Windows Echo ${i}: delay=${echoDelay}s, volume=${echoVolume}`);
    }
    
    // Execute all commands in background processes
    const parallelCommands = commands.map((cmd, i) => 
      i === 0 ? cmd : `Start-Job -ScriptBlock {${cmd}}`
    ).join('; ');
    
    const finalCommand = `powershell -WindowStyle Hidden -Command "${parallelCommands}; Get-Job | Wait-Job | Remove-Job"`;
    console.error(`🔊 DEBUG: Final Windows command:`, finalCommand);
    return finalCommand;
  }

  /**
   * Create Linux echo command with parallel audio players
   * Optimized Claude Signature Echo: 60ms delay, progressive volume fade, 4 repeats
   */
  private createLinuxEchoCommand(filePath: string, echo: EchoOptions): string {
    const delay = echo.delay || 66;
    const volume = echo.volume || [0.35, 0.15, 0.077, 0.03];
    const repeats = echo.repeats || 4;
    
    console.error(`🔊 DEBUG: Creating Linux Echo with delay=${delay}ms, volume=${JSON.stringify(volume)}, repeats=${repeats}`);
    
    const commands: string[] = [];
    
    // Generate echo commands with delays
    for (let i = 0; i <= repeats; i++) {
      const echoDelay = (delay * i) / 1000; // Convert to seconds
      let echoVolume = i === 0 ? 1 : (Array.isArray(volume) ? (volume[i-1] || 0.1) : volume);
      
      if (i === 0) {
        // Original sound
        commands.push(`(command -v paplay >/dev/null 2>&1 && paplay "${filePath}") || (command -v aplay >/dev/null 2>&1 && aplay "${filePath}")`);
      } else {
        // Echo with delay (Linux audio players don't easily support volume control)
        commands.push(`sleep ${echoDelay} && ((command -v paplay >/dev/null 2>&1 && paplay "${filePath}") || (command -v aplay >/dev/null 2>&1 && aplay "${filePath}"))`);
      }
      
      console.error(`🔊 DEBUG: Linux Echo ${i}: delay=${echoDelay}s, volume=${echoVolume}`);
    }
    
    // Execute all commands in background with parallel execution
    const finalCommand = commands.map(cmd => `(${cmd}) &`).join(' ') + ' wait';
    console.error(`🔊 DEBUG: Final Linux command:`, finalCommand);
    return finalCommand;
  }

  /**
   * Get voice information for display
   */
  public getVoiceInfo(voice?: OpenAIVoice): string {
    const selectedVoice = voice || this.defaultVoice;
    const voiceData = OPENAI_VOICES[selectedVoice];
    return `${selectedVoice} (${voiceData.description})`;
  }

  /**
   * Get all available OpenAI voices
   */
  public getAvailableVoices(): OpenAIVoice[] {
    return Object.keys(OPENAI_VOICES) as OpenAIVoice[];
  }

  /**
   * Get available models
   */
  public getAvailableModels(): OpenAIModel[] {
    return ['tts-1', 'tts-1-hd'];
  }

  /**
   * Clean up old temporary files (cleanup utility)
   */
  public cleanupOldFiles(maxAgeHours?: number): void {
    if (!fs.existsSync(this.outputDir)) return;

    // Use environment variable or parameter or default
    const cleanupHours = maxAgeHours || 
                        parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24');
    const maxAge = cleanupHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();

    try {
      const files = fs.readdirSync(this.outputDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.error(`🧹 Cleaned up ${cleanedCount} old OpenAI TTS files`);
      }
    } catch (error) {
      console.error('🧹 Cleanup error:', error);
    }
  }
}
