<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Eye, EyeOff } from 'lucide-vue-next';
import { useSettingsStore } from '../stores/settings';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const settingsStore = useSettingsStore();

const apiKeyInput = ref('');
const showApiKey = ref(false);
const statusText = ref<string | null>(null);

watch(() => props.isOpen, (open) => {
  if (!open) return;
  void (async () => {
    await settingsStore.ensureLoaded();
    apiKeyInput.value = settingsStore.apiKey || '';
    statusText.value = null;
    showApiKey.value = false;
  })();
});

const handleClose = () => emit('close');

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('close');
};

const saveApiKey = async () => {
  const trimmed = apiKeyInput.value.trim();
  await settingsStore.setApiKey(trimmed.length > 0 ? trimmed : null);
  statusText.value = trimmed.length > 0 ? 'Saved.' : 'Cleared.';
};

const clearApiKey = async () => {
  apiKeyInput.value = '';
  await settingsStore.setApiKey(null);
  statusText.value = 'Cleared.';
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="settings-modal-overlay"
      @click="handleBackdropClick"
    >
      <div class="settings-modal">
        <div class="settings-modal-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="handleClose" title="Close">
            <X :size="22" />
          </button>
        </div>

        <div class="settings-content">
          <section class="settings-section">
            <div class="section-title">Mistral API Key</div>
            <div class="section-subtitle">
              Stored locally in this browser (IndexedDB). Required for translations.
            </div>

            <div class="api-key-row">
              <input
                v-model="apiKeyInput"
                class="api-key-input"
                :type="showApiKey ? 'text' : 'password'"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="Paste your Mistral API key"
              />
              <button
                class="icon-btn"
                type="button"
                :title="showApiKey ? 'Hide key' : 'Show key'"
                @click="showApiKey = !showApiKey"
              >
                <EyeOff v-if="showApiKey" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>

            <div class="api-key-actions">
              <button class="primary-btn" @click="saveApiKey">Save</button>
              <button class="secondary-btn" @click="clearApiKey">Clear</button>
              <span v-if="statusText" class="status-text">{{ statusText }}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  padding: 1rem;
}

.settings-modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 240, 250, 0.96) 100%);
  border-radius: 20px;
  max-width: 560px;
  width: 100%;
  max-height: 85vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.settings-modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
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

.settings-content {
  padding: 1rem 1.25rem 1.25rem 1.25rem;
  overflow-y: auto;
}

.settings-section {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  padding: 1rem;
}

.section-title {
  font-weight: 700;
  color: #222;
  margin-bottom: 0.25rem;
}

.section-subtitle {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 0.75rem;
  line-height: 1.35;
}

.api-key-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.api-key-input {
  flex: 1;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  font-size: 0.95rem;
  outline: none;
}

.api-key-input:focus {
  border-color: rgba(66, 184, 131, 0.6);
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.15);
}

.icon-btn {
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.api-key-actions {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  background: rgba(66, 184, 131, 0.95);
  color: white;
}

.secondary-btn {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.8);
}

.status-text {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.7);
  margin-left: 0.25rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 520px) {
  .settings-modal-header {
    padding: 0.9rem 1rem;
  }

  .settings-content {
    padding: 0.9rem 1rem 1rem 1rem;
  }

  .api-key-actions {
    gap: 0.4rem;
  }
}
</style>

