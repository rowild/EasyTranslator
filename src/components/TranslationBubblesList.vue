<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TextToSpeech from './TextToSpeech.vue';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  targetCodes: string[];
  sourceCode?: string | null;
  translations: Record<string, string>;
}>();

const sourceLanguage = computed(() => {
  if (!props.sourceCode) return null;
  return languages.find(l => l.displayCode === props.sourceCode) || null;
});

const ORIGINAL_AUDIO_NOTICE_BY_CODE: Record<string, string> = {
  ar: 'كان الصوت الأصلي باللغة العربية.',
  bg: 'Оригиналният аудиозапис беше на български.',
  bs: 'Originalni audio je bio na bosanskom.',
  cs: 'Původní zvuková nahrávka byla v češtině.',
  da: 'Den originale lyd var på dansk.',
  de: 'Das Originalaudio war auf Deutsch.',
  el: 'Η αρχική ηχογράφηση ήταν στα ελληνικά.',
  en: 'The original audio was in English.',
  es: 'La grabación de audio original estaba en español.',
  et: 'Algne helisalvestis oli eesti keeles.',
  fi: 'Alkuperäinen äänite oli suomeksi.',
  fr: "L'audio original était en français.",
  ga: 'Bhí an fhuaim bhunaidh i nGaeilge.',
  he: 'ההקלטה המקורית הייתה בעברית.',
  hr: 'Izvorna snimka zvuka bila je na hrvatskom.',
  hu: 'Az eredeti hangfelvétel magyarul volt.',
  is: 'Upprunalega hljóðið var á íslensku.',
  it: "L'audio originale era in italiano.",
  ja: '元の音声は日本語でした。',
  ko: '원본 오디오는 한국어였습니다.',
  lb: 'D’Originalaudio war op Lëtzebuergesch.',
  lt: 'Originalus garso įrašas buvo lietuvių kalba.',
  lv: 'Oriģinālais audio bija latviešu valodā.',
  mk: 'Оригиналната аудиоснимка беше на македонски.',
  mt: 'L-awdjo oriġinali kien bil-Malti.',
  nl: 'De oorspronkelijke audio was in het Nederlands.',
  no: 'Den originale lyden var på norsk.',
  pl: 'Oryginalne nagranie audio było po polsku.',
  pt: 'O áudio original estava em português.',
  ro: 'Înregistrarea audio originală era în română.',
  ru: 'Оригинальная аудиозапись была на русском.',
  sk: 'Pôvodný zvuk bol v slovenčine.',
  sl: 'Izvirni zvok je bil v slovenščini.',
  sq: 'Audioja origjinale ishte në shqip.',
  sr: 'Originalni audio je bio na srpskom.',
  sv: 'Det ursprungliga ljudet var på svenska.',
  tr: 'Orijinal ses kaydı Türkçeydi.',
  uk: 'Оригінальний аудіозапис був українською.',
  zh: '原始音频为中文。',
};

const sourceNoticeText = computed(() => {
  if (!props.sourceCode) return '';
  const fixed = ORIGINAL_AUDIO_NOTICE_BY_CODE[props.sourceCode];
  if (fixed) return fixed;
  if (sourceLanguage.value) return `Original audio was in ${sourceLanguage.value.name}.`;
  return `Original audio was in ${props.sourceCode}.`;
});

const shouldShowSourceNotice = computed(() => {
  if (!props.sourceCode) return false;
  return props.targetCodes.includes(props.sourceCode);
});

const displayTargetCodes = computed(() => {
  if (!props.sourceCode) return props.targetCodes;
  return props.targetCodes.filter(code => code !== props.sourceCode);
});

const activeVoiceSelectorId = ref<string | null>(null);

watch(
  () => displayTargetCodes.value.join(','),
  () => {
    activeVoiceSelectorId.value = null;
  }
);

const formatLanguageLabel = (language: Language | undefined, fallbackCode: string) => {
  if (!language) return fallbackCode;
  const native = language.nativeName;
  const english = language.name;
  if (!english) return native;
  if (native.trim().toLowerCase() === english.trim().toLowerCase()) return native;
  return `${native} (${english})`;
};

const items = computed(() =>
  displayTargetCodes.value.map(code => {
    const language = languages.find(l => l.displayCode === code) as Language | undefined;
    return {
      code,
      language,
      label: formatLanguageLabel(language, code),
      text: props.translations[code] || '',
    };
  })
);
</script>

<template>
  <div class="translations-wrapper">
    <div class="translations-scroll" aria-label="Translations">
      <div v-if="shouldShowSourceNotice" class="translation-item source-notice-item">
        <div class="language-indicator">
          <span class="lang-flag muted-flag">{{ sourceLanguage?.flag || '🌐' }}</span>
        </div>
        <div class="transcript-field output-field source-notice-bubble">
          <div class="transcript-content" :dir="sourceLanguage?.isRTL ? 'rtl' : 'ltr'">
            {{ sourceNoticeText }}
          </div>
        </div>
      </div>

      <div
        v-for="item in items"
        :key="item.code"
        class="translation-item"
        :class="{ 'voice-open': activeVoiceSelectorId === item.code }"
      >
        <div class="language-indicator">
          <span class="lang-flag">{{ item.language?.flag || '🌐' }}</span>
          <span class="lang-name">{{ item.label }}</span>
        </div>
        <div class="transcript-field output-field">
          <div class="transcript-content" :dir="item.language?.isRTL ? 'rtl' : 'ltr'">
            {{ item.text }}
          </div>
          <TextToSpeech
            v-if="item.language && item.text"
            :text="item.text"
            :lang="item.language.speechCode"
            :voice-selector-id="item.code"
            :active-voice-selector-id="activeVoiceSelectorId"
            @voice-selector-open="activeVoiceSelectorId = item.code"
            @voice-selector-close="() => { if (activeVoiceSelectorId === item.code) activeVoiceSelectorId = null; }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translations-wrapper {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.translations-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
}

.translation-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.muted-flag {
  opacity: 0.35;
}

.source-notice-bubble {
  border-color: rgba(255, 45, 119, 0.35);
}

.translation-item.voice-open {
  position: relative;
  z-index: 20;
}
</style>
