<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import { useRouter } from 'vue-router';
import Background from '../components/Background.vue'
import InfoModal from '../components/InfoModal.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import RecordingVisualizer from '../components/RecordingVisualizer.vue';
import SettingsModal from '../components/SettingsModal.vue';
import TranslationBubblesList from '../components/TranslationBubblesList.vue';
import UsageStats from '../components/UsageStats.vue';
import TargetLanguagesModal from '../components/TargetLanguagesModal.vue';
import { languages, type Language } from '../config/languages';
import { useSettingsStore } from '../stores/settings';
import { useTranscriptionsStore } from '../stores/transcriptions';
import { Trash2, Mic, Square, Info, Settings, RotateCcw, Flag, Save, Check, Bookmark } from 'lucide-vue-next';

const store = useTranslationStore();
const settingsStore = useSettingsStore();
const transcriptionsStore = useTranscriptionsStore();
const router = useRouter();
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
const outputLanguage = ref<Language | null>(null);
const sourceLang = ref<Language | null>(null);
const isTranslated = ref(false); // Track if current recording has been translated

const saveState = ref<'idle' | 'saving' | 'saved'>('idle');

const hasCompletedSetup = ref(false);

// Info modal state
const showInfoModal = ref(false);
const showSettingsModal = ref(false);
const showTargetLanguagesModal = ref(false);
const hasPromptedForTargetLanguages = ref(false);

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

const maybePromptForTargetLanguages = () => {
  if (hasPromptedForTargetLanguages.value) return;
  if (!settingsStore.isLoaded) return;
  if (!hasUsableApiKey.value) return;
  if (settingsStore.extendedTargetLangs.length > 0) return;
  if (showSettingsModal.value) return;
  showTargetLanguagesModal.value = true;
  hasPromptedForTargetLanguages.value = true;
};

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

  maybePromptForTargetLanguages();
});

// Watch output language changes and persist to IndexedDB settings
watch(outputLanguage, (newLang) => {
  if (newLang) {
    void settingsStore.setTargetLang(newLang.displayCode);
  }
});

watch(
  [
    () => settingsStore.isLoaded,
    () => hasUsableApiKey.value,
    () => settingsStore.extendedTargetLangs.length,
    () => showSettingsModal.value,
  ],
  () => maybePromptForTargetLanguages(),
  { immediate: true }
);

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

// Also scroll when recordedBlob changes (new recording available)
watch(recordedBlob, (blob) => {
  if (blob) {
    scrollToTop();
  }
});

// Record button is only enabled when output language is selected (input is auto-detected)
const canRecord = computed(() => {
  return settingsStore.extendedTargetLangs.length > 0;
});

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

      // console.log('After transcription & translation:');
      // console.log('- Source text:', store.currentSourceText);
      // console.log('- Detected language:', store.detectedLanguage);
      // console.log('- Translated text:', store.currentTranslatedText);

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
      store.lastUsage = null;
      store.currentTranslatedText = '';
      store.currentTranslations = {};
      store.detectedLanguage = null;
      store.actualTranslatedLanguage = null;
      saveState.value = 'idle';

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
  store.currentTranslatedText = '';
  store.currentTranslations = {};
  store.lastUsage = null;
  store.detectedLanguage = null;
  store.actualTranslatedLanguage = null;
  saveState.value = 'idle';
};


const handleNewRecording = async () => {
  // console.log('Starting new recording...');

  if (!hasUsableApiKey.value) {
    showSettingsModal.value = true;
    return;
  }

  if (settingsStore.extendedTargetLangs.length === 0) {
    showTargetLanguagesModal.value = true;
    return;
  }

  // Reset for new recording
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  store.currentTranslatedText = '';
  store.currentTranslations = {};
  store.lastUsage = null;
  store.detectedLanguage = null;
  store.actualTranslatedLanguage = null;
  saveState.value = 'idle';

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

const handleSaveTranscription = async () => {
  if (saveState.value !== 'idle') return;
  if (!recordedBlob.value) return;
  if (!isTranslated.value) return;

  saveState.value = 'saving';
  try {
    await transcriptionsStore.addNew({
      audioBlob: recordedBlob.value,
      sourceText: store.currentSourceText,
      sourceLang: store.currentSourceLang,
      targetCodes: [...settingsStore.extendedTargetLangs],
      translations: { ...store.currentTranslations },
    });
    saveState.value = 'saved';
  } catch (error) {
    console.error('Failed to save transcription:', error);
    saveState.value = 'idle';
    alert('Could not save transcript. Please try again.');
  }
};

const formatLanguageLabel = (language: Language | null) => {
  if (!language) return '';
  const native = language.nativeName;
  let localizedName = language.name;
  try {
    const dn = new Intl.DisplayNames([language.code, 'en'], { type: 'language', fallback: 'none' });
    const value = dn.of(language.displayCode);
    if (value && value !== language.displayCode) localizedName = value;
  } catch {
    // Intl.DisplayNames might not be available in all browsers; fallback to English name.
  }
  if (!localizedName) return native;
  if (native.trim().toLowerCase() === localizedName.trim().toLowerCase()) return native;
  return `${native} (${localizedName})`;
};
</script>

<template>
  <div class="main-view" :class="{ 'modal-open': showInfoModal || showSettingsModal || showTargetLanguagesModal }">
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
          <p>Please select up to 10 languages you want to transcribe your spoken text to.</p>
          <button class="warning-action-btn" @click="showTargetLanguagesModal = true" type="button">Select target languages</button>
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


        <!-- Conversation history removed (extended-only). -->

        <!-- Recording Visualizer with inline record button (show while recording OR ready to record and no result) -->
        <div v-if="(isRecording || (canRecord && !recordedBlob)) && !store.isProcessing" class="conversation-pair" ref="recordingVisualizerRef">
          <div class="input-output-row">
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
        <div v-if="canRecord && recordedBlob" class="conversation-pair current-pair" ref="currentPairRef">
          <!-- Input (Source) Section -->
          <div class="input-output-row">
            <div class="language-indicator" v-if="store.detectedLanguage">
              <span class="lang-flag">{{ store.detectedLanguage.flag }}</span>
              <span class="lang-name">{{ formatLanguageLabel(store.detectedLanguage) }}</span>
            </div>
            <div class="field-with-actions">
              <div class="transcript-field input-field">
                <div class="transcript-content" :class="{ placeholder: !transcript && !store.isProcessing }" :dir="store.detectedLanguage?.isRTL ? 'rtl' : 'ltr'">
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
          <div v-if="isTranslated" class="input-output-row output-row translations-row">
            <TranslationBubblesList
              :target-codes="settingsStore.extendedTargetLangs"
              :source-code="store.currentSourceLang"
              :translations="store.currentTranslations"
            />
          </div>

          <UsageStats v-if="isTranslated" :usage="store.lastUsage" />

          <!-- Save + New (only show AFTER translation) -->
          <div v-if="isTranslated" class="new-recording-section">
            <button
              class="save-transcript-btn"
              :disabled="saveState !== 'idle'"
              @click="handleSaveTranscription"
              title="Save this transcript"
              type="button"
            >
              <Check v-if="saveState === 'saved'" :size="20" />
              <Save v-else :size="20" />
              <span>{{ saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Save' }}</span>
            </button>
            <button
              class="new-btn"
              @click="handleNewRecording"
              title="Start a new dialog"
              type="button"
            >
              <RotateCcw :size="20" />
              <span>New</span>
            </button>
          </div>
        </div>

      </main>
    </div>

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

    <TargetLanguagesModal
      :is-open="showTargetLanguagesModal"
      :selected="settingsStore.extendedTargetLangs"
      :max-selected="10"
      @save="(langs) => { settingsStore.setExtendedTargetLangs(langs); showTargetLanguagesModal = false; }"
      @close="showTargetLanguagesModal = false"
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

      <div class="footer-right">
        <!-- Saved Transcripts -->
        <button
          v-if="hasCompletedSetup"
          class="footer-info-btn"
          @click="router.push('/saved')"
          title="Saved transcripts"
          type="button"
        >
          <Bookmark :size="20" />
          <span class="info-label">Saved</span>
        </button>

        <!-- Target Languages Button -->
        <button
          v-if="hasCompletedSetup"
          class="footer-lang-btn targets-lang-btn"
          @click="showTargetLanguagesModal = true"
          title="Select target languages"
          type="button"
        >
          <Flag :size="20" />
        </button>
      </div>
    </footer>


    <Background/>
  </div>
</template>
