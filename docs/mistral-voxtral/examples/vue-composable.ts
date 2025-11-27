// Vue 3 Composable for Voxtral Integration
// Compatible with EasyTranslator architecture

import { ref, computed } from 'vue'

interface TranscriptionResult {
  text: string
  usage: {
    prompt_audio_seconds: number
    prompt_tokens: number
    total_tokens: number
    completion_tokens: number
  }
}

interface TranscriptionOptions {
  language?: string
  timestampGranularities?: string[]
}

export function useVoxtralTranscription() {
  const isTranscribing = ref(false)
  const error = ref<string | null>(null)
  const lastResult = ref<TranscriptionResult | null>(null)

  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY

  async function transcribe(
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('VITE_MISTRAL_API_KEY is not configured')
    }

    isTranscribing.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', 'voxtral-mini-latest')

      // Add optional parameters
      if (options.language) {
        formData.append('language', options.language)
      }

      if (options.timestampGranularities) {
        formData.append(
          'timestamp_granularities',
          JSON.stringify(options.timestampGranularities)
        )
      }

      const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Transcription failed: ${response.statusText}`)
      }

      const result = await response.json()
      lastResult.value = result

      console.log('Transcription successful:', {
        text: result.text,
        audioSeconds: result.usage.prompt_audio_seconds,
      })

      return result.text
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = message
      console.error('Transcription error:', err)
      throw err
    } finally {
      isTranscribing.value = false
    }
  }

  const hasError = computed(() => error.value !== null)
  const audioSeconds = computed(() => lastResult.value?.usage.prompt_audio_seconds || 0)

  function clearError() {
    error.value = null
  }

  return {
    // State
    isTranscribing,
    error,
    hasError,
    lastResult,
    audioSeconds,

    // Methods
    transcribe,
    clearError,
  }
}

// Example usage in a Vue component:
/*
<script setup lang="ts">
import { useVoxtralTranscription } from '@/composables/useVoxtralTranscription'
import { useAudioRecorder } from '@/composables/useAudioRecorder'

const { transcribe, isTranscribing, error } = useVoxtralTranscription()
const { startRecording, stopRecording, isRecording } = useAudioRecorder()

async function handleRecord() {
  if (isRecording.value) {
    const audioBlob = await stopRecording()
    if (audioBlob) {
      try {
        const transcription = await transcribe(audioBlob)
        console.log('Transcribed:', transcription)
      } catch (err) {
        console.error('Failed to transcribe:', err)
      }
    }
  } else {
    await startRecording()
  }
}
</script>

<template>
  <div>
    <button @click="handleRecord" :disabled="isTranscribing">
      {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
    </button>

    <div v-if="isTranscribing">Transcribing...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>
*/
