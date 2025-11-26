export interface Language {
  code: string; // ISO 639-1 + ISO 3166-1 (e.g., "en-US", "de-DE")
  displayCode: string; // 2-letter code for display (e.g., "en", "de")
  name: string;
  flag: string; // Emoji flag
  speechCode: string; // Code for SpeechRecognition API
}

const languageList: Language[] = [
  // English (not EU)
  { code: 'en-US', displayCode: 'en', name: 'English', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'en-GB', displayCode: 'en', name: 'English (UK)', flag: '🇬🇧', speechCode: 'en-GB' },

  // EU Countries
  { code: 'bg-BG', displayCode: 'bg', name: 'Bulgarian', flag: '🇧🇬', speechCode: 'bg-BG' },
  { code: 'hr-HR', displayCode: 'hr', name: 'Croatian', flag: '🇭🇷', speechCode: 'hr-HR' },
  { code: 'cs-CZ', displayCode: 'cs', name: 'Czech', flag: '🇨🇿', speechCode: 'cs-CZ' },
  { code: 'da-DK', displayCode: 'da', name: 'Danish', flag: '🇩🇰', speechCode: 'da-DK' },
  { code: 'nl-NL', displayCode: 'nl', name: 'Dutch', flag: '🇳🇱', speechCode: 'nl-NL' },
  { code: 'et-EE', displayCode: 'et', name: 'Estonian', flag: '🇪🇪', speechCode: 'et-EE' },
  { code: 'fi-FI', displayCode: 'fi', name: 'Finnish', flag: '🇫🇮', speechCode: 'fi-FI' },
  { code: 'fr-FR', displayCode: 'fr', name: 'French', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'de-DE', displayCode: 'de', name: 'German', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'el-GR', displayCode: 'el', name: 'Greek', flag: '🇬🇷', speechCode: 'el-GR' },
  { code: 'hu-HU', displayCode: 'hu', name: 'Hungarian', flag: '🇭🇺', speechCode: 'hu-HU' },
  { code: 'ga-IE', displayCode: 'ga', name: 'Irish', flag: '🇮🇪', speechCode: 'ga-IE' },
  { code: 'it-IT', displayCode: 'it', name: 'Italian', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'lv-LV', displayCode: 'lv', name: 'Latvian', flag: '🇱🇻', speechCode: 'lv-LV' },
  { code: 'lt-LT', displayCode: 'lt', name: 'Lithuanian', flag: '🇱🇹', speechCode: 'lt-LT' },
  { code: 'mt-MT', displayCode: 'mt', name: 'Maltese', flag: '🇲🇹', speechCode: 'mt-MT' },
  { code: 'pl-PL', displayCode: 'pl', name: 'Polish', flag: '🇵🇱', speechCode: 'pl-PL' },
  { code: 'pt-PT', displayCode: 'pt', name: 'Portuguese', flag: '🇵🇹', speechCode: 'pt-PT' },
  { code: 'ro-RO', displayCode: 'ro', name: 'Romanian', flag: '🇷🇴', speechCode: 'ro-RO' },
  { code: 'sk-SK', displayCode: 'sk', name: 'Slovak', flag: '🇸🇰', speechCode: 'sk-SK' },
  { code: 'sl-SI', displayCode: 'sl', name: 'Slovenian', flag: '🇸🇮', speechCode: 'sl-SI' },
  { code: 'es-ES', displayCode: 'es', name: 'Spanish', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'sv-SE', displayCode: 'sv', name: 'Swedish', flag: '🇸🇪', speechCode: 'sv-SE' },

  // European (non-EU)
  { code: 'is-IS', displayCode: 'is', name: 'Icelandic', flag: '🇮🇸', speechCode: 'is-IS' },
  { code: 'no-NO', displayCode: 'no', name: 'Norwegian', flag: '🇳🇴', speechCode: 'no-NO' },
  { code: 'lb-LU', displayCode: 'lb', name: 'Luxembourgish', flag: '🇱🇺', speechCode: 'lb-LU' },
  { code: 'sq-AL', displayCode: 'sq', name: 'Albanian', flag: '🇦🇱', speechCode: 'sq-AL' },
  { code: 'sr-RS', displayCode: 'sr', name: 'Serbian', flag: '🇷🇸', speechCode: 'sr-RS' },
  { code: 'mk-MK', displayCode: 'mk', name: 'Macedonian', flag: '🇲🇰', speechCode: 'mk-MK' },
  { code: 'bs-BA', displayCode: 'bs', name: 'Bosnian', flag: '🇧🇦', speechCode: 'bs-BA' },
  { code: 'uk-UA', displayCode: 'uk', name: 'Ukrainian', flag: '🇺🇦', speechCode: 'uk-UA' },
  { code: 'ru-RU', displayCode: 'ru', name: 'Russian', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'tr-TR', displayCode: 'tr', name: 'Turkish', flag: '🇹🇷', speechCode: 'tr-TR' },

  // Asian Languages
  { code: 'zh-CN', displayCode: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'zh-TW', displayCode: 'zh', name: 'Chinese (Traditional)', flag: '🇹🇼', speechCode: 'zh-TW' },
  { code: 'ja-JP', displayCode: 'ja', name: 'Japanese', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'ko-KR', displayCode: 'ko', name: 'Korean', flag: '🇰🇷', speechCode: 'ko-KR' },
];

// Sort languages alphabetically by displayCode
export const languages = languageList.sort((a, b) => a.displayCode.localeCompare(b.displayCode));

export const getLanguageByCode = (code: string): Language | undefined => {
  return languages.find(lang => lang.code === code);
};
