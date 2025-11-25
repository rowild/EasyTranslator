<script setup lang="ts">
import { useTranslationStore } from '../stores/translation';
import { Volume2 } from 'lucide-vue-next';

const store = useTranslationStore();

const playText = (text: string, lang: string) => {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  speechSynthesis.speak(utter);
};

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div class="history-list">
    <div v-for="item in store.history" :key="item.id" class="history-item">
      <div class="timestamp">{{ formatDate(item.createdAt) }}</div>
      
      <div class="bubble source">
        <div class="lang-tag">{{ item.sourceLang }}</div>
        <p>{{ item.sourceText }}</p>
      </div>

      <div class="bubble target">
        <div class="header">
          <div class="lang-tag">{{ item.targetLang }}</div>
          <button class="play-mini" @click="playText(item.translatedText, item.targetLang)">
            <Volume2 :size="16" />
          </button>
        </div>
        <p>{{ item.translatedText }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

.history-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timestamp {
  text-align: center;
  font-size: 0.8rem;
  color: #888;
}

.bubble {
  padding: 1rem;
  border-radius: 12px;
  position: relative;
}

.bubble.source {
  background-color: #f0f0f0;
  color: #333;
  border-top-left-radius: 2px;
  margin-right: 2rem;
}

.bubble.target {
  background-color: #eafaf1; /* Light green */
  color: #333;
  border-bottom-right-radius: 2px;
  margin-left: 2rem;
  border: 1px solid #ccebd6;
}

.lang-tag {
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 0.25rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.play-mini {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #42b883;
  display: flex;
  align-items: center;
}

p {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.4;
}
</style>
