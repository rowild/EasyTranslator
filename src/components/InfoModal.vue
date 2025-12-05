<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { X } from 'lucide-vue-next';
import LanguageGridModal from './LanguageGridModal.vue';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  isOpen: boolean;
  sourceLang: Language | null;
  targetLang: Language | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

interface AppInfoSection {
  header: string;
  content: string;
}

interface AppInfoData {
  overview: AppInfoSection;
  howToUse: AppInfoSection;
  dataNote: AppInfoSection;
}

const appInfoData = ref<Record<string, AppInfoData>>({});
const selectedInfoLang = ref<string>('en'); // Default to English
const showLanguageGrid = ref(false);
const lastSelectedOtherLang = ref<Language | null>(null);

// Load app-info.json
onMounted(async () => {
  try {
    const response = await fetch('/app-info.json');
    appInfoData.value = await response.json();
  } catch (error) {
    console.error('Failed to load app-info.json:', error);
  }

  // Load persisted info language preference
  const savedInfoLang = localStorage.getItem('infoLanguage');
  if (savedInfoLang) {
    selectedInfoLang.value = savedInfoLang;
  } else if (props.sourceLang) {
    // Initialize to input (source) language
    selectedInfoLang.value = props.sourceLang.displayCode;
  }
});

// Watch for modal opening and set initial language from source
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    const savedInfoLang = localStorage.getItem('infoLanguage');
    if (savedInfoLang) {
      selectedInfoLang.value = savedInfoLang;
    } else if (props.sourceLang) {
      selectedInfoLang.value = props.sourceLang.displayCode;
    }
  }
});

// Current info text based on selected language
const currentInfo = computed<AppInfoData | null>(() => {
  return appInfoData.value[selectedInfoLang.value] || appInfoData.value['en'] || null;
});

// Check if selected language is one of the quick-access languages (source or target)
const isQuickAccessLanguage = computed(() => {
  return selectedInfoLang.value === props.sourceLang?.displayCode ||
         selectedInfoLang.value === props.targetLang?.displayCode;
});

// Get the currently displayed language object
const currentLanguage = computed(() => {
  return languages.find(lang => lang.displayCode === selectedInfoLang.value);
});

// Show the "other language" flag if user selected from grid and it's not a quick-access language
const shouldShowOtherLangFlag = computed(() => {
  return !isQuickAccessLanguage.value && lastSelectedOtherLang.value;
});

const handleSourceLangClick = () => {
  if (props.sourceLang) {
    selectedInfoLang.value = props.sourceLang.displayCode;
    localStorage.setItem('infoLanguage', selectedInfoLang.value);
    lastSelectedOtherLang.value = null; // Clear other language selection
  }
};

const handleTargetLangClick = () => {
  if (props.targetLang) {
    selectedInfoLang.value = props.targetLang.displayCode;
    localStorage.setItem('infoLanguage', selectedInfoLang.value);
    lastSelectedOtherLang.value = null; // Clear other language selection
  }
};

const handleOtherLanguagesClick = () => {
  showLanguageGrid.value = true;
};

const handleLanguageGridSelect = (language: Language) => {
  selectedInfoLang.value = language.displayCode;
  localStorage.setItem('infoLanguage', selectedInfoLang.value);

  // Track this as "other language" only if it's not source or target
  if (language.displayCode !== props.sourceLang?.displayCode &&
      language.displayCode !== props.targetLang?.displayCode) {
    lastSelectedOtherLang.value = language;
  } else {
    lastSelectedOtherLang.value = null;
  }

  showLanguageGrid.value = false;
};

const handleClose = () => {
  emit('close');
};

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close');
  }
};
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="info-modal-overlay"
      @click="handleBackdropClick"
    >
      <div class="info-modal">
        <!-- Fixed Header -->
        <div class="info-modal-header">
          <!-- Close button -->
          <button
            class="close-btn"
            @click="handleClose"
            title="Close"
          >
            <X :size="24" />
          </button>

          <!-- Language switcher buttons -->
          <div class="language-switcher">
            <div class="left-lang-buttons">
              <button
                v-if="sourceLang"
                class="lang-switch-btn"
                :class="{ active: selectedInfoLang === sourceLang.displayCode }"
                @click="handleSourceLangClick"
                :title="sourceLang.nativeName"
              >
                <span class="lang-flag">{{ sourceLang.flag }}</span>
              </button>
              <button
                v-if="targetLang"
                class="lang-switch-btn"
                :class="{ active: selectedInfoLang === targetLang.displayCode }"
                @click="handleTargetLangClick"
                :title="targetLang.nativeName"
              >
                <span class="lang-flag">{{ targetLang.flag }}</span>
              </button>
            </div>
            <button
              class="lang-switch-btn other-languages-btn"
              @click="handleOtherLanguagesClick"
              title="Other languages"
            >
              <span v-if="shouldShowOtherLangFlag" class="selected-other-flag">
                {{ lastSelectedOtherLang?.flag }}
              </span>
              <span class="other-lang-icon">🌐</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="info-content-wrapper">
          <div v-if="currentInfo" class="info-content" :dir="currentLanguage?.isRTL ? 'rtl' : 'ltr'">
            <!-- Overview Section -->
            <section class="info-section">
              <p class="section-header" v-html="currentInfo.overview.header"></p>
              <div class="section-content" v-html="currentInfo.overview.content"></div>
            </section>

            <!-- How to Use Section -->
            <section class="info-section">
              <p class="section-header" v-html="currentInfo.howToUse.header"></p>
              <div class="section-content" v-html="currentInfo.howToUse.content"></div>
            </section>

            <!-- Data Note Section -->
            <section class="info-section">
              <p class="section-header" v-html="currentInfo.dataNote.header"></p>
              <div class="section-content" v-html="currentInfo.dataNote.content"></div>
            </section>
          </div>
          <div v-else class="info-content">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Language Grid Modal -->
  <LanguageGridModal
    :is-open="showLanguageGrid"
    @select="handleLanguageGridSelect"
    @close="showLanguageGrid = false"
  />
</template>

<style scoped>
.info-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.info-modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 250, 0.95) 100%);
  border-radius: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 85vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.info-modal-header {
  flex-shrink: 0;
  padding: 1rem 2rem 1rem 2rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #333;
  transition: all 0.2s;
  z-index: 10;
}

.close-btn :deep(svg) {
  display: block;
  flex-shrink: 0;
}

.close-btn:hover {
  color: #000;
  transform: scale(1.1);
}

.language-switcher {
  display: flex;
  gap: 0.5rem;
  padding-right: 50px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.info-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem 2rem 2rem;
}

.left-lang-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.lang-switch-btn {
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lang-switch-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.lang-switch-btn.active {
  border: 2px solid #c2185b;
}

.lang-switch-btn.active .lang-flag {
  text-shadow: 0 0 16px rgba(255, 45, 119, 0.7),
               0 0 32px rgba(255, 45, 119, 0.5);
}

.lang-flag {
  font-size: 1.5rem;
  line-height: 1;
}

.other-languages-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.other-lang-icon {
  font-size: 1.2rem;
}

.selected-other-flag {
  font-size: 1.2rem;
}

.info-content {
  font-size: 1rem;
  line-height: 1.6;
  color: #333;
}

.info-section {
  margin-bottom: 1.5rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.section-header {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #555;
  letter-spacing: 0.5px;
}

.section-content {
  margin-top: 0.5rem;
}

.section-content :deep(p) {
  margin: 0.5rem 0;
}

.section-content :deep(b) {
  font-weight: 600;
  color: #333;
}

.section-content :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.section-content :deep(li) {
  margin: 0.25rem 0;
}

/* RTL support */
.info-content[dir="rtl"] {
  text-align: right;
}

.info-content[dir="rtl"] .section-content :deep(ol) {
  padding-left: 0;
  padding-right: 1.5rem;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar styling */
.info-content-wrapper::-webkit-scrollbar {
  width: 8px;
}

.info-content-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.info-content-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.info-content-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

@media (max-width: 640px) {
  .info-modal {
    max-height: 90vh;
  }

  .info-modal-header {
    padding: 0.75rem 1.5rem 0.75rem 1.5rem;
  }

  .info-content-wrapper {
    padding: 1rem 1.5rem 1.5rem 1.5rem;
  }

  .language-switcher {
    gap: 0.4rem;
  }

  .lang-switch-btn {
    padding: 0.4rem 0.8rem;
  }

  .lang-flag {
    font-size: 1.3rem;
  }
}
</style>
