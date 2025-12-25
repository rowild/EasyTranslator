<script setup lang="ts">
import { computed } from 'vue';
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

const shouldShowSourceNotice = computed(() => {
  if (!props.sourceCode) return false;
  return props.targetCodes.includes(props.sourceCode);
});

const displayTargetCodes = computed(() => {
  if (!props.sourceCode) return props.targetCodes;
  return props.targetCodes.filter(code => code !== props.sourceCode);
});

const items = computed(() =>
  displayTargetCodes.value.map(code => ({
    code,
    language: languages.find(l => l.displayCode === code) as Language | undefined,
    text: props.translations[code] || '',
  }))
);
</script>

<template>
  <div class="translations-wrapper">
    <div v-if="shouldShowSourceNotice" class="source-notice">
      Original audio was in <span class="source-lang">{{ sourceLanguage?.nativeName || sourceCode }}</span>.
    </div>

    <div class="translations-scroll" aria-label="Translations">
      <div v-for="item in items" :key="item.code" class="translation-item">
        <div class="language-indicator">
          <span class="lang-flag">{{ item.language?.flag || '🌐' }}</span>
          <span class="lang-name">{{ item.language?.nativeName || item.code }}</span>
        </div>
        <div class="transcript-field output-field">
          <div class="transcript-content" :dir="item.language?.isRTL ? 'rtl' : 'ltr'">
            {{ item.text }}
          </div>
          <TextToSpeech
            v-if="item.language && item.text"
            :text="item.text"
            :lang="item.language.speechCode"
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

.source-notice {
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
}

.source-lang {
  font-weight: 900;
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
</style>
