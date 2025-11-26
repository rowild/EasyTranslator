<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-vue-next';

const props = defineProps<{
  audioBlob: Blob | null;
}>();

const waveformContainer = ref<HTMLElement | null>(null);
const wavesurfer = ref<WaveSurfer | null>(null);
const isPlaying = ref(false);
const duration = ref('0:00');
const currentTime = ref('0:00');

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secondsRemainder = Math.floor(seconds % 60);
  return `${minutes}:${secondsRemainder.toString().padStart(2, '0')}`;
};

const initWavesurfer = () => {
  if (!waveformContainer.value) return;

  wavesurfer.value = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: '#42b883',
    progressColor: '#35495e',
    cursorColor: '#35495e',
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    height: 60,
    normalize: true,
  });

  wavesurfer.value.on('play', () => isPlaying.value = true);
  wavesurfer.value.on('pause', () => isPlaying.value = false);
  wavesurfer.value.on('finish', () => isPlaying.value = false);
  
  wavesurfer.value.on('ready', () => {
    duration.value = formatTime(wavesurfer.value?.getDuration() || 0);
  });

  wavesurfer.value.on('audioprocess', () => {
    currentTime.value = formatTime(wavesurfer.value?.getCurrentTime() || 0);
  });

  if (props.audioBlob) {
    wavesurfer.value.loadBlob(props.audioBlob);
  }
};

watch(() => props.audioBlob, (newBlob) => {
  if (wavesurfer.value && newBlob) {
    wavesurfer.value.loadBlob(newBlob);
  }
});

onMounted(() => {
  initWavesurfer();
});

onUnmounted(() => {
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
  }
});

const togglePlay = () => {
  if (wavesurfer.value) {
    wavesurfer.value.playPause();
  }
};
</script>

<template>
  <div class="audio-player" v-if="audioBlob">
    <button class="play-btn" @click="togglePlay">
      <Pause v-if="isPlaying" :size="20" />
      <Play v-else :size="20" />
    </button>
    
    <div class="waveform" ref="waveformContainer"></div>
    
    <div class="time-display">
      {{ currentTime }} / {{ duration }}
    </div>
  </div>
</template>

<style scoped>
.audio-player {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f1f1f1;
  padding: 0.75rem;
  border-radius: 12px;
  width: 100%;
  margin-top: 1rem;
}

.play-btn {
  background: #42b883;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.waveform {
  flex: 1;
}

.time-display {
  font-family: monospace;
  font-size: 0.9rem;
  color: #666;
  min-width: 80px;
  text-align: right;
}
</style>
