<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import type { Language } from '../config/languages';

// Register GSAP plugin
gsap.registerPlugin(Draggable);

const props = defineProps<{
  languages: Language[];
  selectedLanguage: Language | null;
  type: 'source' | 'target';
}>();

const emit = defineEmits<{
  (e: 'select', language: Language | null): void;
}>();

const wheelRef = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);
const isInitializing = ref(true);

// Sort languages alphabetically by native name
const wheelItems = computed(() => {
  // Sort languages alphabetically by native name
  return [...props.languages].sort((a, b) =>
    a.nativeName.localeCompare(b.nativeName, undefined, { sensitivity: 'base' })
  );
});

// Calculate distance from center for 3D effect
const getDistanceFromCenter = (element: Element): number => {
  if (!wheelRef.value) return 0;

  const containerRect = wheelRef.value.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  const containerCenter = containerRect.top + containerRect.height / 2;
  const elementCenter = elementRect.top + elementRect.height / 2;

  const distance = elementCenter - containerCenter;
  // Adjust item height based on viewport
  const itemHeight = window.innerWidth <= 480 ? 50 : 60;

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

  const rootMargin = window.innerWidth <= 480 ? '-100px 0px' : '-120px 0px';

  observer.value = new IntersectionObserver(
    (entries) => {
      // Don't emit selection events during initial load
      if (isInitializing.value) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const langCode = entry.target.getAttribute('data-lang-code');
          const language = props.languages.find(l => l.code === langCode);
          if (language) {
            console.log(`Observer detected ${props.type} wheel:`, language.nativeName);
            emit('select', language);
          }
        }
      });
    },
    {
      root: wheelRef.value,
      threshold: [0.5],
      rootMargin: rootMargin // Match scroll-padding based on viewport
    }
  );

  // Observe all items
  const items = wheelRef.value.querySelectorAll('.wheel-item');
  items.forEach(item => observer.value?.observe(item));
};

// Scroll to selected language
const scrollToLanguage = (language: Language | null, smooth = true) => {
  if (!wheelRef.value || !language) {
    console.log('ScrollToLanguage - missing ref or language:', { hasRef: !!wheelRef.value, language: language?.nativeName });
    return;
  }

  console.log(`Scrolling ${props.type} wheel to:`, language.nativeName, language.code);

  nextTick(() => {
    const targetItem = wheelRef.value?.querySelector(`[data-lang-code="${language.code}"]`);

    if (targetItem) {
      console.log(`Found target item for ${language.nativeName}, scrolling...`);
      targetItem.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'instant' });
    } else {
      console.error(`Target item not found for ${language.nativeName} with code ${language.code}`);
    }
  });
};

// Snap to nearest language when scroll stops
let scrollTimeout: number | null = null;

const snapToNearest = () => {
  if (!wheelRef.value) return;

  const itemHeight = window.innerWidth <= 480 ? 50 : 60;
  const scrollTop = wheelRef.value.scrollTop;
  const snappedPosition = Math.round(scrollTop / itemHeight) * itemHeight;

  wheelRef.value.scrollTo({
    top: snappedPosition,
    behavior: 'smooth'
  });
};

// Handle scroll events for transform updates
const handleScroll = () => {
  updateTransforms();

  // Clear existing timeout
  if (scrollTimeout !== null) {
    clearTimeout(scrollTimeout);
  }

  // Set new timeout to snap after scrolling stops
  scrollTimeout = window.setTimeout(() => {
    snapToNearest();
  }, 150);
};

onMounted(() => {
  nextTick(() => {
    setupObserver();
    updateTransforms();

    // Scroll to selected language if provided
    // Use instant scroll to center selected language immediately
    if (props.selectedLanguage) {
      // Use a small timeout to ensure DOM is fully ready
      setTimeout(() => {
        scrollToLanguage(props.selectedLanguage, false);
        updateTransforms();

        // Enable observer after scroll completes
        setTimeout(() => {
          isInitializing.value = false;
          console.log(`${props.type} wheel initialization complete`);
        }, 200);
      }, 50);
    } else {
      // No initial language, enable observer immediately
      isInitializing.value = false;
    }

    // Add scroll listener for transform updates
    wheelRef.value?.addEventListener('scroll', handleScroll, { passive: true });
  });
});

onUnmounted(() => {
  observer.value?.disconnect();
  wheelRef.value?.removeEventListener('scroll', handleScroll);

  // Clear any pending scroll timeout
  if (scrollTimeout !== null) {
    clearTimeout(scrollTimeout);
  }
});

// Watch for external selection changes
watch(() => props.selectedLanguage, (newLang, oldLang) => {
  if (newLang) {
    // If language changed externally, temporarily disable observer during scroll
    if (oldLang && newLang.code !== oldLang.code) {
      isInitializing.value = true;
      scrollToLanguage(newLang, true);
      setTimeout(() => {
        isInitializing.value = false;
      }, 500);
    } else {
      scrollToLanguage(newLang, true);
    }
  }
});

// Check if a language is selected
const isSelected = (language: Language): boolean => {
  return props.selectedLanguage?.code === language.code;
};
</script>

<template>
  <div class="language-wheel">
    <div class="wheel-label">
      {{ type === 'source' ? 'From' : 'To' }}
    </div>
    <div class="wheel-wrapper">
      <!-- STANDALONE selection rectangle - completely independent -->
      <div class="selection-rectangle"></div>

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

.wheel-wrapper {
  position: relative;
}

/* STANDALONE selection rectangle - completely separate from wheel */
.selection-rectangle {
  position: absolute;
  left: -4px;
  right: -4px;
  top: calc(50% - 30px);
  height: 60px;
  border: 3px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.wheel-container {
  position: relative;
  height: 300px;
  width: 200px;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-padding: 120px 0;
  scrollbar-width: none;

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
  transition: opacity 0.2s ease, font-weight 0.2s ease;
  user-select: none;
}

.wheel-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Fade based on distance from center */
.wheel-item[data-distance="-3"],
.wheel-item[data-distance="3"] {
  opacity: 0.2;
}

.wheel-item[data-distance="-2"],
.wheel-item[data-distance="2"] {
  opacity: 0.4;
}

.wheel-item[data-distance="-1"],
.wheel-item[data-distance="1"] {
  opacity: 0.7;
}

.wheel-item[data-distance="0"] {
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
  .selection-rectangle {
    top: calc(50% - 25px);
    height: 50px;
    left: -3px;
    right: -3px;
    border-width: 2px;
  }

  .wheel-container {
    height: 250px;
    width: 150px;
    scroll-padding: 100px 0;
  }

  .wheel-padding {
    height: 100px;
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
