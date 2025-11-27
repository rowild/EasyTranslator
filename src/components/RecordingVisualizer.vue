<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  isRecording: boolean;
  analyser: AnalyserNode | null;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;
let smoothedData: number[] = [];

// Audio threshold and smoothing parameters
const NOISE_THRESHOLD = 15; // Ignore audio below this level (0-255)
const SMOOTHING_FACTOR = 0.3; // Higher = smoother (0-1)
const AMPLIFICATION = 1.5; // Boost the signal for better visibility

const drawCustomWaveform = () => {
  if (!props.analyser || !canvasRef.value || !props.isRecording) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use the logical dimensions (accounting for devicePixelRatio scaling)
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Get frequency data
  const bufferLength = props.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  props.analyser.getByteFrequencyData(dataArray);

  // Initialize smoothed data array if needed
  if (smoothedData.length === 0) {
    smoothedData = new Array(32).fill(0);
  }

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw bars with noise gating and smoothing (centered and mirrored both ways)
  const barCount = 32; // Half the bars, we'll mirror them
  const barWidth = (width / 2) / barCount; // Width for half the canvas
  const barGap = 1;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < barCount; i++) {
    // Sample from the frequency data
    const index = Math.floor((i / barCount) * bufferLength);
    let value = dataArray[index];

    // Apply noise threshold - ignore quiet sounds
    if (value < NOISE_THRESHOLD) {
      value = 0;
    }

    // Apply smoothing to reduce jitter
    smoothedData[i] = smoothedData[i] * SMOOTHING_FACTOR + value * (1 - SMOOTHING_FACTOR);

    // Normalize to 0-1 and apply amplification
    const normalized = Math.min(1, (smoothedData[i] / 255) * AMPLIFICATION);

    // Calculate bar height
    const barHeight = normalized * (height / 2);

    // Color based on intensity (green for input language)
    const intensity = normalized;
    const alpha = Math.max(0.4, Math.min(1, intensity + 0.2));
    const color = `rgba(66, 184, 131, ${alpha})`;

    ctx.fillStyle = color;

    // Calculate offset from center
    const offset = i * barWidth;

    // Draw bars mirrored horizontally and vertically
    // Left side - top half
    ctx.fillRect(centerX - offset - barWidth, centerY - barHeight, barWidth - barGap, barHeight);
    // Left side - bottom half
    ctx.fillRect(centerX - offset - barWidth, centerY, barWidth - barGap, barHeight);

    // Right side - top half
    ctx.fillRect(centerX + offset, centerY - barHeight, barWidth - barGap, barHeight);
    // Right side - bottom half
    ctx.fillRect(centerX + offset, centerY, barWidth - barGap, barHeight);
  }

  // Draw center line (horizontal reference)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  animationId = requestAnimationFrame(drawCustomWaveform);
};

const initCanvas = () => {
  if (!canvasRef.value) {
    console.warn('RecordingVisualizer: canvas not available');
    return;
  }

  console.log('RecordingVisualizer: Initializing canvas...');

  // Set canvas size
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  // Start visualization
  drawCustomWaveform();

  console.log('RecordingVisualizer: Visualizer started');
};

const cleanup = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  smoothedData = [];

  // Clear canvas
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
  }
};

watch(() => props.isRecording, async (recording) => {
  if (recording) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      initCanvas();
    }, 100);
  } else {
    cleanup();
  }
});

onMounted(() => {
  if (props.isRecording) {
    initCanvas();
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div class="recording-visualizer">
    <div class="recording-indicator">
      <span class="recording-dot"></span>
    </div>
    <div class="waveform-wrapper">
      <canvas ref="canvasRef" class="visualizer-canvas"></canvas>
      <div class="zero-db-line"></div>
    </div>
  </div>
</template>

<style scoped>
.recording-visualizer {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1rem;
  border-radius: 8px;
  border: 3px solid var(--input-language-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  min-height: 70px;
}

.waveform-wrapper {
  position: relative;
  width: 100%;
  height: 50px;
}

.visualizer-canvas {
  width: 100%;
  height: 50px;
  display: block;
}

.zero-db-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 1;
}

.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recording-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ff4757;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}
</style>
