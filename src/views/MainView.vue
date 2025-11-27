<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import LanguageColumn from '../components/LanguageColumn.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import RecordingVisualizer from '../components/RecordingVisualizer.vue';
import { languages, getSortedLanguages, type Language } from '../config/languages';
import { Trash2, Plus, Mic, Square } from 'lucide-vue-next';

const store = useTranslationStore();
const {
  isRecording,
  startRecording,
  stopRecording,
  permissionStatus,
  checkPermission,
  transcript,
  isSpeechRecognitionSupported,
  analyserNode,
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

// Languages sorted by native name (no input language selection)
const sortedLanguages = computed(() => getSortedLanguages(null));

// Column visibility state
const isOutputColumnOpen = ref(false);

const toggleOutputColumn = () => {
  isOutputColumnOpen.value = !isOutputColumnOpen.value;
};

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

// Load saved language preferences from localStorage
onMounted(() => {
  store.loadHistory();
  checkPermission();

  // Use 'targetLang' key to match the store
  const savedOutputCode = localStorage.getItem('targetLang');

  if (savedOutputCode) {
    // Find by displayCode since that's what's stored in the store
    outputLanguage.value = languages.find(lang => lang.displayCode === savedOutputCode) || null;
    // Make sure store is in sync
    if (outputLanguage.value) {
      store.setTargetLang(outputLanguage.value.displayCode);
    }
  } else {
    // Set French as default
    outputLanguage.value = languages.find(lang => lang.code === 'fr-FR') || null;
    if (outputLanguage.value) {
      store.setTargetLang(outputLanguage.value.displayCode);
    }
  }
});

// Watch output language changes and sync with store and localStorage
watch(outputLanguage, (newLang) => {
  if (newLang) {
    // This will also save to localStorage as 'targetLang'
    store.setTargetLang(newLang.displayCode);
  }
});

// Ref for main container to control scrolling
const mainContainerRef = ref<HTMLElement | null>(null);
const currentPairRef = ref<HTMLElement | null>(null);
const recordingVisualizerRef = ref<HTMLElement | null>(null);

// Function to scroll newest content into view
const scrollToTop = () => {
  const forceScroll = () => {
    // Try scrollIntoView on the recording visualizer (when recording)
    if (recordingVisualizerRef.value) {
      console.log('Scrolling recording visualizer into view');
      recordingVisualizerRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Try scrollIntoView on the current pair element
    if (currentPairRef.value) {
      // console.log('Scrolling current pair into view');
      currentPairRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Fallback to manual scroll
    if (mainContainerRef.value) {
      const container = mainContainerRef.value;
      const maxScroll = container.scrollHeight - container.clientHeight;

      // console.log('Manual scroll - Before: scrollTop =', container.scrollTop, 'maxScroll =', maxScroll);

      // Try scrollTo first
      container.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });

      // Then force scrollTop
      setTimeout(() => {
        container.scrollTop = maxScroll;
        // console.log('Manual scroll - After: scrollTop =', container.scrollTop);
      }, 50);
    }
  };

  // Force scroll after DOM updates
  nextTick(() => {
    // forceScroll();
    // setTimeout(forceScroll, 100);
    setTimeout(forceScroll, 300);
  });
};

// Auto-scroll to top when recording starts
watch(isRecording, (recording) => {
  if (recording) {
    scrollToTop();
  }
});

// Auto-scroll to top when translation completes
watch(isTranslated, (translated) => {
  if (translated) {
    scrollToTop();
  }
});

// Auto-scroll to top when conversation history changes (new translation added)
watch(() => conversationHistory.value.length, () => {
  scrollToTop();
});

// Also scroll when recordedBlob changes (new recording available)
watch(recordedBlob, (blob) => {
  if (blob) {
    scrollToTop();
  }
});

// Record button is only enabled when output language is selected (input is auto-detected)
const canRecord = computed(() => {
  return !!outputLanguage.value;
});

const handleOutputLanguageSelect = (language: Language) => {
  outputLanguage.value = language;
  // Note: The watcher will automatically sync with store.setTargetLang()
  // console.log('Output language set to:', language.nativeName, language.displayCode);
};

const handleRecordToggle = async () => {
  if (isRecording.value) {
    try {
      // console.log('Stopping recording...');
      const blob = await stopRecording();
      // console.log('Recording stopped. Blob received:', blob);

      if (blob.size === 0) {
        // console.error('Blob is empty!');
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

      // console.log('After transcription & translation:');
      // console.log('- Source text:', store.currentSourceText);
      // console.log('- Detected language:', store.detectedLanguage);
      // console.log('- Translated text:', store.currentTranslatedText);
      // console.log('- Locked output language:', currentTranslationOutputLang.value?.nativeName);

    } catch (e) {
      console.error('Error during processing:', e);
      setTranscript('Error: Could not process audio');
      isTranslated.value = false;
    }
  } else {
    try {
      // console.log('Starting recording...');
      recordedBlob.value = null;
      setTranscript('');
      isTranslated.value = false;
      currentTranslationOutputLang.value = null; // Reset locked language

      // Close language column when starting recording
      isOutputColumnOpen.value = false;

      await startRecording();
    } catch (e) {
      console.error('Start recording failed:', e);
      alert('Could not access microphone');
    }
  }
};

const handleDeleteRecording = () => {
  // console.log('Deleting current recording...');
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  currentTranslationOutputLang.value = null; // Reset locked language
  store.currentTranslatedText = '';
  store.detectedLanguage = null;
};


const handleNewRecording = async () => {
  // console.log('Starting new recording...');

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

  // Close any open language selection column
  isOutputColumnOpen.value = false;

  // Reset for new recording
  recordedBlob.value = null;
  currentTranslationOutputLang.value = null; // Reset locked language
  setTranscript('');
  isTranslated.value = false;
  store.currentTranslatedText = '';
  store.detectedLanguage = null;

  // Ensure target language is set correctly from the output language selection
  if (outputLanguage.value) {
    store.setTargetLang(outputLanguage.value.displayCode);
    // console.log('Target language confirmed:', outputLanguage.value.nativeName, outputLanguage.value.displayCode);
  } else {
    console.warn('No output language selected!');
  }

  // Automatically start recording (button will appear as red/active)
  try {
    await startRecording();
    // console.log('Auto-started new recording');
  } catch (error) {
    console.error('Failed to auto-start recording:', error);
  }
};
</script>

<template>
  <div class="main-view">
    <!-- Center Content -->
    <div class="center-content">
      <!-- Header -->
      <header>
        <h1>Speak and Translate</h1>
        <div v-if="isOffline" class="offline-badge">Offline</div>
      </header>

      <!-- Main Content Area -->
      <main ref="mainContainerRef">
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
                <div class="transcript-content" :dir="pair.inputLang.isRTL ? 'rtl' : 'ltr'">{{ pair.sourceText }}</div>
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
                <div class="transcript-content" :dir="pair.outputLang.isRTL ? 'rtl' : 'ltr'">{{ pair.translatedText }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recording Visualizer with inline record button (show while recording OR ready to record and no result) -->
        <div v-if="(isRecording || (canRecord && !recordedBlob)) && !store.isProcessing" class="conversation-pair" ref="recordingVisualizerRef">
          <div class="input-output-row">
            <div class="language-indicator" v-if="inputLanguage">
              <span class="lang-flag">{{ inputLanguage.flag }}</span>
              <span class="lang-name">{{ inputLanguage.nativeName }}</span>
            </div>
            <div class="visualizer-with-button">
              <RecordingVisualizer :is-recording="isRecording" :analyser="analyserNode" />
              <button
                class="inline-record-btn"
                :class="{ recording: isRecording }"
                @click="handleRecordToggle"
                :disabled="isOffline || permissionStatus === 'denied'"
                :title="isRecording ? 'Stop recording' : 'Start recording'"
              >
                <Square v-if="isRecording" :size="24" />
                <Mic v-else :size="24" />
              </button>
            </div>
          </div>
        </div>

        <!-- Current Input/Output Pair (only show AFTER recording has stopped) -->
        <div v-if="canRecord && recordedBlob" class="conversation-pair" ref="currentPairRef">
          <!-- Input (Source) Section -->
          <div class="input-output-row">
            <div class="language-indicator" v-if="store.detectedLanguage || inputLanguage">
              <span class="lang-flag">{{ (store.detectedLanguage || inputLanguage)?.flag }}</span>
              <span class="lang-name">{{ (store.detectedLanguage || inputLanguage)?.nativeName }}</span>
            </div>
            <div class="field-with-actions">
              <div class="transcript-field input-field">
                <div class="transcript-content" :class="{ placeholder: !transcript && !store.isProcessing }" :dir="(store.detectedLanguage || inputLanguage)?.isRTL ? 'rtl' : 'ltr'">
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
              <div class="transcript-content" :dir="currentTranslationOutputLang?.isRTL ? 'rtl' : 'ltr'">
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
      :sourceLanguage="null"
      :isOpen="isOutputColumnOpen"
      type="output"
      @select="handleOutputLanguageSelect"
      @toggle="toggleOutputColumn"
    />

    <!-- Fixed Footer with Controls -->
    <footer class="app-footer">
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
