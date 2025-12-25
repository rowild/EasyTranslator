import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { db, type AppMode, type AppSettings } from '../db/db';

const SETTINGS_ID = 'app' as const;

const createDefaultSettings = (): AppSettings => ({
  id: SETTINGS_ID,
  mode: 'extended',
  apiKey: null,
  sourceLang: 'de',
  targetLang: 'fr',
  extendedTargetLangs: [],
  infoLanguage: null,
  ttsVoices: {},
  hasCompletedLanguageSetup: false,
  updatedAt: Date.now(),
});

const readLegacyLocalStorage = (): Partial<AppSettings> => {
  const legacy: Partial<AppSettings> = {};

  // Language prefs
  const targetLang = localStorage.getItem('targetLang');
  if (targetLang) legacy.targetLang = targetLang;

  const sourceLang = localStorage.getItem('sourceLang');
  if (sourceLang) legacy.sourceLang = sourceLang;

  // UI prefs
  const infoLanguage = localStorage.getItem('infoLanguage');
  if (infoLanguage) legacy.infoLanguage = infoLanguage;

  const hasCompletedLanguageSetup = localStorage.getItem('hasCompletedLanguageSetup');
  if (hasCompletedLanguageSetup) legacy.hasCompletedLanguageSetup = hasCompletedLanguageSetup === 'true';

  // TTS voice prefs (keys like `tts-voice-fr-FR`)
  const ttsVoices: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('tts-voice-')) continue;
    const lang = key.replace('tts-voice-', '');
    const voiceURI = localStorage.getItem(key);
    if (lang && voiceURI) ttsVoices[lang] = voiceURI;
  }
  if (Object.keys(ttsVoices).length > 0) legacy.ttsVoices = ttsVoices;

  return legacy;
};

const clearLegacyLocalStorage = () => {
  localStorage.removeItem('targetLang');
  localStorage.removeItem('sourceLang');
  localStorage.removeItem('infoLanguage');
  localStorage.removeItem('hasCompletedLanguageSetup');

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('tts-voice-')) keysToRemove.push(key);
  }
  for (const key of keysToRemove) localStorage.removeItem(key);
};

export const useSettingsStore = defineStore('settings', () => {
  const isLoaded = ref(false);
  let loadPromise: Promise<void> | null = null;

  const settings = ref<AppSettings>(createDefaultSettings());

  const mode = computed(() => settings.value.mode);
  const apiKey = computed(() => settings.value.apiKey);
  const sourceLang = computed(() => settings.value.sourceLang);
  const targetLang = computed(() => settings.value.targetLang);
  const extendedTargetLangs = computed(() => settings.value.extendedTargetLangs);
  const infoLanguage = computed(() => settings.value.infoLanguage);
  const hasCompletedLanguageSetup = computed(() => settings.value.hasCompletedLanguageSetup);

  const ensureLoaded = async () => {
    if (isLoaded.value) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const existing = await db.settings.get(SETTINGS_ID);
        if (existing) {
          const next: AppSettings =
            existing.mode === 'extended'
              ? existing
              : { ...existing, mode: 'extended', updatedAt: Date.now() };

          settings.value = next;
          if (next !== existing) await db.settings.put(next);
          return;
        }

        const legacy = readLegacyLocalStorage();
        const initial: AppSettings = {
          ...createDefaultSettings(),
          ...legacy,
          id: SETTINGS_ID,
          updatedAt: Date.now(),
        };

        settings.value = initial;
        await db.settings.put(initial);

        // Stop relying on localStorage once migrated.
        clearLegacyLocalStorage();
      } catch (error) {
        console.error('Failed to load settings from IndexedDB, using defaults:', error);
      } finally {
        isLoaded.value = true;
        loadPromise = null;
      }
    })();

    return loadPromise;
  };

  const persist = async (next: AppSettings) => {
    settings.value = next;
    try {
      await db.settings.put(next);
    } catch (error) {
      console.error('Failed to persist settings to IndexedDB:', error);
    }
  };

  const update = async (patch: Partial<Omit<AppSettings, 'id'>>) => {
    await ensureLoaded();
    const next: AppSettings = {
      ...settings.value,
      ...patch,
      id: SETTINGS_ID,
      updatedAt: Date.now(),
    };
    await persist(next);
  };

  const setMode = async (nextMode: AppMode) => update({ mode: nextMode });
  const setApiKey = async (key: string | null) => update({ apiKey: key });
  const setSourceLang = async (lang: string | null) => update({ sourceLang: lang });
  const setTargetLang = async (lang: string) => update({ targetLang: lang });
  const setExtendedTargetLangs = async (langs: string[]) => {
    const seen = new Set<string>();
    const unique = langs.filter(code => {
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
    await update({ extendedTargetLangs: unique.slice(0, 10) });
  };
  const setInfoLanguage = async (lang: string | null) => update({ infoLanguage: lang });
  const setHasCompletedLanguageSetup = async (value: boolean) => update({ hasCompletedLanguageSetup: value });

  const getTtsVoice = (lang: string): string | undefined => settings.value.ttsVoices[lang];
  const setTtsVoice = async (lang: string, voiceURI: string) => {
    await ensureLoaded();
    await update({ ttsVoices: { ...settings.value.ttsVoices, [lang]: voiceURI } });
  };

  return {
    isLoaded,
    settings,
    mode,
    apiKey,
    sourceLang,
    targetLang,
    extendedTargetLangs,
    infoLanguage,
    hasCompletedLanguageSetup,
    ensureLoaded,
    setMode,
    setApiKey,
    setSourceLang,
    setTargetLang,
    setExtendedTargetLangs,
    setInfoLanguage,
    setHasCompletedLanguageSetup,
    getTtsVoice,
    setTtsVoice,
  };
});
