<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { X, Check } from 'lucide-vue-next';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  isOpen: boolean;
  selected: string[];
  maxSelected?: number;
}>();

const emit = defineEmits<{
  (e: 'save', selected: string[]): void;
  (e: 'close'): void;
}>();

const maxSelected = computed(() => props.maxSelected ?? 10);

const uniqueLanguages = computed<Language[]>(() => {
  const seen = new Set<string>();
  return languages.filter(lang => {
    if (seen.has(lang.displayCode)) return false;
    seen.add(lang.displayCode);
    return true;
  });
});

const draftSelected = ref<string[]>([]);
const errorText = ref<string | null>(null);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    draftSelected.value = [...props.selected];
    errorText.value = null;
  }
);

const toggle = (code: string) => {
  const idx = draftSelected.value.indexOf(code);
  if (idx >= 0) {
    draftSelected.value.splice(idx, 1);
    errorText.value = null;
    return;
  }

  if (draftSelected.value.length >= maxSelected.value) {
    errorText.value = `You can select up to ${maxSelected.value} languages.`;
    return;
  }

  draftSelected.value.push(code);
  errorText.value = null;
};

const isSelected = (code: string) => draftSelected.value.includes(code);

const handleSave = () => {
  emit('save', [...draftSelected.value]);
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('close');
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="target-langs-overlay"
      @click="handleBackdropClick"
    >
      <div class="target-langs-modal">
        <div class="modal-header">
          <h2>Select target languages</h2>
          <button class="close-btn" @click="$emit('close')" title="Close">
            <X :size="22" />
          </button>
        </div>

        <div class="meta-row">
          <div class="count">{{ draftSelected.length }}/{{ maxSelected }} selected</div>
          <button class="save-btn" @click="handleSave">Done</button>
        </div>

        <div v-if="errorText" class="error-text">{{ errorText }}</div>

        <div class="grid-wrapper">
          <div class="language-grid">
            <button
              v-for="language in uniqueLanguages"
              :key="language.displayCode"
              class="language-item"
              :class="{ selected: isSelected(language.displayCode) }"
              @click="toggle(language.displayCode)"
              type="button"
            >
              <span class="lang-flag">{{ language.flag }}</span>
              <span class="lang-name">{{ language.nativeName }}</span>
              <span v-if="isSelected(language.displayCode)" class="check">
                <Check :size="16" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.target-langs-overlay {
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
  z-index: 1003;
  padding: 1rem;
}

.target-langs-modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 240, 250, 0.98) 100%);
  border-radius: 20px;
  max-width: 860px;
  width: 100%;
  max-height: 90vh;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #222;
}

.close-btn {
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #333;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  transform: scale(1.08);
}

.meta-row {
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.count {
  font-weight: 800;
  color: rgba(0, 0, 0, 0.7);
}

.save-btn {
  border: none;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-weight: 800;
  cursor: pointer;
  background: rgba(66, 184, 131, 0.95);
  color: white;
}

.error-text {
  padding: 0.65rem 1.25rem 0 1.25rem;
  color: rgba(185, 28, 28, 0.95);
  font-weight: 700;
  font-size: 0.9rem;
}

.grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem 1.25rem 1.25rem;
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.language-item {
  position: relative;
  background: rgba(255, 255, 255, 0.75);
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  padding: 0.9rem 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  min-height: 86px;
  justify-content: center;
}

.language-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(0, 0, 0, 0.18);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.language-item.selected {
  border-color: rgba(66, 184, 131, 0.9);
  box-shadow: 0 8px 18px rgba(66, 184, 131, 0.18);
}

.lang-flag {
  font-size: 2.2rem;
  line-height: 1;
}

.lang-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #222;
  text-align: center;
  line-height: 1.2;
}

.check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(66, 184, 131, 0.95);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .language-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 0.6rem;
  }

  .lang-flag {
    font-size: 2rem;
  }
}
</style>

