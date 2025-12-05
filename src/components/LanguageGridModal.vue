<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', language: Language): void;
  (e: 'close'): void;
}>();

// Get all unique languages by displayCode (to avoid duplicates like en-US and en-GB)
const uniqueLanguages = computed(() => {
  const seen = new Set<string>();
  return languages.filter(lang => {
    if (seen.has(lang.displayCode)) {
      return false;
    }
    seen.add(lang.displayCode);
    return true;
  });
});

const handleLanguageClick = (language: Language) => {
  emit('select', language);
};

const handleClose = () => {
  emit('close');
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close');
  }
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="language-grid-overlay"
      @click="handleBackdropClick"
    >
      <div class="language-grid-modal">
        <!-- Close button -->
        <button
          class="close-btn"
          @click="handleClose"
          title="Close"
        >
          <X :size="24" />
        </button>

        <!-- Header -->
        <div class="modal-header">
          <h2>Select Language</h2>
        </div>

        <!-- Language Grid -->
        <div class="language-grid">
          <button
            v-for="language in uniqueLanguages"
            :key="language.displayCode"
            class="language-grid-item"
            @click="handleLanguageClick(language)"
            :title="language.nativeName"
          >
            <span class="lang-flag">{{ language.flag }}</span>
            <span class="lang-name">{{ language.nativeName }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.language-grid-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001; /* Higher than info modal */
  padding: 1rem;
}

.language-grid-modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 240, 250, 0.98) 100%);
  border-radius: 24px;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.4);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #333;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: rotate(90deg);
}

.modal-header {
  margin-bottom: 1.5rem;
  padding-right: 3rem;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.language-grid-item {
  background: rgba(255, 255, 255, 0.7);
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-height: 80px;
  justify-content: center;
}

.language-grid-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.language-grid-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.lang-flag {
  font-size: 2.5rem;
  line-height: 1;
}

.lang-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  text-align: center;
  line-height: 1.2;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar styling */
.language-grid-modal::-webkit-scrollbar {
  width: 10px;
}

.language-grid-modal::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 5px;
}

.language-grid-modal::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 5px;
}

.language-grid-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .language-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.6rem;
  }

  .language-grid-item {
    padding: 0.75rem;
    min-height: 70px;
  }

  .lang-flag {
    font-size: 2rem;
  }

  .lang-name {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .language-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
  }

  .language-grid-item {
    padding: 0.6rem;
    min-height: 65px;
  }

  .lang-flag {
    font-size: 1.75rem;
  }

  .lang-name {
    font-size: 0.75rem;
  }

  .language-grid-modal {
    padding: 1.5rem;
  }
}
</style>
