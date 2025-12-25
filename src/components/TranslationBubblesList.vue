<script setup lang="ts">
import { computed } from 'vue';
import TextToSpeech from './TextToSpeech.vue';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  targetCodes: string[];
  translations: Record<string, string>;
}>();

const items = computed(() =>
  props.targetCodes.map(code => ({
    code,
    language: languages.find(l => l.displayCode === code) as Language | undefined,
    text: props.translations[code] || '',
  }))
);
</script>

<template>
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
</template>

<style scoped>
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

