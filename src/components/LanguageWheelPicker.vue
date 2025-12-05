<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import LanguageWheel from './LanguageWheel.vue';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  isOpen: boolean;
  isFirstRun: boolean;
  initialSource?: Language;
  initialTarget?: Language;
}>();

const emit = defineEmits<{
  (e: 'confirm', payload: { source: Language | null; target: Language }): void;
  (e: 'close'): void;
}>();

const selectedSource = ref<Language | null>(props.initialSource || null);
const selectedTarget = ref<Language | null>(props.initialTarget || null);

// Update selected languages when modal opens with new props
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    selectedSource.value = props.initialSource || null;
    selectedTarget.value = props.initialTarget || null;
    console.log('Language Picker opened:', {
      source: selectedSource.value?.nativeName,
      target: selectedTarget.value?.nativeName
    });
  }
});

// Can only confirm if BOTH languages are selected
const canConfirm = computed(() => selectedSource.value !== null && selectedTarget.value !== null);

const handleSourceSelect = (language: Language | null) => {
  selectedSource.value = language;
};

const handleTargetSelect = (language: Language | null) => {
  selectedTarget.value = language;
};

const handleConfirm = () => {
  if (!selectedTarget.value) return;

  emit('confirm', {
    source: selectedSource.value,
    target: selectedTarget.value
  });
};

const handleClose = () => {
  if (!props.isFirstRun) {
    emit('close');
  }
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget && !props.isFirstRun) {
    emit('close');
  }
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="language-picker-overlay"
      :class="{ 'first-run': isFirstRun }"
      @click="handleBackdropClick"
    >
      <div class="language-picker-modal" :class="{ 'first-run-modal': isFirstRun }">
        <!-- Close button (only when not first-run) -->
        <button
          v-if="!isFirstRun"
          class="close-btn"
          @click="handleClose"
          title="Close"
        >
          <X :size="24" />
        </button>

        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">
            {{ isFirstRun ? 'Welcome! Select Your Languages' : 'Change Languages' }}
          </h2>
          <p class="modal-subtitle" v-if="isFirstRun">
            Choose both languages: your primary language and the translation target
          </p>
        </div>

        <!-- Dual Wheel Container -->
        <div class="dual-wheel-container">
          <div class="wheels-with-arrow">
            <!-- Source Language Wheel -->
            <LanguageWheel
              :languages="languages"
              :selected-language="selectedSource"
              type="source"
              @select="handleSourceSelect"
            />

            <!-- Arrow Icon - positioned at selection rectangle center -->
            <div class="wheel-arrow">
              →
            </div>

            <!-- Target Language Wheel -->
            <LanguageWheel
              :languages="languages"
              :selected-language="selectedTarget"
              type="target"
              @select="handleTargetSelect"
            />
          </div>
        </div>

        <!-- Selected Languages Display -->
        <div class="selected-display">
          <div class="selected-item from-item">
            <span class="selected-label">From:</span>
            <span class="selected-lang" :class="{ 'required': !selectedSource }">
              <span class="lang-text">{{ selectedSource?.nativeName || 'Select language' }}</span>
              <span class="lang-flag-display">{{ selectedSource?.flag || '❓' }}</span>
            </span>
          </div>
          <div class="selected-item to-item">
            <span class="selected-label">To:</span>
            <span class="selected-lang" :class="{ 'required': !selectedTarget }">
              <span class="lang-flag-display">{{ selectedTarget?.flag || '❓' }}</span>
              <span class="lang-text">{{ selectedTarget?.nativeName || 'Select language' }}</span>
            </span>
          </div>
        </div>

        <!-- Confirm Button -->
        <button
          class="confirm-btn"
          :class="{ 'disabled': !canConfirm }"
          :disabled="!canConfirm"
          @click="handleConfirm"
        >
          {{ isFirstRun ? 'Get Started' : 'Save Changes' }}
        </button>

        <!-- First-run hint -->
        <p v-if="isFirstRun" class="first-run-hint">
          You can change languages anytime from the footer button
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.language-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(7, 67, 105, 0.35);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.language-picker-modal {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideUpFade 0.4s ease;
}

.first-run-modal {
  animation: slideUpFade 0.5s ease;
}

.close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.close-btn :deep(svg) {
  display: block;
  flex-shrink: 0;
}

.close-btn:hover {
  color: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.modal-header {
  text-align: left;
  margin-bottom: 2rem;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 0.5rem 0;
}

.modal-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.dual-wheel-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.wheels-with-arrow {
  position: relative;
  display: flex;
  gap: 4rem;
  align-items: flex-start;
}

.wheel-arrow {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
  z-index: 200;
  pointer-events: none;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-top: 1.5rem;
}

.selected-display {
  display: flex;
  gap: 1.5rem;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}

.selected-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.from-item {
  align-items: flex-end;
}

.to-item {
  align-items: flex-start;
}

.selected-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.selected-lang {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-lang.required {
  color: rgba(255, 180, 70, 0.9);
}

.lang-text {
  flex-shrink: 1;
  min-width: 0;
}

.lang-flag-display {
  flex-shrink: 0;
}

.confirm-btn {
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, var(--primary-color, #9D1744), var(--secondary-color, #074369));
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.confirm-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.confirm-btn:active:not(.disabled) {
  transform: translateY(0);
}

.confirm-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

.first-run-hint {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 1rem 0 0 0;
  font-style: italic;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Mobile responsive */
@media (max-width: 600px) {
  .language-picker-modal {
    padding: 1.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-subtitle {
    font-size: 0.85rem;
  }

  .wheels-with-arrow {
    gap: 2.5rem;
  }

  .wheel-arrow {
    font-size: 2rem;
    margin-top: 1rem;
  }

  .selected-display {
    gap: 2rem;
  }

  .from-item,
  .to-item {
    font-size: 0.85rem;
  }

  .selected-label {
    font-size: 0.7rem;
  }

  .selected-lang {
    font-size: 0.85rem;
  }

  .confirm-btn {
    font-size: 1rem;
    padding: 0.875rem 1.5rem;
  }
}

@media (max-width: 480px) {
  .language-picker-modal {
    padding: 1rem;
  }

  .modal-header {
    margin-bottom: 1.5rem;
  }

  .dual-wheel-container {
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .wheel-arrow {
    font-size: 1.5rem;
  }
}
</style>
