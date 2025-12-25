<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  usage: any | null;
}>();

const formatSeconds = (value: number) => {
  if (!Number.isFinite(value)) return null;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}s`;
};

const items = computed(() => {
  const usage = props.usage;
  if (!usage || typeof usage !== 'object') return [];

  const out: Array<{ label: string; value: string }> = [];

  const audioSeconds = usage.prompt_audio_seconds ?? usage.audio_seconds ?? usage.prompt_audio_duration_seconds;
  if (typeof audioSeconds === 'number') {
    const formatted = formatSeconds(audioSeconds);
    if (formatted) out.push({ label: 'Audio', value: formatted });
  }

  const promptTokens = usage.prompt_tokens;
  if (typeof promptTokens === 'number') out.push({ label: 'Prompt', value: String(promptTokens) });

  const completionTokens = usage.completion_tokens;
  if (typeof completionTokens === 'number') out.push({ label: 'Completion', value: String(completionTokens) });

  const totalTokens = usage.total_tokens;
  if (typeof totalTokens === 'number') out.push({ label: 'Total', value: String(totalTokens) });

  return out;
});
</script>

<template>
  <div v-if="items.length > 0" class="usage-stats" aria-label="Request usage">
    <div class="usage-pill" v-for="item in items" :key="item.label">
      <span class="label">{{ item.label }}</span>
      <span class="value">{{ item.value }}</span>
    </div>
    <div class="note">Per-request usage (no “credits remaining” API).</div>
  </div>
</template>

<style scoped>
.usage-stats {
  width: 100%;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0.25rem 0 0.75rem 0;
}

.usage-pill {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.85rem;
}

.label {
  font-weight: 800;
  opacity: 0.85;
}

.value {
  font-weight: 700;
}

.note {
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.7;
}
</style>
