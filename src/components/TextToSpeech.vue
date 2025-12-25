<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, computed } from 'vue';
import { Volume2, Square, Settings } from 'lucide-vue-next';
import { useSettingsStore } from '../stores/settings';

const props = defineProps<{
  text: string;
  lang: string;
}>();

const isSpeaking = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const showVoiceSelector = ref(false);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoiceURI = ref<string>('');
let animationId: number | null = null;
let simulatedBars: number[] = [];

const settingsStore = useSettingsStore();

// Simulated audio visualization parameters
const BAR_COUNT = 16;
const SMOOTHING_FACTOR = 0.3;

// Load available voices for the current language
const loadVoices = () => {
  const voices = speechSynthesis.getVoices();
  console.log('All voices:', voices.length);
  // Filter voices for current language (match by language code prefix)
  const langPrefix = props.lang.split('-')[0];
  availableVoices.value = voices.filter(voice =>
    voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
  );
  console.log(`Voices for ${props.lang}:`, availableVoices.value.length, availableVoices.value.map(v => v.name));

  // Load saved voice preference from IndexedDB settings
  const savedVoiceURI = settingsStore.getTtsVoice(props.lang);
  if (savedVoiceURI && availableVoices.value.some(v => v.voiceURI === savedVoiceURI)) {
    selectedVoiceURI.value = savedVoiceURI;
  } else if (availableVoices.value.length > 0) {
    // Default to first available voice
    selectedVoiceURI.value = availableVoices.value[0].voiceURI;
  }
  console.log('Selected voice URI:', selectedVoiceURI.value);
};

// Categorize voices by gender (heuristic based on name)
interface CategorizedVoice {
  voice: SpeechSynthesisVoice;
  category: 'male' | 'female' | 'other';
}

const categorizedVoices = computed<CategorizedVoice[]>(() => {
  return availableVoices.value.map(voice => {
    const nameLower = voice.name.toLowerCase();
    let category: 'male' | 'female' | 'other' = 'other';

    // Common female indicators
    const femalePatterns = [
      'female', 'woman', 'girl', 'grandma', 'mom', 'mother',
      // English names
      'samantha', 'victoria', 'karen', 'moira', 'kate', 'sara', 'alice', 'susan', 'allison', 'fiona', 'vicki',
      // French names
      'amélie', 'amelie', 'marie', 'juliette', 'céline', 'celine', 'pauline', 'catherine', 'sophie',
      // German names
      'anna', 'petra', 'gisela', 'marlene', 'steffi', 'anja',
      // Spanish/Italian names
      'lucia', 'monica', 'carmen', 'isabella', 'valentina', 'giulia',
      // Common generic female names
      'shelley', 'sandy', 'flo', 'lucy', 'emma', 'olivia', 'ava', 'mia'
    ];

    // Common male indicators
    const malePatterns = [
      'male', 'man', 'boy', 'grandpa', 'dad', 'father',
      // English names
      'daniel', 'thomas', 'alex', 'gordon', 'tom', 'fred', 'james', 'john', 'david', 'paul', 'mark',
      // French names
      'jacques', 'pierre', 'henri', 'antoine', 'nicolas', 'eddy', 'reed',
      // German names
      'hans', 'klaus', 'martin', 'stefan', 'markus', 'yannick',
      // Spanish/Italian names
      'jorge', 'diego', 'carlos', 'diego', 'marco', 'paolo',
      // Common generic male names
      'rocko', 'rocky'
    ];

    // Check for female patterns
    if (femalePatterns.some(pattern => nameLower.includes(pattern))) {
      category = 'female';
    }
    // Check for male patterns
    else if (malePatterns.some(pattern => nameLower.includes(pattern))) {
      category = 'male';
    }

    return { voice, category };
  });
});

const selectedVoice = computed(() =>
  availableVoices.value.find(v => v.voiceURI === selectedVoiceURI.value)
);

const selectVoice = (voiceURI: string) => {
  selectedVoiceURI.value = voiceURI;
  void settingsStore.setTtsVoice(props.lang, voiceURI);
  showVoiceSelector.value = false;
};

// Generate random-ish audio levels that look natural
const drawSimulatedWaveform = () => {
  if (!canvasRef.value || !isSpeaking.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Initialize bars if needed
  if (simulatedBars.length === 0) {
    simulatedBars = new Array(BAR_COUNT).fill(0);
  }

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const barWidth = width / BAR_COUNT;
  const barGap = 1;
  const centerY = height / 2;

  for (let i = 0; i < BAR_COUNT; i++) {
    // Generate random target values that simulate speech patterns
    // Speech has varying intensity, so we use random values weighted towards mid-range
    const targetValue = Math.random() * 0.6 + 0.2; // Range: 0.2 to 0.8

    // Apply smoothing for natural movement
    simulatedBars[i] = simulatedBars[i] * SMOOTHING_FACTOR + targetValue * (1 - SMOOTHING_FACTOR);

    const barHeight = simulatedBars[i] * (height / 2);

    // Color for output language (pink/magenta)
    const intensity = simulatedBars[i];
    const alpha = Math.max(0.4, Math.min(1, intensity + 0.2));
    const color = `rgba(233, 30, 99, ${alpha})`;

    ctx.fillStyle = color;

    const x = i * barWidth;

    // Draw bars mirrored vertically (top and bottom from center)
    ctx.fillRect(x, centerY - barHeight, barWidth - barGap, barHeight);
    ctx.fillRect(x, centerY, barWidth - barGap, barHeight);
  }

  // Draw center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  animationId = requestAnimationFrame(drawSimulatedWaveform);
};

const initCanvas = () => {
  if (!canvasRef.value) return;

  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  drawSimulatedWaveform();
};

const cleanup = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  simulatedBars = [];

  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
  }
};

const toggleSpeech = () => {
  if (isSpeaking.value) {
    // Stop speaking
    speechSynthesis.cancel();
    isSpeaking.value = false;
  } else {
    // Start speaking
    const utterance = new SpeechSynthesisUtterance(props.text);
    utterance.lang = props.lang;

    // Use selected voice if available
    if (selectedVoice.value) {
      utterance.voice = selectedVoice.value;
    }

    utterance.onstart = () => {
      isSpeaking.value = true;
    };

    utterance.onend = () => {
      isSpeaking.value = false;
    };

    utterance.onerror = () => {
      isSpeaking.value = false;
    };

    speechSynthesis.speak(utterance);
  }
};

// Watch for speaking state changes to control visualization
watch(isSpeaking, (speaking) => {
  if (speaking) {
    setTimeout(() => {
      initCanvas();
    }, 50);
  } else {
    cleanup();
  }
});

// Watch for language changes to reload voices
watch(() => props.lang, () => {
  loadVoices();
});

onMounted(() => {
  void (async () => {
    await settingsStore.ensureLoaded();
    loadVoices();
  })();

  // Some browsers need this event to load voices
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
});

onUnmounted(() => {
  cleanup();
  speechSynthesis.cancel();

  // Clean up event listener
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = null;
  }
});
</script>

<template>
  <div class="tts-wrapper">
    <!-- VUMeter (shown while speaking) -->
    <div v-if="isSpeaking" class="vu-meter">
      <canvas ref="canvasRef" class="vu-canvas"></canvas>
    </div>

    <!-- Voice Selector (shown when not speaking) -->
    <div v-if="!isSpeaking && availableVoices.length > 0" class="voice-controls">
      <button
        class="voice-settings-btn"
        @click="showVoiceSelector = !showVoiceSelector"
        :title="selectedVoice ? `Voice: ${selectedVoice.name}` : 'Select voice'"
      >
        <Settings :size="14" />
      </button>

      <!-- Voice selector dropdown -->
      <div v-if="showVoiceSelector" class="voice-selector-dropdown">
        <div class="voice-selector-header">Select Voice</div>

        <div class="voice-columns">
          <!-- Female voices (left column) -->
          <div v-if="categorizedVoices.filter(v => v.category === 'female').length > 0" class="voice-category">
            <div class="voice-category-label">Female</div>
            <button
              v-for="{ voice } in categorizedVoices.filter(v => v.category === 'female')"
              :key="voice.voiceURI"
              class="voice-option"
              :class="{ selected: voice.voiceURI === selectedVoiceURI }"
              @click="selectVoice(voice.voiceURI)"
            >
              {{ voice.name }}
            </button>
          </div>

          <!-- Male voices (right column) -->
          <div v-if="categorizedVoices.filter(v => v.category === 'male').length > 0" class="voice-category">
            <div class="voice-category-label">Male</div>
            <button
              v-for="{ voice } in categorizedVoices.filter(v => v.category === 'male')"
              :key="voice.voiceURI"
              class="voice-option"
              :class="{ selected: voice.voiceURI === selectedVoiceURI }"
              @click="selectVoice(voice.voiceURI)"
            >
              {{ voice.name }}
            </button>
          </div>
        </div>

        <!-- Other voices (full width at bottom) -->
        <div v-if="categorizedVoices.filter(v => v.category === 'other').length > 0" class="voice-category voice-category-other">
          <div class="voice-category-label">Other</div>
          <button
            v-for="{ voice } in categorizedVoices.filter(v => v.category === 'other')"
            :key="voice.voiceURI"
            class="voice-option"
            :class="{ selected: voice.voiceURI === selectedVoiceURI }"
            @click="selectVoice(voice.voiceURI)"
          >
            {{ voice.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Play/Stop button -->
    <button
      class="tts-button"
      :class="{ speaking: isSpeaking }"
      @click="toggleSpeech"
      :title="isSpeaking ? 'Stop playback' : 'Play translation'"
      :disabled="!text"
    >
      <Square v-if="isSpeaking" :size="16" />
      <Volume2 v-else :size="16" />
    </button>
  </div>
</template>

<style scoped>
.tts-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.75rem;
  position: relative;
}

.vu-meter {
  flex: 1;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.vu-canvas {
  width: 100%;
  height: 40px;
  display: block;
}

.voice-controls {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.voice-settings-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.voice-settings-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: rotate(45deg);
}

.voice-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: rgba(30, 30, 30, 0.98);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  min-width: 420px;
  max-height: 350px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.voice-selector-header {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  padding: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.5rem;
}

.voice-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.voice-category {
  display: flex;
  flex-direction: column;
}

.voice-category-other {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.voice-category-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
}

.voice-option {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  text-align: left;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.voice-option:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.voice-option.selected {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  font-weight: 600;
}

.tts-button {
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

.tts-button:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(157, 23, 68, 0.4);
}

.tts-button:active:not(:disabled) {
  transform: scale(0.95);
}

.tts-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-button.speaking {
  background: var(--accent-color, #e91e63);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
