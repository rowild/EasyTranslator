<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import TextToSpeech from './TextToSpeech.vue';
import { languages, type Language } from '../config/languages';

const props = defineProps<{
  targetCodes: string[];
  translations: Record<string, string>;
}>();

const slides = computed(() =>
  props.targetCodes.map(code => ({
    code,
    language: languages.find(l => l.displayCode === code) as Language | undefined,
  }))
);

const trackRef = ref<HTMLDivElement | null>(null);
const activeIndex = ref(0);
let rafId = 0;

const syncActiveIndex = () => {
  const track = trackRef.value;
  if (!track) return;
  const width = track.clientWidth;
  if (!width) return;
  activeIndex.value = Math.max(0, Math.min(slides.value.length - 1, Math.round(track.scrollLeft / width)));
};

const handleScroll = () => {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(syncActiveIndex);
};

const scrollToIndex = (index: number) => {
  const track = trackRef.value;
  if (!track) return;
  const width = track.clientWidth;
  track.scrollTo({ left: index * width, behavior: 'smooth' });
};

watch(
  () => props.targetCodes.join(','),
  async () => {
    await nextTick();
    activeIndex.value = 0;
    trackRef.value?.scrollTo({ left: 0 });
  }
);

onBeforeUnmount(() => cancelAnimationFrame(rafId));
</script>

<template>
  <div class="swipeable-translations">
    <div ref="trackRef" class="track" @scroll="handleScroll">
      <div v-for="slide in slides" :key="slide.code" class="slide">
        <div class="language-indicator">
          <span class="lang-flag">{{ slide.language?.flag || '🌐' }}</span>
          <span class="lang-name">{{ slide.language?.nativeName || slide.code }}</span>
        </div>
        <div class="transcript-field output-field">
          <div class="transcript-content" :dir="slide.language?.isRTL ? 'rtl' : 'ltr'">
            {{ translations[slide.code] || '' }}
          </div>
          <TextToSpeech
            v-if="slide.language && translations[slide.code]"
            :text="translations[slide.code]"
            :lang="slide.language.speechCode"
          />
        </div>
      </div>
    </div>

    <div v-if="slides.length > 1" class="dots" aria-label="Translation language pages">
      <button
        v-for="(slide, idx) in slides"
        :key="slide.code"
        class="dot"
        :class="{ active: idx === activeIndex }"
        type="button"
        :title="slide.language?.nativeName || slide.code"
        @click="scrollToIndex(idx)"
      />
    </div>
  </div>
</template>

<style scoped>
.swipeable-translations {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0 0.25rem;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  padding-bottom: 0.25rem;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.dot.active {
  background: rgba(255, 255, 255, 0.92);
  transform: scale(1.15);
}
</style>

