<script setup lang="ts">
import { Mic, Square } from 'lucide-vue-next';

defineProps<{
  isRecording: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();
</script>

<template>
  <button
    class="record-btn"
    :class="{ recording: isRecording, disabled: disabled }"
    @click="$emit('toggle')"
    :disabled="disabled"
  >
    <div class="icon-wrapper">
      <Square v-if="isRecording" class="icon" />
      <Mic v-else class="icon" />
    </div>
    <span class="label">{{ isRecording ? 'Stop' : 'Record' }}</span>
  </button>
</template>

<style scoped>
.record-btn {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  background-color: #42b883;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.4);
}

.record-btn.recording {
  background-color: #ff4757;
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4);
  animation: pulse 1.5s infinite;
}

.record-btn.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  width: 100%;
  height: 100%;
}

.label {
  font-size: 1.2rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>
