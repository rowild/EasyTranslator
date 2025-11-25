<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import LanguageSelector from '../components/LanguageSelector.vue';
import RecordButton from '../components/RecordButton.vue';
import ConversationList from '../components/ConversationList.vue';
import { Volume2, Loader2 } from 'lucide-vue-next';

const store = useTranslationStore();
const { isRecording, startRecording, stopRecording, audioBlob } = useAudioRecorder();

const isOffline = ref(!navigator.onLine);

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

onMounted(() => {
  store.loadHistory();
});

const handleRecordToggle = async () => {
  if (isRecording.value) {
    stopRecording();
    // Wait for blob to be populated (next tick or watch)
    // In composable, onstop sets the blob. We need to wait a tiny bit or watch it.
    // Better: watch audioBlob in composable or just wait.
    setTimeout(async () => {
      if (audioBlob.value) {
        try {
          await store.transcribeAudio(audioBlob.value);
          await store.translateText();
        } catch (e) {
          console.error(e);
        }
      }
    }, 100);
  } else {
    try {
      await startRecording();
    } catch (e) {
      alert('Could not access microphone');
    }
  }
};

const playTranslation = () => {
  if (store.currentTranslatedText) {
    const utter = new SpeechSynthesisUtterance(store.currentTranslatedText);
    utter.lang = store.targetLang; // e.g. 'it' -> 'it-IT' ideally, but 'it' works
    speechSynthesis.speak(utter);
  }
};
</script>

<template>
  <div class="main-view">
    <header>
      <h1>EasyTranslator</h1>
      <div v-if="isOffline" class="offline-badge">Offline</div>
    </header>

    <main>
      <!-- Current Turn Display -->
      <div class="current-turn">
        <div class="panel source">
          <label>You said:</label>
          <div class="content">{{ store.currentSourceText || '...' }}</div>
        </div>

        <div class="panel target">
          <label>Translation:</label>
          <div class="content">{{ store.currentTranslatedText || '...' }}</div>
          <button 
            v-if="store.currentTranslatedText" 
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
          <Loader2 class="spin" />
          <span>Processing...</span>
        </div>
        
        <div v-else class="actions">
          <RecordButton 
            :is-recording="isRecording" 
            :disabled="isOffline"
            @toggle="handleRecordToggle" 
          />
        </div>

        <LanguageSelector />
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
  text-align: center;
  border-bottom: 1px solid #eee;
  position: relative;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #42b883;
}

.offline-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
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
  min-height: 80px;
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
  font-size: 1.2rem;
  line-height: 1.4;
}

.play-btn {
  margin-top: 1rem;
  align-self: center;
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
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #42b883;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.history-section h3 {
  margin-top: 0;
  color: #888;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
