<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, RotateCcw, Flag, Settings, Save, Check } from 'lucide-vue-next';
import Background from '../components/Background.vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import TranslationBubblesList from '../components/TranslationBubblesList.vue';
import SettingsModal from '../components/SettingsModal.vue';
import TargetLanguagesModal from '../components/TargetLanguagesModal.vue';
import UsageStats from '../components/UsageStats.vue';
import { languages, type Language } from '../config/languages';
import { useSettingsStore } from '../stores/settings';
import { useTranscriptionsStore } from '../stores/transcriptions';
import { useTranslationStore } from '../stores/translation';
import { db, type Transcription } from '../db/db';

const props = defineProps<{
  id: number;
}>();

const router = useRouter();
const settingsStore = useSettingsStore();
const transcriptionsStore = useTranscriptionsStore();
const translationStore = useTranslationStore();

const isOffline = ref(!navigator.onLine);
window.addEventListener('online', () => (isOffline.value = false));
window.addEventListener('offline', () => (isOffline.value = true));

const showSettingsModal = ref(false);
const showTargetLanguagesModal = ref(false);

const isLoading = ref(true);
const loadError = ref<string | null>(null);
const transcription = ref<Transcription | null>(null);
const variants = ref<Transcription[]>([]);

const draft = ref<{
  sourceText: string;
  sourceLang: string;
  targetCodes: string[];
  translations: Record<string, string>;
} | null>(null);

const retranslateState = ref<'idle' | 'processing'>('idle');
const saveVariantState = ref<'idle' | 'saving' | 'saved'>('idle');

const hasUsableApiKey = computed(() => {
  const hasSavedKey = Boolean(settingsStore.apiKey);
  const hasDevKey = Boolean(import.meta.env.DEV && import.meta.env.VITE_MISTRAL_API_KEY);
  return hasSavedKey || hasDevKey;
});

const canRetranslate = computed(() => {
  return (
    !isOffline.value &&
    hasUsableApiKey.value &&
    settingsStore.extendedTargetLangs.length > 0 &&
    transcription.value !== null &&
    retranslateState.value === 'idle'
  );
});

const displayedSourceText = computed(() => draft.value?.sourceText ?? transcription.value?.sourceText ?? '');
const displayedSourceLang = computed(() => draft.value?.sourceLang ?? transcription.value?.sourceLang ?? '');
const displayedTargetCodes = computed(() => draft.value?.targetCodes ?? transcription.value?.targetCodes ?? []);
const displayedTranslations = computed(() => draft.value?.translations ?? transcription.value?.translations ?? {});

const sourceLanguage = computed<Language | null>(() => {
  const code = displayedSourceLang.value;
  if (!code) return null;
  return languages.find(l => l.displayCode === code) || null;
});

const load = async () => {
  isLoading.value = true;
  loadError.value = null;
  draft.value = null;
  saveVariantState.value = 'idle';
  translationStore.lastUsage = null;

  try {
    await settingsStore.ensureLoaded();
    const found = await transcriptionsStore.getById(props.id);
    if (!found) {
      loadError.value = 'Saved transcript not found.';
      transcription.value = null;
      variants.value = [];
      return;
    }

    transcription.value = found;

    variants.value = await db.transcriptions
      .where('variantGroupId')
      .equals(found.variantGroupId)
      .sortBy('createdAt');
  } catch (error) {
    console.error('Failed to load transcription:', error);
    loadError.value = 'Failed to load saved transcript.';
    transcription.value = null;
    variants.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  void load();
});

watch(
  () => props.id,
  () => {
    void load();
  }
);

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, idx) => value === b[idx]);

const hasChanges = computed(() => {
  if (!transcription.value || !draft.value) return false;
  if (draft.value.sourceText !== transcription.value.sourceText) return true;
  if (draft.value.sourceLang !== transcription.value.sourceLang) return true;
  if (!arraysEqual(draft.value.targetCodes, transcription.value.targetCodes)) return true;

  for (const code of draft.value.targetCodes) {
    if ((draft.value.translations[code] || '') !== (transcription.value.translations[code] || '')) return true;
  }
  return false;
});

const handleRetranslate = async () => {
  if (!transcription.value) return;
  if (!canRetranslate.value) return;

  retranslateState.value = 'processing';
  saveVariantState.value = 'idle';
  try {
    await translationStore.transcribeAndTranslate(transcription.value.audioBlob);
    draft.value = {
      sourceText: translationStore.currentSourceText,
      sourceLang: translationStore.currentSourceLang,
      targetCodes: [...settingsStore.extendedTargetLangs],
      translations: { ...translationStore.currentTranslations },
    };
  } catch (error) {
    console.error('Retranslate failed:', error);
    alert('Could not re-translate. Please try again.');
  } finally {
    retranslateState.value = 'idle';
  }
};

const handleSaveVariant = async () => {
  if (!transcription.value) return;
  if (!draft.value) return;
  if (!hasChanges.value) return;
  if (saveVariantState.value !== 'idle') return;

  saveVariantState.value = 'saving';
  try {
    const saved = await transcriptionsStore.addNew(
      {
        audioBlob: transcription.value.audioBlob,
        sourceText: draft.value.sourceText,
        sourceLang: draft.value.sourceLang,
        targetCodes: [...draft.value.targetCodes],
        translations: { ...draft.value.translations },
      },
      { variantGroupId: transcription.value.variantGroupId, variantOfId: transcription.value.id ?? null }
    );

    saveVariantState.value = 'saved';
    void router.push(`/saved/${saved.id}`);
  } catch (error) {
    console.error('Failed to save variant:', error);
    saveVariantState.value = 'idle';
    alert('Could not save. Please try again.');
  }
};
</script>

<template>
  <div class="main-view" :class="{ 'modal-open': showSettingsModal || showTargetLanguagesModal }">
    <header>
      <h1><span>Saved</span><span>&</span><span>Transcribed</span></h1>
    </header>

    <div class="center-content">
      <main>
        <div v-if="loadError" class="warning-box api-key-warning">
          <p>{{ loadError }}</p>
          <button class="warning-action-btn" @click="router.push('/saved')">Back to list</button>
        </div>

        <div v-else-if="isLoading" class="warning-box">
          <p>Loading…</p>
        </div>

        <template v-else-if="transcription">
          <!-- API Key Warning -->
          <div v-if="!hasUsableApiKey" class="warning-box api-key-warning">
            <p>Mistral API key is required to re-translate. Add your key in Settings.</p>
            <button class="warning-action-btn" @click="showSettingsModal = true">Open Settings</button>
          </div>

          <!-- Target Languages Warning -->
          <div
            v-else-if="settingsStore.extendedTargetLangs.length === 0"
            class="warning-box api-key-warning"
          >
            <p>Select at least 1 target language to re-translate.</p>
            <button class="warning-action-btn" @click="showTargetLanguagesModal = true">Select targets</button>
          </div>

          <div class="conversation-pair current-pair">
            <!-- Input -->
            <div class="input-output-row">
              <div class="language-indicator">
                <span class="lang-flag">{{ sourceLanguage?.flag || '🌐' }}</span>
                <span class="lang-name">{{ sourceLanguage?.nativeName || displayedSourceLang }}</span>
              </div>
              <div class="field-with-actions">
                <div class="transcript-field input-field">
                  <div class="transcript-content" :dir="sourceLanguage?.isRTL ? 'rtl' : 'ltr'">
                    {{ displayedSourceText }}
                  </div>
                  <AudioPlayer :audio-blob="transcription.audioBlob" />
                </div>
              </div>
            </div>

            <!-- Output -->
            <div class="input-output-row output-row translations-row">
              <TranslationBubblesList
                :target-codes="displayedTargetCodes"
                :source-code="displayedSourceLang"
                :translations="displayedTranslations"
              />
            </div>

            <UsageStats v-if="draft" :usage="translationStore.lastUsage" />

            <div class="detail-actions">
              <button
                class="save-transcript-btn"
                :disabled="!hasChanges || saveVariantState !== 'idle'"
                @click="handleSaveVariant"
                type="button"
                :title="hasChanges ? 'Save as a new linked variant' : 'Re-translate to create a variant'"
              >
                <Check v-if="saveVariantState === 'saved'" :size="20" />
                <Save v-else :size="20" />
                <span>
                  {{
                    saveVariantState === 'saved'
                      ? 'Saved'
                      : saveVariantState === 'saving'
                        ? 'Saving…'
                        : 'Save variant'
                  }}
                </span>
              </button>

              <button
                class="new-btn"
                :disabled="!canRetranslate"
                @click="handleRetranslate"
                type="button"
                title="Re-translate using the current target selection"
              >
                <RotateCcw :size="20" />
                <span>{{ retranslateState === 'processing' ? 'Re-translating…' : 'Re-translate' }}</span>
              </button>
            </div>

            <div v-if="variants.length > 1" class="variants">
              <div class="variants-title">Related versions</div>
              <div class="variants-list">
                <button
                  v-for="v in variants"
                  :key="v.id"
                  class="variant-link"
                  type="button"
                  :class="{ active: v.id === transcription.id }"
                  @click="router.push(`/saved/${v.id}`)"
                >
                  <span class="variant-time">{{ new Date(v.createdAt).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</span>
                  <span v-if="v.id === transcription.id" class="variant-current">current</span>
                </button>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>

    <footer class="app-footer">
      <div class="footer-left">
        <button class="footer-info-btn" @click="router.push('/saved')" title="Back to saved list">
          <ArrowLeft :size="20" />
          <span class="info-label">Back</span>
        </button>
      </div>

      <div class="footer-right">
        <button
          class="footer-info-btn"
          @click="showSettingsModal = true"
          title="Settings"
          type="button"
        >
          <Settings :size="20" />
          <span class="info-label">Settings</span>
        </button>

        <button
          class="footer-lang-btn targets-lang-btn"
          @click="showTargetLanguagesModal = true"
          title="Select target languages"
          type="button"
        >
          <Flag :size="20" />
        </button>
      </div>
    </footer>

    <SettingsModal :is-open="showSettingsModal" @close="showSettingsModal = false" />

    <TargetLanguagesModal
      :is-open="showTargetLanguagesModal"
      :selected="settingsStore.extendedTargetLangs"
      :max-selected="10"
      @save="(langs) => { settingsStore.setExtendedTargetLangs(langs); showTargetLanguagesModal = false; }"
      @close="showTargetLanguagesModal = false"
    />

    <Background />
  </div>
</template>

<style scoped>
.detail-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 0 0.25rem 0;
  flex-wrap: wrap;
}

.variants {
  padding-top: 0.5rem;
}

.variants-title {
  text-align: center;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 0.5rem;
}

.variants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.variant-link {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  font-weight: 800;
  transition: background 0.12s ease, transform 0.12s ease;
}

.variant-link:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.variant-link.active {
  background: rgba(255, 45, 119, 0.18);
  border-color: rgba(255, 45, 119, 0.5);
}

.variant-time {
  font-size: 0.85rem;
}

.variant-current {
  font-size: 0.75rem;
  opacity: 0.85;
}
</style>
