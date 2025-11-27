// Serverless Edge Function for Voxtral Transcription
// Hides API key from frontend
// Compatible with Vercel, Netlify, Cloudflare Workers

// Example: /api/transcribe.ts

export const config = {
  runtime: 'edge',
}

interface TranscriptionRequest {
  audio: string // Base64 encoded audio
  language?: string
  timestampGranularities?: string[]
}

export default async function handler(req: Request) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: TranscriptionRequest = await req.json()

    if (!body.audio) {
      return new Response(JSON.stringify({ error: 'Audio data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get API key from environment
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not configured')
    }

    // Convert base64 to blob
    const audioData = Uint8Array.from(atob(body.audio), c => c.charCodeAt(0))
    const audioBlob = new Blob([audioData], { type: 'audio/webm' })

    // Create FormData
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'voxtral-mini-latest')

    if (body.language) {
      formData.append('language', body.language)
    }

    if (body.timestampGranularities) {
      formData.append('timestamp_granularities', JSON.stringify(body.timestampGranularities))
    }

    // Call Mistral API
    const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Mistral API error: ${response.statusText}`)
    }

    const result = await response.json()

    // Return transcription result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Transcription error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Frontend usage example:
/*
async function transcribeViaEdgeFunction(audioBlob: Blob): Promise<string> {
  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer()
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: base64Audio,
      language: 'en', // optional
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Transcription failed')
  }

  const result = await response.json()
  return result.text
}
*/
