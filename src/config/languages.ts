export interface Language {
  code: string; // ISO 639-1 + ISO 3166-1 (e.g., "en-US", "de-DE")
  displayCode: string; // 2-letter code for display (e.g., "en", "de")
  name: string; // English name
  nativeName: string; // Native language name
  flag: string; // Emoji flag
  speechCode: string; // Code for SpeechRecognition API
  isRTL?: boolean; // Right-to-left text direction (for Arabic, Hebrew, etc.)
}

const languageList: Language[] = [
  // English (not EU)
  { code: 'en-US', displayCode: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', speechCode: 'en-US' },
  { code: 'en-GB', displayCode: 'en', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧', speechCode: 'en-GB' },

  // EU Countries
  { code: 'bg-BG', displayCode: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', speechCode: 'bg-BG' },
  { code: 'hr-HR', displayCode: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', speechCode: 'hr-HR' },
  { code: 'cs-CZ', displayCode: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', speechCode: 'cs-CZ' },
  { code: 'da-DK', displayCode: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', speechCode: 'da-DK' },
  { code: 'nl-NL', displayCode: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', speechCode: 'nl-NL' },
  { code: 'et-EE', displayCode: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', speechCode: 'et-EE' },
  { code: 'fi-FI', displayCode: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', speechCode: 'fi-FI' },
  { code: 'fr-FR', displayCode: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'de-DE', displayCode: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { code: 'de-AT', displayCode: 'de', name: 'Austrian German', nativeName: 'Österreichisches Deutsch', flag: '🇦🇹', speechCode: 'de-AT' },
  { code: 'de-CH', displayCode: 'de', name: 'Swiss German', nativeName: 'Schweizerdeutsch', flag: '🇨🇭', speechCode: 'de-CH' },
  { code: 'el-GR', displayCode: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', speechCode: 'el-GR' },
  { code: 'hu-HU', displayCode: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', speechCode: 'hu-HU' },
  { code: 'ga-IE', displayCode: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', speechCode: 'ga-IE' },
  { code: 'it-IT', displayCode: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'lv-LV', displayCode: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', speechCode: 'lv-LV' },
  { code: 'lt-LT', displayCode: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', speechCode: 'lt-LT' },
  { code: 'mt-MT', displayCode: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', speechCode: 'mt-MT' },
  { code: 'pl-PL', displayCode: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', speechCode: 'pl-PL' },
  { code: 'pt-PT', displayCode: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', speechCode: 'pt-PT' },
  { code: 'ro-RO', displayCode: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', speechCode: 'ro-RO' },
  { code: 'sk-SK', displayCode: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', speechCode: 'sk-SK' },
  { code: 'sl-SI', displayCode: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', speechCode: 'sl-SI' },
  { code: 'es-ES', displayCode: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'sv-SE', displayCode: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', speechCode: 'sv-SE' },

  // European (non-EU)
  { code: 'is-IS', displayCode: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', speechCode: 'is-IS' },
  { code: 'no-NO', displayCode: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', speechCode: 'no-NO' },
  { code: 'lb-LU', displayCode: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', flag: '🇱🇺', speechCode: 'lb-LU' },
  { code: 'sq-AL', displayCode: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', speechCode: 'sq-AL' },
  { code: 'sr-RS', displayCode: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', speechCode: 'sr-RS' },
  { code: 'mk-MK', displayCode: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', speechCode: 'mk-MK' },
  { code: 'bs-BA', displayCode: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦', speechCode: 'bs-BA' },
  { code: 'uk-UA', displayCode: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', speechCode: 'uk-UA' },
  { code: 'ru-RU', displayCode: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', speechCode: 'ru-RU' },
  { code: 'tr-TR', displayCode: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', speechCode: 'tr-TR' },

  // Asian Languages
  { code: 'zh-CN', displayCode: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'zh-TW', displayCode: 'zh', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', speechCode: 'zh-TW' },
  { code: 'ja-JP', displayCode: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
  { code: 'ko-KR', displayCode: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', speechCode: 'ko-KR' },

  // Middle Eastern Languages (RTL)
  { code: 'ar-SA', displayCode: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', speechCode: 'ar-SA', isRTL: true },
  { code: 'he-IL', displayCode: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', speechCode: 'he-IL', isRTL: true },
];

// Don't sort by default - will sort dynamically based on selected language
export const languages = languageList;

export const getLanguageByCode = (code: string): Language | undefined => {
  return languages.find(lang => lang.code === code);
};

/**
 * Get localized name of a language in the target locale
 * Uses Intl.DisplayNames API for accurate translations
 */
export const getLocalizedLanguageName = (language: Language, targetLocale: string): string => {
  try {
    // Create DisplayNames with the target locale
    const displayNames = new Intl.DisplayNames([targetLocale, 'en'], {
      type: 'language',
      fallback: 'none'
    });

    // Get the localized name
    const localizedName = displayNames.of(language.displayCode);

    // If we got a valid result, use it
    if (localizedName && localizedName !== language.displayCode) {
      return localizedName;
    }

    // Otherwise fallback to native name
    return language.nativeName;
  } catch (error) {
    console.warn('Intl.DisplayNames failed for', language.displayCode, 'in', targetLocale, error);
    // Fallback to native name if Intl.DisplayNames fails
    return language.nativeName;
  }
};

/**
 * Get sorted languages based on the selected source language
 * Languages are sorted alphabetically by their name in the source language
 */
export const getSortedLanguages = (sourceLanguage: Language | null): Language[] => {
  if (!sourceLanguage) {
    // If no source language selected, sort by native name
    return [...languages].sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  }

  const targetLocale = sourceLanguage.code;

  return [...languages].sort((a, b) => {
    const nameA = getLocalizedLanguageName(a, targetLocale);
    const nameB = getLocalizedLanguageName(b, targetLocale);
    return nameA.localeCompare(nameB, targetLocale);
  });
};
