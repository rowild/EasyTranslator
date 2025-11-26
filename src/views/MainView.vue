<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useTranslationStore } from '../stores/translation';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import LanguageColumn from '../components/LanguageColumn.vue';
import RecordButton from '../components/RecordButton.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import { languages, type Language } from '../config/languages';
import { Loader2, Trash2, Send, Plus } from 'lucide-vue-next';

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
const isTranslated = ref(false); // Track if current recording has been translated

// Conversation history
interface ConversationPair {
  sourceText: string;
  translatedText: string;
  audioBlob: Blob;
  inputLang: Language;
  outputLang: Language;
}

const conversationHistory = ref<ConversationPair[]>([]);

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

const handleDeleteRecording = () => {
  console.log('Deleting current recording...');
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  store.currentTranslatedText = '';
};

const handleSendForTranslation = async () => {
  if (!outputLanguage.value || !recordedBlob.value) {
    console.error('Missing output language or audio');
    return;
  }

  try {
    console.log('Sending AUDIO to Voxtral for translation to:', outputLanguage.value.name);

    // Convert audio blob to WAV format if needed (required by Voxtral chat/completions)
    let wavBlob: Blob;
    if (recordedBlob.value.type === 'audio/wav') {
      console.log('Audio already in WAV format, skipping conversion');
      wavBlob = recordedBlob.value;
    } else {
      console.log('Converting audio from', recordedBlob.value.type, 'to WAV format...');
      wavBlob = await convertToWav(recordedBlob.value);
      console.log('WAV conversion complete:', wavBlob.size, 'bytes');
    }

    // Convert WAV blob to base64
    const base64Audio = await blobToBase64(wavBlob);

    // Get target language name
    const targetLanguageName = outputLanguage.value.name;

    // Send to Voxtral chat/completions API with audio
    const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    if (!apiKey) throw new Error('Missing VITE_MISTRAL_API_KEY');

    store.isProcessing = true;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'voxtral-small-latest',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: base64Audio
              },
              {
                type: 'text',
                text: `Translate this audio to ${targetLanguageName}. Only return the translated text, nothing else.`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voxtral API Error: ${errorText}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content || '';

    // Store the translated text
    store.currentTranslatedText = translatedText;

    // Mark as translated
    isTranslated.value = true;

    console.log('Translation complete:', translatedText);
  } catch (e) {
    console.error('Translation failed:', e);
    alert('Translation failed. Please try again.');
  } finally {
    store.isProcessing = false;
  }
};

// Helper function to convert audio blob to WAV format
const convertToWav = async (blob: Blob): Promise<Blob> => {
  const audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Convert to WAV
  const wavBuffer = audioBufferToWav(audioBuffer);
  await audioContext.close();

  return new Blob([wavBuffer], { type: 'audio/wav' });
};

// Helper function to encode AudioBuffer to WAV format
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length * buffer.numberOfChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // "RIFF" chunk descriptor
  setUint32(0x46464952); // "RIFF"
  setUint32(36 + length); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // "fmt " sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * buffer.numberOfChannels * 2); // byte rate
  setUint16(buffer.numberOfChannels * 2); // block align
  setUint16(16); // bits per sample

  // "data" sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length);

  // Write interleaved PCM samples
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < arrayBuffer.byteLength) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return arrayBuffer;
};

// Helper function to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const handleNewRecording = () => {
  console.log('Starting new recording...');

  // Save current conversation pair to history
  if (recordedBlob.value && inputLanguage.value && outputLanguage.value) {
    conversationHistory.value.push({
      sourceText: transcript.value,
      translatedText: store.currentTranslatedText,
      audioBlob: recordedBlob.value,
      inputLang: inputLanguage.value,
      outputLang: outputLanguage.value,
    });
    console.log('Saved to history. Total pairs:', conversationHistory.value.length);
  }

  // Reset for new recording
  recordedBlob.value = null;
  setTranscript('');
  isTranslated.value = false;
  store.currentTranslatedText = '';
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

        <!-- Conversation History -->
        <div v-if="conversationHistory.length > 0" class="conversation-history">
          <div v-for="(pair, index) in conversationHistory" :key="index" class="conversation-pair history-pair">
            <!-- Input (Source) -->
            <div class="input-output-row">
              <div class="transcript-field input-field">
                <div class="transcript-content">{{ pair.sourceText }}</div>
                <AudioPlayer :audio-blob="pair.audioBlob" />
              </div>
            </div>

            <!-- Output (Translation) -->
            <div class="input-output-row output-row">
              <div class="transcript-field output-field">
                <div class="transcript-content">{{ pair.translatedText }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Input/Output Pair (only show AFTER recording has stopped) -->
        <div v-if="canRecord && recordedBlob" class="conversation-pair">
          <!-- Input (Source) Section -->
          <div class="input-output-row">
            <div class="transcript-field input-field">
              <div class="transcript-content" :class="{ placeholder: !transcript && !store.isProcessing }">
                {{ transcript || (store.isProcessing ? 'Processing...' : 'Transcription will appear here...') }}
              </div>
              <AudioPlayer :audio-blob="recordedBlob" />
            </div>

            <!-- Action buttons (only show BEFORE translation) -->
            <div v-if="!isTranslated" class="action-buttons">
              <button class="delete-btn" @click="handleDeleteRecording" title="Delete recording and start over">
                <Trash2 :size="24" />
              </button>
              <button
                class="send-btn"
                @click="handleSendForTranslation"
                title="Translate to target language"
                :disabled="store.isProcessing || !transcript"
              >
                <Send :size="24" />
              </button>
            </div>
          </div>

          <!-- Output (Translation) Section (only show AFTER translation) -->
          <div v-if="isTranslated" class="input-output-row output-row">
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

        <!-- Record Button (only show when NO recording exists) -->
        <div v-if="canRecord && !recordedBlob" class="controls">
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

.conversation-history {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px dashed #ddd;
}

.conversation-pair {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-pair {
  opacity: 0.8;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.input-output-row {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 1rem;
}

.output-row {
  justify-content: flex-end;
}

.transcript-field {
  background: #fff;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  align-self: flex-end;
  flex-shrink: 0;
}

.delete-btn,
.send-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn {
  border-color: #ff4757;
  color: #ff4757;
}

.delete-btn:hover {
  background: #ff4757;
  color: white;
  transform: scale(1.05);
}

.send-btn {
  border-color: #42b883;
  color: #42b883;
}

.send-btn:hover:not(:disabled) {
  background: #42b883;
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
}

.plus-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid #42b883;
  background: white;
  color: #42b883;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.3);
}

.plus-btn:hover {
  background: #42b883;
  color: white;
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(66, 184, 131, 0.4);
}

.plus-btn:active {
  transform: scale(0.95);
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
