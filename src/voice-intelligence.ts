/**
 * Voice Intelligence Module - Language Discovery and Voice Optimization
 * Implements language-centric architecture for automatic voice selection
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  quality?: 'enhanced' | 'premium' | 'standard';
  gender?: 'male' | 'female';
}

export interface LanguageVoiceMapping {
  [languageCode: string]: {
    bestVoice: VoiceInfo;
    alternativeVoices: VoiceInfo[];
  };
}

export class VoiceIntelligence {
  private platform: string;
  private availableVoices: VoiceInfo[] = [];
  private languageMapping: LanguageVoiceMapping = {};
  private supportedLanguages: string[] = [];

  constructor() {
    this.platform = os.platform();
  }

  /**
   * Initialize voice intelligence by discovering available voices and languages
   */
  async initialize(): Promise<void> {
    console.error('🔍 Initializing Voice Intelligence Engine...');
    
    try {
      switch (this.platform) {
        case 'darwin':
          await this.discoverMacOSVoices();
          break;
        case 'win32':
          await this.discoverWindowsVoices();
          break;
        case 'linux':
          await this.discoverLinuxVoices();
          break;
        default:
          console.error(`⚠️ Unsupported platform: ${this.platform}`);
      }

      this.buildLanguageMapping();
      console.error(`✅ Discovered ${this.supportedLanguages.length} languages with ${this.availableVoices.length} voices`);
    } catch (error) {
      console.error('❌ Voice discovery failed:', error);
      // Fallback to default voice without languages
    }
  }

  /**
   * Discover voices on macOS using 'say -v ?'
   */
  private async discoverMacOSVoices(): Promise<void> {
    try {
      const { stdout } = await execAsync('say -v ?');
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        // Parse format: "Name (Quality) Language_Code Comment"
        // Example: "Krzysztof (Enhanced) pl_PL    # Witaj, nazywam się Krzysztof."
        const match = line.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#\s*(.*)$/);
        if (match) {
          const [, voiceNamePart, langCode, comment] = match;
          const languageCode = langCode.split('_')[0]; // Extract language part
          
          // Extract quality from voice name (e.g., "Krzysztof (Enhanced)" -> "Krzysztof", "Enhanced")
          const voiceMatch = voiceNamePart.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
          const voiceId = voiceMatch ? voiceMatch[1].trim() : voiceNamePart.trim();
          const qualityIndicator = voiceMatch ? voiceMatch[2] : null;
          
          const voiceInfo: VoiceInfo = {
            id: voiceNamePart.trim(), // Keep full name for 'say' command
            name: voiceNamePart.trim(),
            language: this.getLanguageName(languageCode),
            languageCode: languageCode,
            quality: this.detectVoiceQuality(qualityIndicator || '', comment),
            gender: this.detectGender(voiceId)
          };

          this.availableVoices.push(voiceInfo);
        }
      }
    } catch (error) {
      console.error('macOS voice discovery error:', error);
    }
  }

  /**
   * Discover voices on Windows using PowerShell
   */
  private async discoverWindowsVoices(): Promise<void> {
    try {
      const script = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.GetInstalledVoices() | ForEach-Object {
          $voice = $_.VoiceInfo
          Write-Output "$($voice.Name)|$($voice.Culture.TwoLetterISOLanguageName)|$($voice.Gender)"
        }
      `;
      
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      const lines = stdout.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const [name, langCode, gender] = line.split('|');
        if (name && langCode) {
          const voiceInfo: VoiceInfo = {
            id: name,
            name: name,
            language: this.getLanguageName(langCode),
            languageCode: langCode,
            quality: 'standard',
            gender: gender?.toLowerCase() as 'male' | 'female'
          };

          this.availableVoices.push(voiceInfo);
        }
      }
    } catch (error) {
      console.error('Windows voice discovery error:', error);
    }
  }

  /**
   * Discover voices on Linux using espeak
   */
  private async discoverLinuxVoices(): Promise<void> {
    try {
      const { stdout } = await execAsync('espeak --voices');
      const lines = stdout.split('\n').slice(1).filter(line => line.trim()); // Skip header

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const langCode = parts[1].split('-')[0]; // Extract base language
          
          const voiceInfo: VoiceInfo = {
            id: parts[1],
            name: parts[1],
            language: this.getLanguageName(langCode),
            languageCode: langCode,
            quality: 'standard',
            gender: parts[2]?.includes('F') ? 'female' : 'male'
          };

          this.availableVoices.push(voiceInfo);
        }
      }
    } catch (error) {
      console.error('Linux voice discovery error:', error);
    }
  }

  /**
   * Build language to voice mapping with quality-first selection
   * GDD v2.3: Premium > Enhanced > Standard, with gender preference only within same quality tier
   */
  private buildLanguageMapping(): void {
    const languageGroups: { [lang: string]: VoiceInfo[] } = {};

    // Group voices by language
    for (const voice of this.availableVoices) {
      if (!languageGroups[voice.languageCode]) {
        languageGroups[voice.languageCode] = [];
      }
      languageGroups[voice.languageCode].push(voice);
    }

    // Select best voice for each language using quality-first algorithm
    for (const [langCode, voices] of Object.entries(languageGroups)) {
      // GDD v2.3: Quality-first sorting with gender preference as tiebreaker
      const sortedVoices = voices.sort((a, b) => {
        const qualityOrder = { premium: 3, enhanced: 2, standard: 1 };
        const aQuality = qualityOrder[a.quality || 'standard'];
        const bQuality = qualityOrder[b.quality || 'standard'];
        
        // Primary: Quality wins everything
        if (aQuality !== bQuality) return bQuality - aQuality;
        
        // Secondary: Within same quality, prefer male voices (Claude is masculine)
        if (a.gender === 'male' && b.gender !== 'male') return -1;
        if (a.gender !== 'male' && b.gender === 'male') return 1;
        
        return 0;
      });

      // Special case for English: Always ensure we have a voice (fallback to first available)
      if (langCode === 'en' && sortedVoices.length === 0) {
        // This shouldn't happen but provides safety net
        console.error('⚠️ No English voices found - system misconfiguration');
      }

      this.languageMapping[langCode] = {
        bestVoice: sortedVoices[0],
        alternativeVoices: sortedVoices.slice(1)
      };

      this.supportedLanguages.push(langCode);
    }
  }

  /**
   * Detect voice quality from quality indicator or comment
   */
  private detectVoiceQuality(qualityIndicator: string, comment: string): 'enhanced' | 'premium' | 'standard' {
    const combined = `${qualityIndicator} ${comment}`.toLowerCase();
    if (combined.includes('enhanced') || combined.includes('neural')) return 'enhanced';
    if (combined.includes('premium') || combined.includes('high quality')) return 'premium';
    return 'standard';
  }

  /**
   * Detect gender from voice name
   */
  private detectGender(voiceId: string): 'male' | 'female' {
    const maleNames = ['daniel', 'alex', 'fred', 'bruce', 'krzysztof', 'marek', 'thomas', 'oliver', 'luca', 'diego'];
    const femaleNames = ['samantha', 'victoria', 'karen', 'zofia', 'ewa', 'amelie', 'anna', 'elena', 'alice'];
    
    const lowerName = voiceId.toLowerCase();
    if (maleNames.some(name => lowerName.includes(name))) return 'male';
    if (femaleNames.some(name => lowerName.includes(name))) return 'female';
    
    // Default to male for consistency
    return 'male';
  }

  /**
   * Get human-readable language name from code
   */
  private getLanguageName(code: string): string {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'pl': 'Polish',
      'de': 'German',
      'fr': 'French',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'zh': 'Chinese'
    };
    return languages[code] || code.toUpperCase();
  }

  /**
   * Get supported languages for tool schema
   */
  getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

  /**
   * Get best voice for a language
   */
  getBestVoiceForLanguage(languageCode: string): VoiceInfo | null {
    return this.languageMapping[languageCode]?.bestVoice || null;
  }

  /**
   * Get information about the voice that will be used for synthesis
   */
  getUsedVoiceInfo(languageCode?: string): string {
    if (languageCode) {
      // Easter egg: Check if it's a voice name first
      if (this.isVoiceName(languageCode)) {
        const specificVoice = this.findVoiceByName(languageCode);
        if (specificVoice) {
          return `${specificVoice.name} (Easter Egg)`;
        }
        // If voice not found, indicate fallback
        return `System Default (Voice "${languageCode}" not found)`;
      } else {
        // Standard language code handling
        const voice = this.getBestVoiceForLanguage(languageCode);
        if (voice) {
          return voice.name;
        }
      }
    }
    
    // Return platform default voice name
    switch (this.platform) {
      case 'darwin':
        return 'System Default (macOS)';
      case 'win32':
        return 'System Default (Windows SAPI)';
      case 'linux':
        return 'System Default (espeak)';
      default:
        return 'System Default';
    }
  }

  /**
   * Check if parameter is a voice name rather than language code
   */
  private isVoiceName(param: string): boolean {
    return param.length > 2 && this.platform === 'darwin';
  }

  /**
   * Find voice by exact name match (macOS only)
   */
  private findVoiceByName(voiceName: string): VoiceInfo | null {
    return this.availableVoices.find(voice => 
      voice.id.toLowerCase() === voiceName.toLowerCase() ||
      voice.name.toLowerCase() === voiceName.toLowerCase()
    ) || null;
  }

  /**
   * Get optimal voice command for platform
   */
  getVoiceCommand(text: string, languageCode?: string): string {
    const sanitizedText = this.sanitizeText(text);
    
    switch (this.platform) {
      case 'darwin': {
        if (languageCode) {
          // Easter egg: If it's longer than 2 chars, treat as voice name
          if (this.isVoiceName(languageCode)) {
            const specificVoice = this.findVoiceByName(languageCode);
            if (specificVoice) {
              return `say -v "${specificVoice.id}" "${sanitizedText}"`;
            }
            // If voice not found, fall through to default
          } else {
            // Standard language code handling
            const voice = this.getBestVoiceForLanguage(languageCode);
            if (voice) {
              return `say -v "${voice.id}" "${sanitizedText}"`;
            }
          }
        }
        return `say "${sanitizedText}"`;
      }
      
      case 'win32': {
        let script = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;`;
        if (languageCode) {
          const voice = this.getBestVoiceForLanguage(languageCode);
          if (voice) {
            script += ` $synth.SelectVoice('${voice.id}');`;
          }
        }
        script += ` $synth.Speak('${sanitizedText}')`;
        return `powershell -Command "${script}"`;
      }
      
      case 'linux': {
        if (languageCode) {
          return `espeak -v ${languageCode} "${sanitizedText}"`;
        }
        return `espeak "${sanitizedText}"`;
      }
      
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Sanitize text for command line
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
