<script setup lang="ts">
import { ref } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { Globe } from 'lucide-vue-next';

const store = useTranslationStore();
const isOpen = ref(false);

const languages = [
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

const selectLanguage = (code: string) => {
  store.setTargetLang(code);
  isOpen.value = false;
};

const currentLangName = () => {
  return languages.find(l => l.code === store.targetLang)?.name || store.targetLang;
};
</script>

<template>
  <div class="language-selector">
    <button class="selector-btn" @click="isOpen = true">
      <Globe class="icon" :size="16" />
      <span>{{ currentLangName() }}</span>
    </button>

    <div v-if="isOpen" class="modal-overlay" @click="isOpen = false">
      <div class="modal-content" @click.stop>
        <h2>Translate to...</h2>
        <div class="grid">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="lang-btn"
            :class="{ active: store.targetLang === lang.code }"
            @click="selectLanguage(lang.code)"
          >
            <span class="flag">{{ lang.flag }}</span>
            <span class="name">{{ lang.name }}</span>
          </button>
        </div>
        <button class="close-btn" @click="isOpen = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.language-selector {
  /* No width 100% */
}

.selector-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background-color: transparent;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.selector-btn:hover {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.icon {
  /* handled by size prop */
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background-color: white;
  color: #333;
  padding: 1.5rem;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h2 {
  margin: 0;
  text-align: center;
  font-size: 1.2rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.lang-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border: 2px solid #eee;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  gap: 0.5rem;
}

.lang-btn.active {
  border-color: #42b883;
  background-color: #eafaf1;
}

.flag {
  font-size: 2rem;
}

.name {
  font-size: 1rem;
  font-weight: 500;
}

.close-btn {
  padding: 1rem;
  background-color: #eee;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 0.5rem;
}
</style>
