<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import LanguageSelector from '../components/LanguageSelector.vue';
import RecordButton from '../components/RecordButton.vue';
import ConversationList from '../components/ConversationList.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import { Volume2, Loader2 } from 'lucide-vue-next';

const store = useTranslationStore();
const {
  isRecording,
  startRecording,
  stopRecording,
  volume,
  permissionStatus,
  checkPermission,
  transcript,
  isSpeechRecognitionSupported
} = useAudioRecorder();

const isOffline = ref(!navigator.onLine);
const recordedBlob = ref<Blob | null>(null);

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

onMounted(() => {
  store.loadHistory();
  checkPermission();
});

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

      // NOTE: Voxtral integration is disabled for now as per user request
      // The transcript from Web Speech API is already displayed in the first field
      // Future: Send blob to Voxtral and show result in SECOND field (translation panel)

    } catch (e) {
      console.error('Error during processing:', e);
    }
  } else {
    try {
      console.log('Starting recording...');
      store.currentSourceText = '';
      store.currentTranslatedText = '';
      recordedBlob.value = null;
      await startRecording();
    } catch (e) {
      console.error('Start recording failed:', e);
      alert('Could not access microphone');
    }
  }
};

const playTranslation = () => {
  if (store.currentTranslatedText && store.currentTranslatedText !== 'Translating...') {
    const utter = new SpeechSynthesisUtterance(store.currentTranslatedText);
    utter.lang = store.targetLang; 
    speechSynthesis.speak(utter);
  }
};
</script>

<template>
  <div class="main-view">
    <header>
      <h1>EasyTranslator</h1>
      <div class="header-controls">
         <LanguageSelector />
         <div v-if="isOffline" class="offline-badge">Offline</div>
      </div>
    </header>

    <main>
      <!-- Permission Warning -->
      <div v-if="permissionStatus === 'denied'" class="permission-warning">
        <p>Microphone access is denied. Please enable it in your browser settings.</p>
      </div>
      <div v-else-if="permissionStatus === 'prompt'" class="permission-warning">
        <p>Please allow microphone access when prompted.</p>
      </div>

      <!-- Speech Recognition Warning -->
      <div v-if="!isSpeechRecognitionSupported" class="permission-warning">
        <p>Real-time transcription is not supported in this browser. Audio will still be recorded.</p>
      </div>

      <!-- Current Turn Display -->
      <div class="current-turn">
        <div class="panel source">
          <label>You said:</label>
          <div class="content" :class="{ placeholder: !transcript && !isRecording }">
            {{ transcript || (isRecording ? 'Listening...' : 'Press record and speak...') }}
          </div>
          <AudioPlayer :audio-blob="recordedBlob" />
        </div>

        <div class="panel target">
          <label>Translation:</label>
          <div class="content" :class="{ placeholder: !store.currentTranslatedText }">
            {{ store.currentTranslatedText || 'Translation will appear here...' }}
          </div>
          <button 
            v-if="store.currentTranslatedText && store.currentTranslatedText !== 'Translating...'" 
            class="play-btn" 
            @click="playTranslation"
          >
            <Volume2 :size="32" />
            <span>Play</span>
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <div v-if="store.isProcessing" class="processing">
          <Loader2 class="spin" :size="48" />
          <span>Processing...</span>
        </div>
        
        <div v-else class="actions">
          <RecordButton 
            :is-recording="isRecording" 
            :volume="volume"
            :disabled="isOffline || permissionStatus === 'denied'"
            @toggle="handleRecordToggle" 
          />
        </div>
      </div>

      <!-- History -->
      <div class="history-section">
        <h3>History</h3>
        <ConversationList />
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  background-color: #fff;
  color: #333;
}

header {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}

h1 {
  margin: 0;
  font-size: 1.2rem;
  color: #42b883;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.offline-badge {
  background: #666;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

main {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.current-turn {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #eee;
  min-height: 100px;
  display: flex;
  flex-direction: column;
}

.panel label {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 0.5rem;
}

.panel.target {
  background: #eafaf1;
  border-color: #ccebd6;
}

.content {
  font-size: 1.3rem;
  line-height: 1.4;
}

.content.placeholder {
  color: #ccc;
  font-style: italic;
}

.play-btn {
  margin-top: 1rem;
  align-self: flex-end; /* Move to right */
  background: #42b883;
  color: white;
  border: none;
  border-radius: 24px;
  padding: 0.5rem 1.5rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
  /* Removed borders to make it cleaner */
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #42b883;
  min-height: 200px; /* Keep space occupied */
  justify-content: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.permission-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #ffeeba;
}

.history-section h3 {
  margin-top: 0;
  color: #888;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
