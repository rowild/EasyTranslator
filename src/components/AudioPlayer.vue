<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, ChevronDown, ChevronUp } from 'lucide-vue-next';

const props = defineProps<{
  audioBlob: Blob | null;
}>();

const waveformContainer = ref<HTMLElement | null>(null);
const wavesurfer = ref<WaveSurfer | null>(null);
const isPlaying = ref(false);
const duration = ref('0:00');
const currentTime = ref('0:00');
const isWaveformOpen = ref(false);

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
    waveColor: 'rgba(255, 255, 255, 0.6)',
    progressColor: 'var(--primary-color)',
    cursorColor: 'var(--primary-color)',
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    height: 19,
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

let initializationScheduled = false;

watch(() => props.audioBlob, (newBlob, oldBlob) => {
  console.log('AudioPlayer: audioBlob changed', {
    newBlob: newBlob ? `${newBlob.size} bytes, ${newBlob.type}` : 'null',
    oldBlob: oldBlob ? `${oldBlob.size} bytes, ${oldBlob.type}` : 'null',
    wavesurferExists: !!wavesurfer.value,
    initScheduled: initializationScheduled
  });

  if (newBlob) {
    if (!wavesurfer.value && !initializationScheduled) {
      console.log('AudioPlayer: Scheduling WaveSurfer initialization');
      initializationScheduled = true;
      // Wait for next tick to ensure DOM is ready
      setTimeout(() => {
        initWavesurfer();
        initializationScheduled = false;
      }, 0);
    } else if (wavesurfer.value) {
      console.log('AudioPlayer: Loading blob into existing WaveSurfer');
      // Load new blob into existing instance
      wavesurfer.value.loadBlob(newBlob);
    }
  }
}, { immediate: true });

onMounted(() => {
  console.log('AudioPlayer: Component mounted');
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

const toggleWaveform = () => {
  isWaveformOpen.value = !isWaveformOpen.value;
};
</script>

<template>
  <div class="audio-player-wrapper" v-if="audioBlob">
    <!-- Toggle button always visible on left -->
    <button class="waveform-toggle-btn" @click="toggleWaveform" :title="isWaveformOpen ? 'Hide audio controls' : 'Show audio controls'">
      <ChevronUp v-if="isWaveformOpen" :size="14" />
      <ChevronDown v-else :size="14" />
    </button>

    <!-- Expanded controls and waveform (next to chevron when open) -->
    <div v-show="isWaveformOpen" class="audio-player">
      <div class="waveform-container">
        <div class="waveform-wrapper">
          <div class="waveform" ref="waveformContainer"></div>
          <div class="zero-db-line"></div>
        </div>
      </div>

      <div class="controls-row">
        <button class="play-btn" @click="togglePlay">
          <Pause v-if="isPlaying" :size="16" />
          <Play v-else :size="16" />
        </button>

        <div class="time-display">
          {{ currentTime }} / {{ duration }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-player-wrapper {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.75rem;
}

.audio-player {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.waveform-container {
  width: 100%;
}

.waveform-wrapper {
  position: relative;
  width: 100%;
  height: 19px;
}

.waveform {
  width: 100%;
  height: 19px;
}

.zero-db-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: -1;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.play-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.play-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(157, 23, 68, 0.4);
}

.play-btn:active {
  transform: scale(0.95);
}

.waveform-toggle-btn {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.waveform-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.time-display {
  font-family: monospace;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: right;
  margin-left: auto;
}
</style>
