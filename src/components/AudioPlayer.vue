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
  if (!waveformContainer.value) {
    console.warn('AudioPlayer: waveformContainer not available');
    return;
  }

  console.log('AudioPlayer: Initializing WaveSurfer...');

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
    console.log('AudioPlayer: WaveSurfer ready, duration:', wavesurfer.value?.getDuration());
    duration.value = formatTime(wavesurfer.value?.getDuration() || 0);
  });

  wavesurfer.value.on('audioprocess', () => {
    currentTime.value = formatTime(wavesurfer.value?.getCurrentTime() || 0);
  });

  wavesurfer.value.on('error', (err) => {
    console.error('AudioPlayer: WaveSurfer error:', err);
  });

  if (props.audioBlob) {
    console.log('AudioPlayer: Loading blob on init:', props.audioBlob.size, 'bytes');
    wavesurfer.value.loadBlob(props.audioBlob);
  }
};

watch(() => props.audioBlob, (newBlob, oldBlob) => {
  console.log('AudioPlayer: audioBlob changed', {
    newBlob: newBlob ? `${newBlob.size} bytes, ${newBlob.type}` : 'null',
    oldBlob: oldBlob ? `${oldBlob.size} bytes, ${oldBlob.type}` : 'null',
    wavesurferExists: !!wavesurfer.value
  });

  if (newBlob) {
    if (!wavesurfer.value) {
      console.log('AudioPlayer: Initializing WaveSurfer from watch');
      // Wait for next tick to ensure DOM is ready
      setTimeout(() => {
        initWavesurfer();
      }, 0);
    } else {
      console.log('AudioPlayer: Loading blob into existing WaveSurfer');
      // Load new blob into existing instance
      wavesurfer.value.loadBlob(newBlob);
    }
  }
}, { immediate: true });

onMounted(() => {
  console.log('AudioPlayer: Component mounted, audioBlob:', props.audioBlob ? `${props.audioBlob.size} bytes` : 'null');
  // Only initialize if we have a blob
  if (props.audioBlob) {
    initWavesurfer();
  }
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
