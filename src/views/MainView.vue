<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import LanguageColumn from '../components/LanguageColumn.vue';
import RecordButton from '../components/RecordButton.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import { languages, type Language } from '../config/languages';
import { Loader2 } from 'lucide-vue-next';

const store = useTranslationStore();
const {
  isRecording,
  startRecording,
  stopRecording,
  volume,
  permissionStatus,
  checkPermission,
  transcript,
  isSpeechRecognitionSupported,
  setRecognitionLanguage,
  setTranscript
} = useAudioRecorder();

const isOffline = ref(!navigator.onLine);
const recordedBlob = ref<Blob | null>(null);
const inputLanguage = ref<Language | null>(null);
const outputLanguage = ref<Language | null>(null);

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

// Load saved language preferences from localStorage
onMounted(() => {
  store.loadHistory();
  checkPermission();

  const savedInputCode = localStorage.getItem('inputLanguage');
  const savedOutputCode = localStorage.getItem('outputLanguage');

  if (savedInputCode) {
    inputLanguage.value = languages.find(lang => lang.code === savedInputCode) || null;
  }

  if (savedOutputCode) {
    outputLanguage.value = languages.find(lang => lang.code === savedOutputCode) || null;
  }
});

// Watch input language changes and update SpeechRecognition
watch(inputLanguage, (newLang) => {
  if (newLang) {
    localStorage.setItem('inputLanguage', newLang.code);
    setRecognitionLanguage(newLang.speechCode);
  }
});

// Watch output language changes
watch(outputLanguage, (newLang) => {
  if (newLang) {
    localStorage.setItem('outputLanguage', newLang.code);
  }
});

// Record button is only enabled when both languages are selected
const canRecord = computed(() => {
  return !!(inputLanguage.value && outputLanguage.value);
});

const handleInputLanguageSelect = (language: Language) => {
  inputLanguage.value = language;
};

const handleOutputLanguageSelect = (language: Language) => {
  outputLanguage.value = language;
};

const handleRecordToggle = async () => {
  if (isRecording.value) {
    try {
      console.log('Stopping recording...');
      const blob = await stopRecording();
      console.log('Recording stopped. Blob received:', blob);

      if (blob.size === 0) {
        console.error('Blob is empty!');
        return;
      }

      recordedBlob.value = blob;

      // Show transcribing status
      setTranscript('Transcribing with Voxtral...');

      // Send to Voxtral for transcription
      if (inputLanguage.value) {
        await store.transcribeAudio(blob, inputLanguage.value.code);
        // Update transcript from store
        setTranscript(store.currentSourceText);
      } else {
        await store.transcribeAudio(blob);
        setTranscript(store.currentSourceText);
      }

    } catch (e) {
      console.error('Error during processing:', e);
      setTranscript('Error: Could not transcribe audio');
    }
  } else {
    try {
      console.log('Starting recording...');
      recordedBlob.value = null;
      setTranscript('');
      await startRecording();
    } catch (e) {
      console.error('Start recording failed:', e);
      alert('Could not access microphone');
    }
  }
};
</script>

<template>
  <div class="main-view">
    <!-- Left Column: Input Language -->
    <LanguageColumn
      :languages="languages"
      :selectedLanguage="inputLanguage"
      type="input"
      @select="handleInputLanguageSelect"
    />

    <!-- Center Content -->
    <div class="center-content">
      <!-- Header -->
      <header>
        <h1>EasyTranslator</h1>
        <div v-if="isOffline" class="offline-badge">Offline</div>
      </header>

      <!-- Main Content Area -->
      <main>
        <!-- Permission Warnings -->
        <div v-if="permissionStatus === 'denied'" class="warning-box">
          <p>Microphone access is denied. Please enable it in your browser settings.</p>
        </div>
        <div v-else-if="permissionStatus === 'prompt'" class="warning-box">
          <p>Please allow microphone access when prompted.</p>
        </div>

        <!-- Speech Recognition Warning -->
        <div v-if="!isSpeechRecognitionSupported" class="warning-box">
          <p>Real-time transcription is not supported in this browser. Audio will still be recorded.</p>
        </div>

        <!-- Language Selection Prompt -->
        <div v-if="!canRecord" class="language-prompt">
          <p>👈 Select an input language (left) and output language (right) 👉</p>
          <p class="language-prompt-sub">to start recording</p>
        </div>

        <!-- Transcript Display (only show AFTER recording has stopped) -->
        <div v-if="canRecord && recordedBlob" class="transcript-section">
          <div class="transcript-field">
            <div class="transcript-content" :class="{ placeholder: !transcript && !store.isProcessing }">
              {{ transcript || (store.isProcessing ? 'Processing...' : 'Transcription will appear here...') }}
            </div>
            <AudioPlayer :audio-blob="recordedBlob" />
          </div>
        </div>

        <!-- Record Button -->
        <div class="controls">
          <div v-if="store.isProcessing" class="processing">
            <Loader2 class="spin" :size="48" />
            <span>Processing...</span>
          </div>

          <div v-else class="actions">
            <RecordButton
              :is-recording="isRecording"
              :volume="volume"
              :disabled="!canRecord || isOffline || permissionStatus === 'denied'"
              @toggle="handleRecordToggle"
            />
          </div>
        </div>
      </main>
    </div>

    <!-- Right Column: Output Language -->
    <LanguageColumn
      :languages="languages"
      :selectedLanguage="outputLanguage"
      type="output"
      @select="handleOutputLanguageSelect"
    />
  </div>
</template>

<style scoped>
.main-view {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.center-content {
  flex: 1;
  margin: 0 140px; /* Space for fixed columns */
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

header {
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  background: white;
  z-index: 5;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #42b883;
}

.offline-badge {
  background: #666;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

main {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  /* Don't center items - allow left alignment for transcript */
  align-items: stretch;
}

.warning-box {
  background-color: #fff3cd;
  color: #856404;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #ffeeba;
  max-width: 600px;
  width: 100%;
  align-self: center;
}

.warning-box p {
  margin: 0;
}

.language-prompt {
  text-align: center;
  padding: 3rem 2rem;
  max-width: 600px;
  align-self: center;
}

.language-prompt p {
  font-size: 1.3rem;
  color: #666;
  margin: 0.5rem 0;
}

.language-prompt-sub {
  font-size: 1rem !important;
  color: #999 !important;
  font-style: italic;
}

.transcript-section {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  /* Align to the left edge, near the left column */
  margin-left: 0;
  padding-left: 0;
}

.transcript-field {
  width: 78%;
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  border: 3px solid var(--input-language-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  /* Position field close to the left column */
  margin-right: auto;
}

.transcript-content {
  font-size: 1.4rem;
  line-height: 1.6;
  color: #333;
  min-height: 60px;
  margin-bottom: 1rem;
}

.transcript-content.placeholder {
  color: #bbb;
  font-style: italic;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 0;
  align-self: center;
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #42b883;
  min-height: 200px;
  justify-content: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
