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

// Claude Signature Echo - Centralna konfiguracja
export const CLAUDE_SIGNATURE_ECHO = {
    delay: 110,      // ms - optimized for natural cathedral-like acoustics
    volume: [0.3, 0.1, 0.03, 0.01],  // progressive volume decay
    repeats: 4      // number of echo repeats
};

export interface EchoOptions {
  delay?: number;     // ms delay (default: CLAUDE_SIGNATURE_ECHO.delay)
  volume?: number | number[];    // echo volume 0-1 (default: CLAUDE_SIGNATURE_ECHO.volume)
  repeats?: number;   // liczba powtórzeń (default: CLAUDE_SIGNATURE_ECHO.repeats)
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
      } catch (error) {
        this.isAvailable = false;
      }
    } else {
      this.isAvailable = false;
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
    
    // Claude Signature Echo settings (domyślne) - używa centralnej konfiguracji
    let echo: EchoOptions = {
      delay: CLAUDE_SIGNATURE_ECHO.delay,
      volume: CLAUDE_SIGNATURE_ECHO.volume,
      repeats: CLAUDE_SIGNATURE_ECHO.repeats
    };
    
    if (typeof echoOptions === 'object' && echoOptions !== null) {
      echo = {
        delay: echoOptions.delay || CLAUDE_SIGNATURE_ECHO.delay,
        volume: echoOptions.volume || CLAUDE_SIGNATURE_ECHO.volume,
        repeats: echoOptions.repeats || CLAUDE_SIGNATURE_ECHO.repeats
      };
    }

    let command: string;

    switch (platform) {
      case 'darwin':
        if (enableEcho) {
          // macOS: Use afplay with Claude Signature Echo
          command = this.createMacOSEchoCommand(filePath, echo);
        } else {
          // macOS: Standard afplay (only if explicitly disabled)
          command = `afplay "${filePath}"`;
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
        return;
    }

    // Execute in background silently
    exec(command, (error: any, stdout: any, stderr: any) => {
      // Silent execution - no logging
    });
  }

  /**
   * Create macOS echo command with parallel afplay processes
   * Uses centralized Claude Signature Echo configuration
   */
  private createMacOSEchoCommand(filePath: string, echo: EchoOptions): string {
    const commands: string[] = [];
    
    // Używa centralnej konfiguracji jako fallback
    const delay = echo.delay || CLAUDE_SIGNATURE_ECHO.delay;
    const volume = echo.volume || CLAUDE_SIGNATURE_ECHO.volume;
    const repeats = echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats; echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats; echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats;
    
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
        // Use progressive decay as before (volume is number type here)
        echoVolume = Math.max(0.1, (volume as number) / i);
      }
      
      const echoCommand = `sleep ${echoDelay}; afplay "${filePath}" -v ${echoVolume}`;
      commands.push(echoCommand);
    }
    
    // Execute all commands in background with simpler approach
    const finalCommand = commands.map(cmd => `(${cmd}) &`).join(' ');
    return finalCommand;
  }

  /**
   * Create Windows echo command with parallel PowerShell processes
   * Uses centralized Claude Signature Echo configuration
   */
  private createWindowsEchoCommand(filePath: string, echo: EchoOptions): string {
    const delay = echo.delay || CLAUDE_SIGNATURE_ECHO.delay;
    const volume = echo.volume || CLAUDE_SIGNATURE_ECHO.volume;
    const repeats = echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats; echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats;
    
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
    }
    
    // Execute all commands in background processes
    const parallelCommands = commands.map((cmd, i) => 
      i === 0 ? cmd : `Start-Job -ScriptBlock {${cmd}}`
    ).join('; ');
    
    const finalCommand = `powershell -WindowStyle Hidden -Command "${parallelCommands}; Get-Job | Wait-Job | Remove-Job"`;
    return finalCommand;
  }

  /**
   * Create Linux echo command with parallel audio players
   * Uses centralized Claude Signature Echo configuration
   */
  private createLinuxEchoCommand(filePath: string, echo: EchoOptions): string {
    const delay = echo.delay || CLAUDE_SIGNATURE_ECHO.delay;
    const volume = echo.volume || CLAUDE_SIGNATURE_ECHO.volume;
    const repeats = echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats; echo.repeats || CLAUDE_SIGNATURE_ECHO.repeats;
    
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
    }
    
    // Execute all commands in background with parallel execution
    const finalCommand = commands.map(cmd => `(${cmd}) &`).join(' ') + ' wait';
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

      // Silent cleanup - no logging
    } catch (error) {
      // Silent error handling
    }
  }
}
