# Integrating Piper TTS with EasyTranslator

## Overview

This guide shows how to integrate Piper TTS into the EasyTranslator Vue.js application as an alternative to the Web Speech API for playing translated text.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     EasyTranslator App                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Vue 3 Frontend (Browser)                │  │
│  │                                                       │  │
│  │  ┌──────────────┐        ┌──────────────────────┐  │  │
│  │  │ RecordButton │───────▶│  Mistral API         │  │  │
│  │  └──────────────┘        │  (Transcription)     │  │  │
│  │                          └──────────────────────┘  │  │
│  │         │                           │              │  │
│  │         ▼                           ▼              │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │        Translation Store (Pinia)             │ │  │
│  │  │  - Mistral API (Translation)                 │ │  │
│  │  │  - IndexedDB (History)                       │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │                           │                        │  │
│  │                           ▼                        │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │         TTS Selector                         │ │  │
│  │  │  ┌──────────────┬──────────────────────────┐ │ │  │
│  │  │  │ Web Speech   │  Piper TTS (NEW)        │ │ │  │
│  │  │  │ API (Client) │  (Server)               │ │ │  │
│  │  │  └──────────────┴──────────────────────────┘ │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │                                                     │  │
│  │         │                           │               │  │
│  │         ▼                           ▼               │  │
│  │  ┌──────────────┐        ┌──────────────────────┐ │  │
│  │  │ Browser TTS  │        │  /api/synthesize.ts  │ │  │
│  │  └──────────────┘        └──────────────────────┘ │  │
│  └──────────────────────────────────────────┬─────────┘  │
└─────────────────────────────────────────────┼────────────┘
                                              │
                                              ▼
                           ┌──────────────────────────────┐
                           │   Piper HTTP Server          │
                           │   (VPS/Docker Container)     │
                           │   - Port 5000                │
                           │   - Voice Models Loaded      │
                           └──────────────────────────────┘
```

## Implementation Steps

### Step 1: Create Piper Composable

Create `/src/composables/usePiperTTS.ts`:

```typescript
// src/composables/usePiperTTS.ts
import { ref } from 'vue';

export interface PiperConfig {
  apiUrl?: string;
  enabled?: boolean;
}

export function usePiperTTS(config: PiperConfig = {}) {
  const apiUrl = config.apiUrl || '/api/synthesize';
  const isAvailable = ref(false);
  const isSynthesizing = ref(false);
  const error = ref<string | null>(null);

  /**
   * Check if Piper TTS service is available
   */
  async function checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(apiUrl, {
        method: 'HEAD',
      });
      isAvailable.value = response.ok;
      return response.ok;
    } catch {
      isAvailable.value = false;
      return false;
    }
  }

  /**
   * Synthesize text to speech using Piper
   */
  async function synthesize(text: string, language: string = 'en_US'): Promise<Blob | null> {
    if (!text?.trim()) {
      error.value = 'Text is required';
      return null;
    }

    isSynthesizing.value = true;
    error.value = null;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return audioBlob;

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Synthesis failed';
      console.error('Piper TTS error:', err);
      return null;

    } finally {
      isSynthesizing.value = false;
    }
  }

  /**
   * Play synthesized speech
   */
  async function speak(text: string, language: string = 'en_US'): Promise<void> {
    const audioBlob = await synthesize(text, language);

    if (!audioBlob) {
      throw new Error(error.value || 'Failed to synthesize speech');
    }

    // Create audio URL and play
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Map EasyTranslator language codes to Piper voice models
   */
  function mapLanguageToPiperVoice(targetLang: string): string {
    const languageMap: Record<string, string> = {
      'it': 'it_IT-riccardo-medium',
      'fr': 'fr_FR-mls-medium',
      'de': 'de_DE-thorsten-medium',
      'es': 'es_ES-mls-medium',
      'pt': 'pt_BR-faber-medium',
      'nl': 'nl_NL-mls-medium',
      'pl': 'pl_PL-mls-medium',
      'ru': 'ru_RU-ruslan-medium',
      'ja': 'ja_JP-mls-medium',
      'zh': 'zh_CN-huayan-medium',
      'en': 'en_US-lessac-medium', // Fallback
    };

    return languageMap[targetLang] || languageMap['en'];
  }

  // Check availability on initialization
  checkAvailability();

  return {
    isAvailable,
    isSynthesizing,
    error,
    synthesize,
    speak,
    checkAvailability,
    mapLanguageToPiperVoice,
  };
}
```

### Step 2: Create Serverless Function

Create `/api/synthesize.ts`:

```typescript
// api/synthesize.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const PIPER_SERVER_URL = process.env.PIPER_SERVER_URL || 'http://localhost:5000';

// Rate limiting (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // Requests per window
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method === 'HEAD') {
    // Health check
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] as string || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Validate input
  const { text, language } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
  }

  try {
    // Forward to Piper server
    const response = await fetch(PIPER_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        length_scale: 1.0,
        noise_scale: 0.667,
        noise_w: 0.8,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`Piper server error: ${response.status}`);
    }

    // Stream audio back
    const audioBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('Synthesis error:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'Synthesis timeout' });
    }

    res.status(500).json({
      error: 'Synthesis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### Step 3: Update Environment Variables

Add to `.env`:

```env
# Piper TTS Server URL (for production)
PIPER_SERVER_URL=https://your-piper-server.com:5000
```

### Step 4: Update Translation Store

Modify `/src/stores/translation.ts`:

```typescript
// Add to imports
import { usePiperTTS } from '@/composables/usePiperTTS';

// Inside the store
const piperTTS = usePiperTTS();

// Add new state
const ttsEngine = ref<'web-speech' | 'piper'>('web-speech');
const piperAvailable = computed(() => piperTTS.isAvailable.value);

// Add method to switch TTS engine
function setTTSEngine(engine: 'web-speech' | 'piper') {
  ttsEngine.value = engine;
  localStorage.setItem('ttsEngine', engine);
}

// Modify playTranslation function
async function playTranslation(text: string, lang: string) {
  try {
    if (ttsEngine.value === 'piper' && piperTTS.isAvailable.value) {
      // Use Piper TTS
      const piperLang = piperTTS.mapLanguageToPiperVoice(lang);
      await piperTTS.speak(text, piperLang);
    } else {
      // Use Web Speech API (existing implementation)
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    console.error('TTS playback failed:', error);
  }
}

// Return new properties
return {
  // ... existing returns
  ttsEngine,
  piperAvailable,
  setTTSEngine,
};
```

### Step 5: Create TTS Selector Component

Create `/src/components/TTSSelector.vue`:

```vue
<template>
  <div class="tts-selector">
    <label class="tts-label">Text-to-Speech Engine:</label>
    <div class="tts-options">
      <button
        :class="['tts-option', { active: ttsEngine === 'web-speech' }]"
        @click="setTTSEngine('web-speech')"
      >
        <span class="icon">🌐</span>
        <span class="name">Web Speech API</span>
        <span class="badge">Client-side</span>
      </button>

      <button
        :class="['tts-option', { active: ttsEngine === 'piper', disabled: !piperAvailable }]"
        :disabled="!piperAvailable"
        @click="setTTSEngine('piper')"
      >
        <span class="icon">🎙️</span>
        <span class="name">Piper TTS</span>
        <span v-if="piperAvailable" class="badge success">Available</span>
        <span v-else class="badge error">Offline</span>
      </button>
    </div>

    <p v-if="ttsEngine === 'piper' && piperAvailable" class="tts-info">
      Using high-quality neural TTS via Piper
    </p>
    <p v-else-if="ttsEngine === 'piper' && !piperAvailable" class="tts-info error">
      Piper TTS is unavailable. Using Web Speech API as fallback.
    </p>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useTranslationStore } from '@/stores/translation';

const store = useTranslationStore();
const { ttsEngine, piperAvailable } = storeToRefs(store);
const { setTTSEngine } = store;
</script>

<style scoped>
.tts-selector {
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.tts-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.tts-options {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.tts-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.tts-option:hover:not(:disabled) {
  border-color: #0066cc;
  transform: translateY(-2px);
}

.tts-option.active {
  border-color: #0066cc;
  background: #e6f2ff;
}

.tts-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-option .icon {
  font-size: 2rem;
}

.tts-option .name {
  font-weight: 600;
  color: #333;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e9ecef;
  color: #495057;
}

.badge.success {
  background: #d4edda;
  color: #155724;
}

.badge.error {
  background: #f8d7da;
  color: #721c24;
}

.tts-info {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.tts-info.error {
  color: #dc3545;
}
</style>
```

### Step 6: Add to MainView

Update `/src/views/MainView.vue`:

```vue
<template>
  <div class="main-view">
    <!-- Existing components -->
    <LanguageSelector />
    <RecordButton />

    <!-- NEW: TTS Selector -->
    <TTSSelector />

    <!-- Rest of your components -->
    <ConversationList />
  </div>
</template>

<script setup lang="ts">
// Add import
import TTSSelector from '@/components/TTSSelector.vue';
// ... rest of imports
</script>
```

### Step 7: Set Up Piper Server

#### Option A: Docker (Recommended)

Create `docker/piper/Dockerfile`:

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Piper
RUN pip install piper-tts[http]

# Create models directory
WORKDIR /models

# Download voice models
RUN python3 -m piper.download_voice en_US-lessac-medium && \
    python3 -m piper.download_voice it_IT-riccardo-medium && \
    python3 -m piper.download_voice fr_FR-mls-medium && \
    python3 -m piper.download_voice de_DE-thorsten-medium && \
    python3 -m piper.download_voice es_ES-mls-medium && \
    python3 -m piper.download_voice pt_BR-faber-medium && \
    python3 -m piper.download_voice nl_NL-mls-medium && \
    python3 -m piper.download_voice pl_PL-mls-medium && \
    python3 -m piper.download_voice ru_RU-ruslan-medium && \
    python3 -m piper.download_voice ja_JP-mls-medium && \
    python3 -m piper.download_voice zh_CN-huayan-medium

EXPOSE 5000

# Start server with default voice
CMD ["python3", "-m", "piper.http_server", \
     "--model", "/models/en_US-lessac-medium.onnx", \
     "--host", "0.0.0.0", \
     "--port", "5000"]
```

Build and run:

```bash
cd docker/piper
docker build -t piper-tts-server .
docker run -d -p 5000:5000 --name piper piper-tts-server
```

#### Option B: Local Development

```bash
# Install Piper
pip install piper-tts[http]

# Download voices
python3 -m piper.download_voice en_US-lessac-medium
python3 -m piper.download_voice it_IT-riccardo-medium
# ... download other languages

# Start server
python3 -m piper.http_server --model en_US-lessac-medium.onnx
```

## Testing

### Test Piper Server

```bash
# Test synthesis
curl -X POST \
  -H 'Content-Type: text/plain' \
  --data 'Hello from Piper TTS!' \
  -o test.wav \
  http://localhost:5000/

# Play audio (macOS)
afplay test.wav

# Play audio (Linux)
aplay test.wav
```

### Test Serverless Function

```bash
# Start dev server
npm run dev

# Test endpoint
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{"text":"Testing serverless function","language":"en_US"}' \
  -o test.wav \
  http://localhost:5173/api/synthesize
```

### Test Frontend Integration

1. Start both servers:
   ```bash
   # Terminal 1: Piper server
   python3 -m piper.http_server --model en_US-lessac-medium.onnx

   # Terminal 2: Vite dev server
   npm run dev
   ```

2. Open http://localhost:5173
3. Select "Piper TTS" engine
4. Translate text and listen to audio

## Production Deployment

### Deploy Piper Server

**Fly.io** (recommended):

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create app
flyctl launch

# Deploy
flyctl deploy
```

**Railway**:

```bash
# Push Docker image
railway login
railway up
```

### Configure Environment

Production `.env`:

```env
PIPER_SERVER_URL=https://your-piper-app.fly.dev
```

## Cost Estimation

### Hosting Costs

**Fly.io** (recommended):
- Shared CPU 1x: $0.002/hour (~$1.50/month)
- 256 MB RAM: Free tier
- Total: ~$1.50/month

**Railway**:
- Hobby plan: $5/month
- Includes 500 hours runtime

**Self-hosted VPS** (DigitalOcean, Linode):
- Basic droplet: $6/month
- Can run multiple services

### Traffic Costs

Assuming 1000 TTS requests/day:
- Average audio: 50 KB/request
- Monthly transfer: ~1.5 GB
- Cost: Free tier on most platforms

## Performance Comparison

| Metric | Web Speech API | Piper TTS |
|--------|---------------|-----------|
| Quality | Good | Excellent |
| Voices per language | 1-3 | 1-5 |
| Offline support | No | Yes (if server local) |
| Latency | Instant | 200-500ms |
| Server required | No | Yes |
| Cost | Free | $1.50-6/month |
| Customization | Limited | Full control |

## Troubleshooting

### Piper Server Not Responding

```bash
# Check if server is running
curl http://localhost:5000/voices

# Check logs
docker logs piper

# Restart container
docker restart piper
```

### Audio Not Playing

Check browser console for errors:
- CORS issues: Verify serverless function headers
- Network errors: Check PIPER_SERVER_URL
- Format errors: Ensure WAV format is correct

### Slow Synthesis

- Use lower quality models (e.g., `-low` instead of `-medium`)
- Enable GPU with `--cuda` flag
- Add caching layer in serverless function

## Next Steps

- Add voice selection UI
- Implement audio caching
- Add pronunciation customization
- Support custom voice models

## Related Documentation

- [Piper TTS Overview](../README.md)
- [HTTP API Reference](../HTTP_API.md)
- [Python API Reference](../PYTHON_API.md)
