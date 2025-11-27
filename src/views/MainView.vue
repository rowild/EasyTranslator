<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import LanguageColumn from '../components/LanguageColumn.vue';
import RecordButton from '../components/RecordButton.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import RecordingVisualizer from '../components/RecordingVisualizer.vue';
import { languages, getSortedLanguages, type Language } from '../config/languages';
import { Loader2, Trash2, Plus } from 'lucide-vue-next';

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
  analyserNode,
  setRecognitionLanguage,
  setTranscript
} = useAudioRecorder();

const isOffline = ref(!navigator.onLine);
const recordedBlob = ref<Blob | null>(null);
const inputLanguage = ref<Language | null>(null);
const outputLanguage = ref<Language | null>(null);
const isTranslated = ref(false); // Track if current recording has been translated
const currentTranslationOutputLang = ref<Language | null>(null); // Locked output language for current translation

// Conversation history
interface ConversationPair {
  sourceText: string;
  translatedText: string;
  audioBlob: Blob;
  inputLang: Language;
  outputLang: Language;
}

const conversationHistory = ref<ConversationPair[]>([]);

// Dynamically sorted languages based on selected source language
const sortedLanguages = computed(() => getSortedLanguages(inputLanguage.value));

// Column visibility state
const isInputColumnOpen = ref(false);
const isOutputColumnOpen = ref(false);

const toggleInputColumn = () => {
  isInputColumnOpen.value = !isInputColumnOpen.value;
};

const toggleOutputColumn = () => {
  isOutputColumnOpen.value = !isOutputColumnOpen.value;
};

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

// Load saved language preferences from localStorage
onMounted(() => {
  store.loadHistory();
  checkPermission();

  const savedInputCode = localStorage.getItem('inputLanguage');
  // Use 'targetLang' key to match the store
  const savedOutputCode = localStorage.getItem('targetLang');

  if (savedInputCode) {
    inputLanguage.value = languages.find(lang => lang.code === savedInputCode) || null;
  }

  if (savedOutputCode) {
    // Find by displayCode since that's what's stored in the store
    outputLanguage.value = languages.find(lang => lang.displayCode === savedOutputCode) || null;
    // Make sure store is in sync
    if (outputLanguage.value) {
      store.setTargetLang(outputLanguage.value.displayCode);
    }
  }
});

// Watch input language changes and update SpeechRecognition
watch(inputLanguage, (newLang) => {
  if (newLang) {
    localStorage.setItem('inputLanguage', newLang.code);
    setRecognitionLanguage(newLang.speechCode);
  }
});

// Watch output language changes and sync with store and localStorage
watch(outputLanguage, (newLang) => {
  if (newLang) {
    // This will also save to localStorage as 'targetLang'
    store.setTargetLang(newLang.displayCode);
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
  // Note: The watcher will automatically sync with store.setTargetLang()
  console.log('Output language set to:', language.nativeName, language.displayCode);
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

      // Show processing status
      setTranscript('Processing with Voxtral...');

      // Send to Voxtral for combined transcription and translation
      await store.transcribeAndTranslate(blob);

      // Update transcript from store
      setTranscript(store.currentSourceText);

      // Mark as translated since we got both in one call
      isTranslated.value = true;

      // Lock the output language for this translation (create a copy to prevent reactivity)
      currentTranslationOutputLang.value = outputLanguage.value ? { ...outputLanguage.value } : null;

      console.log('After transcription & translation:');
      console.log('- Source text:', store.currentSourceText);
      console.log('- Detected language:', store.detectedLanguage);
      console.log('- Translated text:', store.currentTranslatedText);
      console.log('- Locked output language:', currentTranslationOutputLang.value?.nativeName);

    } catch (e) {
      console.error('Error during processing:', e);
      setTranscript('Error: Could not process audio');
      isTranslated.value = false;
    }
  } else {
    try {
      console.log('Starting recording...');
      recordedBlob.value = null;
      setTranscript('');
      isTranslated.value = false;
      currentTranslationOutputLang.value = null; // Reset locked language

      // Close both language columns when starting recording
      isInputColumnOpen.value = false;
      isOutputColumnOpen.value = false;

      await startRecording();
    } catch (e) {
      console.error('Start recording failed:', e);
      alert('Could not access microphone');
    }
  }
};

const handleDeleteRecording = () => {
  console.log('Deleting current recording...');
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  currentTranslationOutputLang.value = null; // Reset locked language
  store.currentTranslatedText = '';
  store.detectedLanguage = null;
};


const handleNewRecording = () => {
  console.log('Starting new recording...');

  // Save current conversation pair to history
  if (recordedBlob.value && inputLanguage.value && currentTranslationOutputLang.value) {
    // Use detected language if available, otherwise use selected input language
    const actualInputLang = store.detectedLanguage || inputLanguage.value;

    // Use the locked output language (already a copy, no need to spread again)
    conversationHistory.value.push({
      sourceText: transcript.value,
      translatedText: store.currentTranslatedText,
      audioBlob: recordedBlob.value,
      inputLang: { ...actualInputLang },
      outputLang: currentTranslationOutputLang.value,
    });
    console.log('Saved to history. Total pairs:', conversationHistory.value.length);
  }

  // Reset for new recording
  recordedBlob.value = null;
  currentTranslationOutputLang.value = null; // Reset locked language
  setTranscript('');
  isTranslated.value = false;
  store.currentTranslatedText = '';
  store.detectedLanguage = null;
};
</script>

<template>
  <div class="main-view">
    <!-- Left Column: Input Language -->
    <LanguageColumn
      :languages="sortedLanguages"
      :selectedLanguage="inputLanguage"
      :sourceLanguage="inputLanguage"
      :isOpen="isInputColumnOpen"
      type="input"
      @select="handleInputLanguageSelect"
      @toggle="toggleInputColumn"
    />

    <!-- Center Content -->
    <div class="center-content">
      <!-- Header -->
      <header>
        <h1>Speak and Translate</h1>
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

        <!-- Conversation History -->
        <div v-if="conversationHistory.length > 0" class="conversation-history">
          <div v-for="(pair, index) in conversationHistory" :key="index" class="conversation-pair history-pair">
            <!-- Input (Source) -->
            <div class="input-output-row">
              <div class="language-indicator">
                <span class="lang-flag">{{ pair.inputLang.flag }}</span>
                <span class="lang-name">{{ pair.inputLang.nativeName }}</span>
              </div>
              <div class="transcript-field input-field">
                <div class="transcript-content">{{ pair.sourceText }}</div>
                <AudioPlayer :audio-blob="pair.audioBlob" />
              </div>
            </div>

            <!-- Output (Translation) -->
            <div class="input-output-row output-row">
              <div class="language-indicator">
                <span class="lang-flag">{{ pair.outputLang.flag }}</span>
                <span class="lang-name">{{ pair.outputLang.nativeName }}</span>
              </div>
              <div class="transcript-field output-field">
                <div class="transcript-content">{{ pair.translatedText }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recording Visualizer (only show WHILE recording) -->
        <div v-if="isRecording" class="conversation-pair">
          <div class="input-output-row">
            <div class="language-indicator" v-if="inputLanguage">
              <span class="lang-flag">{{ inputLanguage.flag }}</span>
              <span class="lang-name">{{ inputLanguage.nativeName }}</span>
            </div>
            <RecordingVisualizer :is-recording="isRecording" :analyser="analyserNode" />
          </div>
        </div>

        <!-- Current Input/Output Pair (only show AFTER recording has stopped) -->
        <div v-if="canRecord && recordedBlob" class="conversation-pair">
          <!-- Input (Source) Section -->
          <div class="input-output-row">
            <div class="language-indicator" v-if="store.detectedLanguage || inputLanguage">
              <span class="lang-flag">{{ (store.detectedLanguage || inputLanguage)?.flag }}</span>
              <span class="lang-name">{{ (store.detectedLanguage || inputLanguage)?.nativeName }}</span>
            </div>
            <div class="field-with-actions">
              <div class="transcript-field input-field">
                <div class="transcript-content" :class="{ placeholder: !transcript && !store.isProcessing }">
                  {{ transcript || (store.isProcessing ? 'Processing...' : 'Transcription will appear here...') }}
                </div>
                <AudioPlayer :audio-blob="recordedBlob" />
              </div>

              <!-- Action buttons -->
              <div class="action-buttons">
                <button class="delete-btn" @click="handleDeleteRecording" title="Delete recording and start over">
                  <Trash2 :size="24" />
                </button>
              </div>
            </div>
          </div>

          <!-- Output (Translation) Section (only show AFTER translation) -->
          <div v-if="isTranslated" class="input-output-row output-row">
            <div class="language-indicator" v-if="currentTranslationOutputLang">
              <span class="lang-flag">{{ currentTranslationOutputLang.flag }}</span>
              <span class="lang-name">{{ currentTranslationOutputLang.nativeName }}</span>
            </div>
            <div class="transcript-field output-field">
              <div class="transcript-content">
                {{ store.currentTranslatedText || 'Translation...' }}
              </div>
            </div>
          </div>

          <!-- Plus button to start new recording (only show AFTER translation) -->
          <div v-if="isTranslated" class="new-recording-section">
            <button class="plus-btn" @click="handleNewRecording" title="Start new recording">
              <Plus :size="32" />
            </button>
          </div>
        </div>

      </main>
    </div>

    <!-- Right Column: Output Language -->
    <LanguageColumn
      :languages="sortedLanguages"
      :selectedLanguage="outputLanguage"
      :sourceLanguage="inputLanguage"
      :isOpen="isOutputColumnOpen"
      type="output"
      @select="handleOutputLanguageSelect"
      @toggle="toggleOutputColumn"
    />

    <!-- Fixed Footer with Controls -->
    <footer class="app-footer">
      <!-- Input Language Button -->
      <button
        class="footer-lang-btn input-lang-btn"
        :class="{ 'selected': inputLanguage }"
        @click="toggleInputColumn"
        :title="inputLanguage ? inputLanguage.nativeName : 'Select input language'"
      >
        <span class="footer-flag">{{ inputLanguage?.flag || '🇩🇪' }}</span>
      </button>

      <!-- Record Button (always visible, disabled when recording exists) -->
      <div v-if="canRecord" class="footer-record-container">
        <div v-if="store.isProcessing" class="processing-footer">
          <Loader2 class="spin" :size="32" />
        </div>
        <div v-else>
          <RecordButton
            :is-recording="isRecording"
            :volume="volume"
            :disabled="isOffline || permissionStatus === 'denied' || recordedBlob !== null"
            @toggle="handleRecordToggle"
          />
        </div>
      </div>

      <!-- Output Language Button -->
      <button
        class="footer-lang-btn output-lang-btn"
        :class="{ 'selected': outputLanguage }"
        @click="toggleOutputColumn"
        :title="outputLanguage ? outputLanguage.nativeName : 'Select output language'"
      >
        <span class="footer-flag">{{ outputLanguage?.flag || '🇫🇷' }}</span>
      </button>
    </footer>
  </div>
</template>

<style scoped>
.main-view {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.center-content {
  width: 100%;
  max-width: 1024px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

header {
  width: 100%;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  backdrop-filter: blur(10px);
  z-index: 5;
}

h1 {
  margin: 0;
  font-size: 2.5rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  text-align: left;
  letter-spacing: 0.5px;
  flex: 1;
  width: 100%;
}

.offline-badge {
  position: absolute;
  right: 2rem;
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
  padding-bottom: 90px; /* Space for footer */
  display: flex;
  flex-direction: column;
  gap: 2rem;
  /* Don't center items - allow left alignment for transcript */
  align-items: stretch;
  background: transparent;
}

.warning-box {
  background-color: rgba(255, 243, 205, 0.3);
  color: rgba(255, 255, 255, 0.9);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 238, 186, 0.5);
  backdrop-filter: blur(10px);
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
  color: rgba(255, 255, 255, 0.9);
  margin: 0.5rem 0;
}

.language-prompt-sub {
  font-size: 1rem !important;
  color: rgba(255, 255, 255, 0.7) !important;
  font-style: italic;
}

.conversation-history {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
}

.conversation-pair {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-pair {
  opacity: 0.8;
}

.input-output-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  padding-left: 2rem;
}

.field-with-actions {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}

.output-row {
  align-items: flex-end;
  padding-left: 0;
  padding-right: 2rem;
}

.output-row .field-with-actions {
  justify-content: flex-end;
}

.language-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0;
}

.lang-flag {
  font-size: 1.5rem;
  line-height: 1;
}

.lang-name {
  font-weight: 600;
  letter-spacing: 0.3px;
}

.transcript-field {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.input-field {
  width: 78%;
  border: 3px solid var(--input-language-border);
}

.output-field {
  width: 78%;
  border: 3px solid var(--output-language-border);
  margin-left: auto;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: space-between;
  align-self: flex-end;
  flex-shrink: 0;
  height: 100%;
}

.delete-btn,
.send-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn {
  width: 40px;
  height: 40px;
  border-color: white;
  color: white;
  background: transparent;
}

.delete-btn:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  transform: scale(1.05);
}

.send-btn {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.send-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn:active,
.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.new-recording-section {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  margin-bottom: 2rem;
}

.plus-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid var(--primary-color);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(157, 23, 68, 0.3);
}

.plus-btn:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(157, 23, 68, 0.4);
}

.plus-btn:active {
  transform: scale(0.95);
}

.transcript-content {
  font-size: 1.4rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.95);
  min-height: 60px;
  margin-bottom: 1rem;
}

.transcript-content.placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Fixed Footer */
.app-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: var(--secondary-color);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  z-index: 100;
}

.footer-lang-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.5rem;
}

.footer-lang-btn:hover {
  transform: scale(1.1);
}

.footer-lang-btn:active {
  transform: scale(0.95);
}

.footer-flag {
  font-size: 2.5rem;
  line-height: 1;
}

.footer-record-container {
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-12px);
}

.footer-record-container :deep(.record-wrapper) {
  width: 110px;
  height: 110px;
}

.processing-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  width: 110px;
  height: 110px;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .center-content {
    width: 100%;
    max-width: 100%;
  }

  header {
    padding: 0.75rem 1rem;
  }

  h1 {
    font-size: 1.8rem;
  }

  main {
    padding: 1rem;
    padding-bottom: 80px;
    gap: 1rem;
  }

  .app-footer {
    height: 60px;
    padding: 0 1rem;
  }

  .footer-flag {
    font-size: 2rem;
  }

  .footer-record-container :deep(.record-wrapper) {
    width: 110px;
    height: 110px;
  }

  .processing-footer {
    width: 110px;
    height: 110px;
  }

  .input-output-row {
    padding-left: 1rem;
  }

  .output-row {
    padding-right: 1rem;
  }

  .language-indicator {
    font-size: 0.8rem;
  }

  .lang-flag {
    font-size: 1.2rem;
  }

  .transcript-field {
    padding: 0.75rem;
  }

  .transcript-content {
    font-size: 0.9rem;
    line-height: 1.4;
    min-height: 40px;
    margin-bottom: 0.5rem;
  }

  .input-field,
  .output-field {
    width: 75%;
  }

  .action-buttons {
    gap: 0.3rem;
  }

  .delete-btn,
  .send-btn {
    width: 44px;
    height: 44px;
  }

  .plus-btn {
    width: 56px;
    height: 56px;
    border-width: 2px;
  }

  .language-prompt p {
    font-size: 1rem;
  }

  .language-prompt-sub {
    font-size: 0.85rem !important;
  }

  .conversation-history {
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
  }

  .conversation-pair {
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .center-content {
    width: 100%;
    max-width: 100%;
  }

  header {
    padding: 0.5rem 0.75rem;
  }

  h1 {
    font-size: 1.4rem;
  }

  main {
    padding: 0.75rem;
    padding-bottom: 70px;
    gap: 0.75rem;
  }

  .app-footer {
    height: 55px;
    padding: 0 0.75rem;
  }

  .footer-flag {
    font-size: 1.8rem;
  }

  .footer-record-container :deep(.record-wrapper) {
    width: 90px;
    height: 90px;
  }

  .processing-footer {
    width: 90px;
    height: 90px;
  }

  .input-output-row {
    padding-left: 0.5rem;
  }

  .output-row {
    padding-right: 0.5rem;
  }

  .language-indicator {
    font-size: 0.7rem;
  }

  .lang-flag {
    font-size: 1rem;
  }

  .transcript-field {
    padding: 0.5rem;
  }

  .transcript-content {
    font-size: 0.8rem;
    line-height: 1.3;
    min-height: 30px;
    margin-bottom: 0.4rem;
  }

  .input-field,
  .output-field {
    width: 70%;
  }

  .action-buttons {
    gap: 0.25rem;
  }

  .delete-btn,
  .send-btn {
    width: 38px;
    height: 38px;
  }

  .plus-btn {
    width: 48px;
    height: 48px;
  }

  .language-prompt {
    padding: 2rem 1rem;
  }

  .language-prompt p {
    font-size: 0.9rem;
  }

  .language-prompt-sub {
    font-size: 0.75rem !important;
  }

  .conversation-history {
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .conversation-pair {
    gap: 0.5rem;
  }
}
</style>
