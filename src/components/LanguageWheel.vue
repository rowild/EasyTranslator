<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { Language } from '../config/languages';

const props = defineProps<{
  languages: Language[];
  selectedLanguage: Language | null;
  type: 'source' | 'target';
  allowAutoDetect?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', language: Language | null): void;
}>();

const wheelRef = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);

// Create wheel items including auto-detect option for source
const wheelItems = computed(() => {
  const items = [...props.languages];

  if (props.allowAutoDetect) {
    // Add auto-detect as first item
    return [
      {
        code: 'auto-detect',
        displayCode: 'auto',
        name: 'Auto-detect',
        nativeName: 'Auto-detect',
        flag: '🌐',
        speechCode: '',
        isRTL: false
      } as Language,
      ...items
    ];
  }

  return items;
});

// Calculate distance from center for 3D effect
const getDistanceFromCenter = (element: Element): number => {
  if (!wheelRef.value) return 0;

  const containerRect = wheelRef.value.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const containerCenter = containerRect.top + containerRect.height / 2;
  const elementCenter = elementRect.top + elementRect.height / 2;

  const distance = elementCenter - containerCenter;
  const itemHeight = 60; // Height of each item

  return Math.round(distance / itemHeight);
};

// Update transforms based on scroll position
const updateTransforms = () => {
  if (!wheelRef.value) return;

  const items = wheelRef.value.querySelectorAll('.wheel-item');
  items.forEach((item) => {
    const distance = getDistanceFromCenter(item);
    item.setAttribute('data-distance', distance.toString());
  });
};

// Setup Intersection Observer for selection detection
const setupObserver = () => {
  if (!wheelRef.value) return;

  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const langCode = entry.target.getAttribute('data-lang-code');

          if (langCode === 'auto-detect') {
            emit('select', null);
          } else {
            const language = props.languages.find(l => l.code === langCode);
            if (language) {
              emit('select', language);
            }
          }
        }
      });
    },
    {
      root: wheelRef.value,
      threshold: [0.5],
      rootMargin: '-120px 0px' // Match scroll-padding
    }
  );

  // Observe all items
  const items = wheelRef.value.querySelectorAll('.wheel-item');
  items.forEach(item => observer.value?.observe(item));
};

// Scroll to selected language
const scrollToLanguage = (language: Language | null) => {
  if (!wheelRef.value) return;

  nextTick(() => {
    const targetCode = language?.code || 'auto-detect';
    const targetItem = wheelRef.value?.querySelector(`[data-lang-code="${targetCode}"]`);

    if (targetItem) {
      targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
};

// Handle scroll events for transform updates
const handleScroll = () => {
  updateTransforms();
};

onMounted(() => {
  nextTick(() => {
    setupObserver();
    updateTransforms();

    // Scroll to selected language if provided
    if (props.selectedLanguage) {
      scrollToLanguage(props.selectedLanguage);
    } else if (props.allowAutoDetect) {
      // For source wheel, scroll to auto-detect by default
      scrollToLanguage(null);
    }

    // Add scroll listener for transform updates
    wheelRef.value?.addEventListener('scroll', handleScroll, { passive: true });
  });
});

onUnmounted(() => {
  observer.value?.disconnect();
  wheelRef.value?.removeEventListener('scroll', handleScroll);
});

// Watch for external selection changes
watch(() => props.selectedLanguage, (newLang) => {
  scrollToLanguage(newLang);
});

// Check if a language is selected
const isSelected = (language: Language): boolean => {
  if (!props.selectedLanguage && language.code === 'auto-detect') {
    return props.allowAutoDetect || false;
  }
  return props.selectedLanguage?.code === language.code;
};
</script>

<template>
  <div class="language-wheel">
    <div class="wheel-label">
      {{ type === 'source' ? 'From' : 'To' }}
    </div>
    <div ref="wheelRef" class="wheel-container">
      <!-- Add padding items for proper scrolling -->
      <div class="wheel-padding"></div>

      <div
        v-for="language in wheelItems"
        :key="language.code"
        class="wheel-item"
        :class="{ 'is-selected': isSelected(language) }"
        :data-lang-code="language.code"
      >
        <span class="wheel-flag">{{ language.flag }}</span>
        <span class="wheel-name">{{ language.nativeName }}</span>
      </div>

      <!-- Add padding items for proper scrolling -->
      <div class="wheel-padding"></div>
    </div>
  </div>
</template>

<style scoped>
.language-wheel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.wheel-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.wheel-container {
  position: relative;
  height: 300px;
  width: 200px;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-padding: 120px 0;
  scrollbar-width: none;
  perspective: 1000px;

  /* Glassmorphism background */
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;

  /* Touch scrolling */
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
}

.wheel-container::-webkit-scrollbar {
  display: none;
}

/* Center indicator line */
.wheel-container::before,
.wheel-container::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  z-index: 10;
  pointer-events: none;
}

.wheel-container::before {
  top: calc(50% - 30px);
}

.wheel-container::after {
  top: calc(50% + 30px);
}

.wheel-padding {
  height: 120px;
  flex-shrink: 0;
}

.wheel-item {
  height: 60px;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.3s ease, opacity 0.3s ease, font-size 0.3s ease;
  user-select: none;
}

.wheel-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 3D transforms based on distance from center */
.wheel-item[data-distance="-3"],
.wheel-item[data-distance="3"] {
  transform: rotateX(30deg) translateZ(-30px);
  opacity: 0.2;
}

.wheel-item[data-distance="-2"],
.wheel-item[data-distance="2"] {
  transform: rotateX(20deg) translateZ(-20px);
  opacity: 0.3;
}

.wheel-item[data-distance="-1"],
.wheel-item[data-distance="1"] {
  transform: rotateX(10deg) translateZ(-10px);
  opacity: 0.6;
}

.wheel-item[data-distance="0"] {
  transform: rotateX(0deg) translateZ(0px);
  opacity: 1;
  font-weight: 700;
}

.wheel-item.is-selected {
  background: rgba(255, 255, 255, 0.1);
}

.wheel-flag {
  font-size: 1.8rem;
  line-height: 1;
  flex-shrink: 0;
}

.wheel-name {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  flex: 1;
}

.wheel-item[data-distance="0"] .wheel-name {
  font-size: 1rem;
  color: rgba(255, 255, 255, 1);
}

/* Mobile responsive */
@media (max-width: 480px) {
  .wheel-container {
    height: 250px;
    width: 150px;
  }

  .wheel-item {
    height: 50px;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
  }

  .wheel-flag {
    font-size: 1.5rem;
  }

  .wheel-name {
    font-size: 0.75rem;
  }

  .wheel-item[data-distance="0"] .wheel-name {
    font-size: 0.85rem;
  }
}
</style>
