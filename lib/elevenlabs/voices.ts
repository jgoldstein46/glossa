export interface VoiceConfig {
  voiceId: string
  name: string
  description: string
}

// Map of language names to voice configurations
// Using ElevenLabs multilingual voices
export const LANGUAGE_VOICE_MAP: Record<string, VoiceConfig> = {
  // English
  English: {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'American English, calm and clear',
  },
  en: {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'American English, calm and clear',
  },

  // Spanish
  Spanish: {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Multilingual, expressive',
  },
  Español: {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Multilingual, expressive',
  },

  // French
  French: {
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Multilingual, young',
  },
  Français: {
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Multilingual, young',
  },

  // German
  German: {
    voiceId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Multilingual, well-rounded',
  },
  Deutsch: {
    voiceId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Multilingual, well-rounded',
  },

  // Japanese
  Japanese: {
    voiceId: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    description: 'Multilingual, pleasant',
  },

  // Chinese / Mandarin
  Chinese: {
    voiceId: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    description: 'Multilingual, pleasant',
  },
  Mandarin: {
    voiceId: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    description: 'Multilingual, pleasant',
  },

  // Portuguese
  Portuguese: {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Multilingual, expressive',
  },

  // Korean
  Korean: {
    voiceId: 'ThT5KcBeYPX3keUQqHPh',
    name: 'Dorothy',
    description: 'Multilingual, pleasant',
  },

  // Persian / Farsi
  Persian: {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Multilingual, expressive',
  },
  Farsi: {
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Multilingual, expressive',
  },
}

// Default fallback voice for unsupported languages
export const DEFAULT_VOICE: VoiceConfig = {
  voiceId: '21m00Tcm4TlvDq8ikWAM',
  name: 'Rachel',
  description: 'Default multilingual voice',
}

/**
 * Get the appropriate voice configuration for a given language
 */
export function getVoiceForLanguage(language: string): VoiceConfig {
  // Try exact match first
  if (LANGUAGE_VOICE_MAP[language]) {
    return LANGUAGE_VOICE_MAP[language]
  }

  // Try case-insensitive match
  const normalizedLanguage = language.toLowerCase()
  for (const [key, config] of Object.entries(LANGUAGE_VOICE_MAP)) {
    if (key.toLowerCase() === normalizedLanguage) {
      return config
    }
  }

  // Return default voice
  return DEFAULT_VOICE
}
