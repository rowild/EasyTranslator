<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import Background from '../components/Background.vue'
import LanguageWheelPicker from '../components/LanguageWheelPicker.vue';
import InfoModal from '../components/InfoModal.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import RecordingVisualizer from '../components/RecordingVisualizer.vue';
import TextToSpeech from '../components/TextToSpeech.vue';
import SettingsModal from '../components/SettingsModal.vue';
import SwipeableTranslations from '../components/SwipeableTranslations.vue';
import { languages, type Language } from '../config/languages';
import { useSettingsStore } from '../stores/settings';
import { Trash2, Plus, Mic, Square, Info, Settings } from 'lucide-vue-next';

const store = useTranslationStore();
const settingsStore = useSettingsStore();
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
const sourceLang = ref<Language | null>(null);
const isTranslated = ref(false); // Track if current recording has been translated
const currentTranslationOutputLang = ref<Language | null>(null); // Locked output language for current translation

// Language picker state
const showLanguagePicker = ref(false);
const isFirstRun = ref(false);
const hasCompletedSetup = ref(false);

// Info modal state
const showInfoModal = ref(false);
const showSettingsModal = ref(false);

// Conversation history
interface ConversationPair {
  sourceText: string;
  translatedText: string;
  audioBlob: Blob;
  inputLang: Language;
  outputLang: Language;
}

const conversationHistory = ref<ConversationPair[]>([]);

// Load app-info.json for UI translations
interface AppInfoData {
  overview: { header: string; content: string };
  howToUse: { header: string; content: string };
  dataNote: { header: string; content: string };
  ui: {
    allowMic: string;
  };
}

const appInfoData = ref<Record<string, AppInfoData>>({});

// Computed property for UI translations based on source language
const uiText = computed(() => {
  const langCode = sourceLang.value?.displayCode || 'en';
  const data = appInfoData.value[langCode] || appInfoData.value['en'];
  return data?.ui || { allowMic: 'Please allow microphone access when prompted.' };
});

const hasUsableApiKey = computed(() => {
  const hasSavedKey = Boolean(settingsStore.apiKey);
  const hasDevKey = Boolean(import.meta.env.DEV && import.meta.env.VITE_MISTRAL_API_KEY);
  return hasSavedKey || hasDevKey;
});

const isExtendedMode = computed(() => settingsStore.mode === 'extended');

window.addEventListener('online', () => isOffline.value = false);
window.addEventListener('offline', () => isOffline.value = true);

// Load saved language preferences from IndexedDB (Dexie settings)
onMounted(async () => {
  // Load app-info.json for UI translations
  try {
    const response = await fetch('/app-info.json');
    appInfoData.value = await response.json();
  } catch (error) {
    console.error('Failed to load app-info.json:', error);
  }

  // Always initialize app
  hasCompletedSetup.value = true;
  store.loadHistory();
  checkPermission();

  await settingsStore.ensureLoaded();

  // Load saved source language (fallback language)
  const savedSourceCode = settingsStore.sourceLang;
  if (savedSourceCode) {
    sourceLang.value = languages.find(lang => lang.displayCode === savedSourceCode) || null;
  } else {
    // Set German as default source
    const defaultSource = languages.find(lang => lang.code === 'de-DE');
    if (defaultSource) {
      sourceLang.value = defaultSource;
      void settingsStore.setSourceLang(defaultSource.displayCode);
    }
  }

  // Load saved output language or set French as default
  const savedOutputCode = settingsStore.targetLang;
  if (savedOutputCode) {
    outputLanguage.value = languages.find(lang => lang.displayCode === savedOutputCode) || null;
  } else {
    // Set French as default target
    const defaultTarget = languages.find(lang => lang.code === 'fr-FR');
    if (defaultTarget) {
      outputLanguage.value = defaultTarget;
      void settingsStore.setTargetLang(defaultTarget.displayCode);
    }
  }
});

// Watch output language changes and persist to IndexedDB settings
watch(outputLanguage, (newLang) => {
  if (newLang) {
    void settingsStore.setTargetLang(newLang.displayCode);
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
      recordingVisualizerRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    // Try scrollIntoView on the current pair element
    if (currentPairRef.value) {
      // console.log('Scrolling current pair into view');
      currentPairRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

// Extended mode is delete-and-forget: clear in-memory history when switching into it
watch(isExtendedMode, (extended) => {
  if (extended) {
    conversationHistory.value = [];
  }
});

// Record button is only enabled when output language is selected (input is auto-detected)
const canRecord = computed(() => {
  if (isExtendedMode.value) {
    return settingsStore.extendedTargetLangs.length > 0;
  }
  return !!outputLanguage.value;
});

// Handle language picker confirmation
const handleLanguageConfirm = (payload: { source: Language | null; target: Language }) => {
  // Both languages are now required
  if (!payload.source || !payload.target) {
    console.error('Both source and target languages are required');
    return;
  }

  sourceLang.value = payload.source;
  outputLanguage.value = payload.target;

  // Persist settings
  void settingsStore.setSourceLang(payload.source.displayCode);
  void settingsStore.setTargetLang(payload.target.displayCode);

  if (isFirstRun.value) {
    // Mark as completed
    void settingsStore.setHasCompletedLanguageSetup(true);
    isFirstRun.value = false;
    hasCompletedSetup.value = true;

    // Now initialize app
    store.loadHistory();
    checkPermission();
  }

  showLanguagePicker.value = false;
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

      // Use the actual translated language from the store (might be fallback)
      currentTranslationOutputLang.value = store.actualTranslatedLanguage ? { ...store.actualTranslatedLanguage } : null;

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
      if (!hasUsableApiKey.value) {
        showSettingsModal.value = true;
        return;
      }
      // console.log('Starting recording...');
      recordedBlob.value = null;
      setTranscript('');
      isTranslated.value = false;
      currentTranslationOutputLang.value = null; // Reset locked language

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
  if (!isExtendedMode.value && recordedBlob.value && store.detectedLanguage && currentTranslationOutputLang.value) {
    // Use detected language from Voxtral
    const actualInputLang = store.detectedLanguage;

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

  // Ensure target language is set correctly from the output language selection
  if (outputLanguage.value) {
    void settingsStore.setTargetLang(outputLanguage.value.displayCode);
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
  <div class="main-view" :class="{ 'modal-open': showLanguagePicker || showInfoModal || showSettingsModal }">
    <!-- Header (Always Visible) -->
    <header>
      <h1><span>Speak</span><span>&</span><span>Translate</span></h1>
      <div v-if="isOffline" class="offline-badge">Offline</div>
    </header>

    <!-- Center Content -->
    <div class="center-content">
      <!-- Main Content Area -->
      <main v-if="hasCompletedSetup" ref="mainContainerRef">
        <!-- API Key Warning -->
        <div v-if="!hasUsableApiKey" class="warning-box api-key-warning">
          <p>Mistral API key is required to translate. Add your key in Settings.</p>
          <button class="warning-action-btn" @click="showSettingsModal = true">Open Settings</button>
        </div>

        <!-- Extended Mode Target Languages Warning -->
        <div v-else-if="isExtendedMode && settingsStore.extendedTargetLangs.length === 0" class="warning-box api-key-warning">
          <p>Extended mode requires selecting at least 1 target language. Open Settings to choose up to 10.</p>
          <button class="warning-action-btn" @click="showSettingsModal = true">Open Settings</button>
        </div>

        <!-- Permission Warnings -->
        <div v-if="permissionStatus === 'denied'" class="warning-box">
          <p>Microphone access is denied. Please enable it in your browser settings.</p>
        </div>
        <div v-else-if="permissionStatus === 'prompt'" class="warning-box">
          <p>{{ uiText.allowMic }}</p>
        </div>

        <!-- Speech Recognition Warning -->
        <div v-if="!isSpeechRecognitionSupported" class="warning-box">
          <p>Real-time transcription is not supported in this browser. Audio will still be recorded.</p>
        </div>


        <!-- Conversation History -->
        <div v-if="!isExtendedMode && conversationHistory.length > 0" class="conversation-history">
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
                <TextToSpeech :text="pair.translatedText" :lang="pair.outputLang.speechCode" />
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
              <div class="visualizer-container">
                <RecordingVisualizer :is-recording="isRecording" :analyser="analyserNode" />
              </div>
              <button
                class="inline-record-btn"
                :class="{ recording: isRecording }"
                @click="handleRecordToggle"
                :disabled="isOffline || permissionStatus === 'denied' || !hasUsableApiKey"
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
            <SwipeableTranslations
              v-if="isExtendedMode"
              :target-codes="settingsStore.extendedTargetLangs"
              :translations="store.currentTranslations"
            />
            <template v-else>
              <div class="language-indicator" v-if="currentTranslationOutputLang">
                <span class="lang-flag">{{ currentTranslationOutputLang.flag }}</span>
                <span class="lang-name">{{ currentTranslationOutputLang.nativeName }}</span>
              </div>
              <div class="transcript-field output-field">
                <div class="transcript-content" :dir="currentTranslationOutputLang?.isRTL ? 'rtl' : 'ltr'">
                  {{ store.currentTranslatedText || 'Translation...' }}
                </div>
                <TextToSpeech v-if="currentTranslationOutputLang" :text="store.currentTranslatedText" :lang="currentTranslationOutputLang.speechCode" />
              </div>
            </template>
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

    <!-- Language Picker Modal -->
    <LanguageWheelPicker
      :is-open="showLanguagePicker"
      :is-first-run="isFirstRun"
      :initial-source="sourceLang || undefined"
      :initial-target="outputLanguage || undefined"
      @confirm="handleLanguageConfirm"
      @close="showLanguagePicker = false"
    />

    <!-- Info Modal -->
    <InfoModal
      :is-open="showInfoModal"
      :source-lang="sourceLang"
      :target-lang="outputLanguage"
      @close="showInfoModal = false"
    />

    <SettingsModal
      :is-open="showSettingsModal"
      @close="showSettingsModal = false"
    />

    <!-- Fixed Footer with Controls (Always Visible) -->
    <footer class="app-footer">
      <div class="footer-left">
        <!-- Info Button (only show after setup) -->
        <button
          v-if="hasCompletedSetup"
          class="footer-info-btn"
          @click="showInfoModal = true"
          title="App information and help"
        >
          <Info :size="20" />
          <span class="info-label">Info</span>
        </button>

        <!-- Settings Button -->
        <button
          v-if="hasCompletedSetup"
          class="footer-info-btn"
          @click="showSettingsModal = true"
          title="Settings"
        >
          <Settings :size="20" />
          <span class="info-label">Settings</span>
        </button>
      </div>

      <!-- Dual Language Button (only show after setup) -->
      <button
        v-if="hasCompletedSetup"
        class="footer-lang-btn dual-lang-btn"
        @click="showLanguagePicker = true"
        :title="`Change languages: ${sourceLang?.nativeName || 'Select'} → ${outputLanguage?.nativeName || 'Select'}`"
      >
        <span class="footer-flag source-flag">{{ sourceLang?.flag || '❓' }}</span>
        <span class="footer-arrow">→</span>
        <span class="footer-flag target-flag">{{ outputLanguage?.flag || '❓' }}</span>
      </button>
    </footer>


    <Background/>
  </div>
</template>
