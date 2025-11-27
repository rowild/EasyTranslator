<script setup lang="ts">
import { computed } from 'vue';
import { Mic, LogOut } from 'lucide-vue-next';
import type { Language } from '../config/languages';
import { getLocalizedLanguageName } from '../config/languages';

const props = defineProps<{
  languages: Language[];
  selectedLanguage: Language | null;
  sourceLanguage: Language | null; // For localized names
  type: 'input' | 'output';
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', language: Language): void;
  (e: 'toggle'): void;
}>();

const icon = computed(() => props.type === 'input' ? Mic : LogOut);

// Get localized name for display
const getDisplayName = (language: Language): string => {
  if (!props.sourceLanguage) {
    return language.nativeName;
  }
  return getLocalizedLanguageName(language, props.sourceLanguage.code);
};

// Sort languages: selected first, then alphabetically by localized name
const sortedLanguages = computed(() => {
  if (!props.selectedLanguage) {
    return props.languages;
  }

  const selected = props.selectedLanguage;
  const others = props.languages.filter(lang => lang.code !== selected.code);

  return [selected, ...others];
});

const handleSelect = (language: Language) => {
  emit('select', language);
};
</script>

<template>
  <!-- Sliding column with language list -->
  <div class="language-column" :class="[`language-column--${type}`, { 'is-open': isOpen }]">
    <div class="column-icon-header">
      <component :is="icon" :size="28" class="column-icon" />
    </div>
    <div class="language-list">
      <button
        v-for="language in sortedLanguages"
        :key="language.code"
        class="language-button"
        :class="{ 'selected': selectedLanguage?.code === language.code }"
        @click="handleSelect(language)"
      >
        <span class="flag">{{ language.flag }}</span>
        <span class="name">{{ getDisplayName(language) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.language-column {
  position: fixed;
  top: 0;
  width: 100px;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  z-index: 50;
}

.language-column--input {
  left: 0;
  transform: translateX(-100%);
}

.language-column--input.is-open {
  transform: translateX(0);
}

.language-column--output {
  right: 0;
  border-right: none;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  transform: translateX(100%);
}

.language-column--output.is-open {
  transform: translateX(0);
}

.column-icon-header {
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.column-icon {
  color: rgba(255, 255, 255, 0.9);
}

.language-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.language-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem 0.4rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 65px;
}

.language-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.language-button.selected {
  border-width: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.language-column--input .language-button.selected {
  background: rgba(66, 184, 131, 0.3);
  border-color: var(--input-language-border, #42b883);
}

.language-column--output .language-button.selected {
  background: rgba(157, 23, 68, 0.3);
  border-color: var(--output-language-border, var(--primary-color));
}

.flag {
  font-size: 2rem;
  line-height: 1;
}

.name {
  font-size: 0.65rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  line-height: 1.1;
  word-break: break-word;
  hyphens: auto;
  max-width: 100%;
}
</style>
