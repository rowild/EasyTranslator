<script setup lang="ts">
import { computed } from 'vue';
import { MessageSquare, Languages } from 'lucide-vue-next';
import type { Language } from '../config/languages';

const props = defineProps<{
  languages: Language[];
  selectedLanguage: Language | null;
  type: 'input' | 'output';
}>();

const emit = defineEmits<{
  (e: 'select', language: Language): void;
}>();

const icon = computed(() => props.type === 'input' ? MessageSquare : Languages);
const iconLabel = computed(() => props.type === 'input' ? 'Input Language' : 'Output Language');

// Sort languages: selected first, then alphabetically
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
  <div class="language-column" :class="`language-column--${type}`">
    <div class="column-header">
      <component :is="icon" :size="24" class="header-icon" />
      <span class="header-label">{{ iconLabel }}</span>
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
        <span class="code">{{ language.displayCode }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.language-column {
  position: fixed;
  top: 0;
  width: 140px;
  height: 100vh;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.language-column--input {
  left: 0;
}

.language-column--output {
  right: 0;
  border-right: none;
  border-left: 1px solid #e0e0e0;
}

.column-header {
  padding: 1rem;
  border-bottom: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
}

.header-icon {
  color: #666;
}

.header-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  text-align: center;
}

.language-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.language-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 70px;
}

.language-button:hover {
  border-color: #999;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.language-button.selected {
  border-width: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.language-column--input .language-button.selected {
  background: var(--input-language-color, #e8f5e9);
  border-color: var(--input-language-border, #4caf50);
}

.language-column--output .language-button.selected {
  background: var(--output-language-color, #fff3e0);
  border-color: var(--output-language-border, #ff6f00);
}

.flag {
  font-size: 2rem;
  line-height: 1;
}

.code {
  font-size: 0.7rem;
  font-weight: 600;
  color: #555;
  font-family: monospace;
}

/* Scrollbar styling */
.language-list::-webkit-scrollbar {
  width: 6px;
}

.language-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.language-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.language-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
