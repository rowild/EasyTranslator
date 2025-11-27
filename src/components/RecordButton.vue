<script setup lang="ts">
import { Mic, Square } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
  isRecording: boolean;
  disabled?: boolean;
  volume?: number;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

const volumeScale = computed(() => {
  if (!props.isRecording) return 1;
  // Map 0-100 to 1.0-1.3 (allow volume to be 0, which is a valid value)
  const vol = props.volume ?? 0;
  return 1 + (vol / 100) * 0.3;
});
</script>

<template>
  <div class="record-wrapper">
    <div 
      class="volume-ring" 
      :style="{ transform: `scale(${volumeScale})`, opacity: isRecording ? 0.5 : 0 }"
    ></div>
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
    </button>
  </div>
</template>

<style scoped>
.record-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 200px;
  height: 200px;
}

.volume-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #42b883;
  z-index: 0;
  transition: transform 0.1s ease-out;
}

.record-btn {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: none;
  background-color: #42b883;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(66, 184, 131, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.record-btn.recording {
  background-color: #ff4757;
  box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4);
  /* Remove pulse animation as we use volume ring */
}

.record-btn.disabled {
  background-color: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  width: 100%;
  height: 100%;
}
</style>
