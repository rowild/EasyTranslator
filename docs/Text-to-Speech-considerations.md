# Text-to-Speech Integration Considerations

## Current Implementation

EasyTranslator currently uses the **Web Speech API** (`speechSynthesis`) for text-to-speech:

### Advantages
- ✅ **Free** - No server costs
- ✅ **Offline capable** - Works without internet
- ✅ **Zero latency** - Runs on device
- ✅ **No backend required** - Pure client-side
- ✅ **Wide browser support** - Works on most modern browsers

### Disadvantages
- ❌ **Inconsistent quality** - Varies by OS/browser
- ❌ **Different voices** - iPhone vs Android vs Desktop
- ❌ **Limited control** - Cannot customize prosody/speed effectively
- ❌ **Voice availability varies** - Not all languages on all devices

---

## Open-Source TTS Alternatives

### 1. Piper TTS (Recommended)
- **Quality**: Good, natural-sounding voices
- **Speed**: Fast inference (50-200ms per sentence)
- **Size**: 20-40 MB per voice model
- **Languages**: Excellent multilingual support (50+ languages)
- **License**: MIT
- **GitHub**: https://github.com/rhasspy/piper
- **Models**: https://github.com/OHF-Voice/piper1-gpl

### 2. Coqui XTTS v2
- **Quality**: High quality, very natural
- **Speed**: Slower (1-3 seconds per sentence)
- **Size**: Large models (1-2 GB)
- **Features**: Voice cloning capability
- **Note**: Coqui company shut down, but models still available

### 3. StyleTTS 2
- **Quality**: State-of-the-art naturalness
- **Speed**: Slow (2-5 seconds)
- **Resource**: Very heavy (requires GPU)

### 4. Bark (Suno AI)
- **Quality**: Extremely natural, handles emotions
- **Speed**: Very slow (5-10 seconds)
- **Resource**: Heavy GPU requirements

---

## Integration Architecture Comparison

### Option 1: Web Speech API (Current)
```
User's Phone → Browser → Local TTS → Audio Playback
```
- **Cost**: $0
- **Latency**: <50ms
- **Offline**: Yes

### Option 2: Cloud TTS Service
```
User's Phone → API Gateway → TTS Service → Audio → Phone
```
- **Cost**: $0.004-0.016 per request (Google/AWS)
- **Latency**: 200-500ms
- **Offline**: No

### Option 3: Self-Hosted Piper (Recommended)
```
User's Phone → Your Backend API → Piper TTS → Audio → Phone
```
- **Cost**: $0-5/month (see Fly.io details below)
- **Latency**: 150-300ms
- **Offline**: No

---

## Hosting Solutions for Piper TTS

### ❌ Cloudflare Workers (Not Viable)

**Why it doesn't work:**
- Cannot run native binaries (Piper is C++)
- 128 MB memory limit (too small for models)
- No persistent filesystem
- Would require WebAssembly compilation (doesn't exist for Piper)

**Cloudflare Workers AI:**
- Has limited TTS models built-in
- Not enough language coverage for our needs
- Models: https://developers.cloudflare.com/workers-ai/models/#text-to-speech

---

## ✅ RECOMMENDED: Fly.io + Docker

### Why Fly.io?

**Perfect fit for Piper TTS deployment:**

1. **Generous Free Tier**
   - 3 shared VMs with 256MB RAM each
   - 160GB bandwidth/month
   - Persistent volumes included
   - Perfect for MVP and small-medium traffic

2. **Persistent Storage**
   - Store all 15-20 Piper models (500-800 MB total)
   - Models stay loaded in memory for fast inference
   - No cold starts if you keep 1 VM running

3. **Global Edge Network**
   - Deploy to multiple regions (EU, US, Asia)
   - Low latency worldwide
   - Automatic routing to nearest region

4. **Docker-Based Deployment**
   - Package Piper + models once
   - Easy updates and maintenance
   - Reproducible builds

5. **Auto-Scaling**
   - Scales to 0 when not in use
   - Spins up in <1 second
   - Handles traffic spikes automatically

---

## Fly.io Implementation Details

### Architecture

```
┌─────────────────────────────────┐
│   Cloudflare Pages (Frontend)   │  ← Your Vue.js app (Free)
│   easytranslator.pages.dev      │
└────────────┬────────────────────┘
             │ HTTPS API call
             ↓
┌─────────────────────────────────┐
│   Fly.io Container (Backend)    │  ← Docker container ($0-5/month)
│   easytranslator-tts.fly.dev    │
│  ┌─────────────────────────────┐│
│  │ Node.js/Python API Server   ││
│  ├─────────────────────────────┤│
│  │ Piper Binary                ││
│  ├─────────────────────────────┤│
│  │ Voice Models (preloaded)    ││
│  │ ├── fr_FR/                  ││
│  │ │   ├── siwis-medium.onnx   ││
│  │ │   └── tom-medium.onnx     ││
│  │ ├── de_DE/                  ││
│  │ │   ├── eva_k-medium.onnx   ││
│  │ │   └── thorsten-medium.onnx││
│  │ ├── es_ES/                  ││
│  │ └── ... (15-20 languages)   ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Docker Container Structure

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Piper TTS
RUN pip install piper-tts fastapi uvicorn

# Copy pre-downloaded models
COPY models/ /app/models/
# Directory structure:
# /app/models/
#   ├── fr_FR/
#   │   ├── siwis-medium.onnx (28 MB)
#   │   ├── siwis-medium.onnx.json
#   │   ├── tom-medium.onnx (32 MB)
#   │   └── tom-medium.onnx.json
#   ├── de_DE/
#   │   ├── eva_k-medium.onnx (30 MB)
#   │   ├── eva_k-medium.onnx.json
#   │   ├── thorsten-medium.onnx (32 MB)
#   │   └── thorsten-medium.onnx.json
#   ├── es_ES/
#   │   └── ...
#   └── ... (more languages)

# API Server
COPY server.py /app/
WORKDIR /app

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

### API Server Example (Python + FastAPI)

```python
# server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from piper import PiperVoice
import io
import base64
import logging

app = FastAPI()

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://easytranslator.pages.dev"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Store preloaded voices in memory
voices = {}

@app.on_event("startup")
async def load_models():
    """Preload all models on startup (takes ~5-10 seconds)"""
    logging.info("Loading Piper voice models...")

    # French
    voices['fr-FR-female'] = PiperVoice.load('/app/models/fr_FR/siwis-medium.onnx')
    voices['fr-FR-male'] = PiperVoice.load('/app/models/fr_FR/tom-medium.onnx')

    # German
    voices['de-DE-female'] = PiperVoice.load('/app/models/de_DE/eva_k-medium.onnx')
    voices['de-DE-male'] = PiperVoice.load('/app/models/de_DE/thorsten-medium.onnx')

    # Spanish
    voices['es-ES-female'] = PiperVoice.load('/app/models/es_ES/carlfm-medium.onnx')
    voices['es-ES-male'] = PiperVoice.load('/app/models/es_ES/sharvard-medium.onnx')

    # Italian
    voices['it-IT-female'] = PiperVoice.load('/app/models/it_IT/riccardo-medium.onnx')
    voices['it-IT-male'] = PiperVoice.load('/app/models/it_IT/riccardo-medium.onnx')

    # Portuguese
    voices['pt-PT-female'] = PiperVoice.load('/app/models/pt_PT/tugao-medium.onnx')

    # Dutch
    voices['nl-NL-female'] = PiperVoice.load('/app/models/nl_NL/rdh-medium.onnx')
    voices['nl-NL-male'] = PiperVoice.load('/app/models/nl_NL/nathalie-medium.onnx')

    # Polish
    voices['pl-PL-female'] = PiperVoice.load('/app/models/pl_PL/darkman-medium.onnx')

    # Russian
    voices['ru-RU-female'] = PiperVoice.load('/app/models/ru_RU/irina-medium.onnx')

    # Japanese
    voices['ja-JP-female'] = PiperVoice.load('/app/models/ja_JP/hikari-medium.onnx')

    # Chinese
    voices['zh-CN-female'] = PiperVoice.load('/app/models/zh_CN/huayan-medium.onnx')

    logging.info(f"Loaded {len(voices)} voice models successfully")

@app.get("/")
async def root():
    return {"status": "ok", "service": "Piper TTS API", "voices": len(voices)}

@app.get("/api/voices")
async def list_voices():
    """List all available voices"""
    return {
        "voices": list(voices.keys()),
        "count": len(voices)
    }

@app.post("/api/speak")
async def speak(text: str, lang: str, voice: str = "female"):
    """
    Generate speech from text

    Args:
        text: Text to speak (max 500 characters recommended)
        lang: Language code (e.g., "fr-FR", "de-DE")
        voice: "male" or "female"

    Returns:
        JSON with base64-encoded WAV audio
    """

    # Validate input
    if len(text) > 1000:
        raise HTTPException(400, "Text too long (max 1000 characters)")

    if not text.strip():
        raise HTTPException(400, "Text cannot be empty")

    # Build voice key
    voice_key = f"{lang}-{voice}"

    if voice_key not in voices:
        raise HTTPException(
            404,
            f"Voice not found: {voice_key}. Available: {list(voices.keys())}"
        )

    try:
        # Generate audio (typically 100-300ms)
        audio_stream = io.BytesIO()
        voices[voice_key].synthesize(text, audio_stream)
        audio_bytes = audio_stream.getvalue()

        # Return as base64-encoded audio
        return {
            "audio": base64.b64encode(audio_bytes).decode('utf-8'),
            "format": "wav",
            "size": len(audio_bytes),
            "voice": voice_key
        }

    except Exception as e:
        logging.error(f"TTS generation failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {str(e)}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": len(voices)
    }
```

### Frontend Integration

```typescript
// src/services/piperTTS.ts
const PIPER_API = import.meta.env.VITE_PIPER_API_URL || 'https://easytranslator-tts.fly.dev';

interface PiperResponse {
  audio: string; // base64-encoded WAV
  format: string;
  size: number;
  voice: string;
}

export async function speakWithPiper(
  text: string,
  lang: string,
  voice: 'male' | 'female' = 'female'
): Promise<void> {
  try {
    const response = await fetch(`${PIPER_API}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, voice })
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    const data: PiperResponse = await response.json();

    // Convert base64 to audio blob
    const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Play audio
    const audioElement = new Audio(audioUrl);
    await audioElement.play();

    // Cleanup
    audioElement.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  } catch (error) {
    console.error('Piper TTS error:', error);
    throw error;
  }
}

export async function getAvailableVoices(): Promise<string[]> {
  const response = await fetch(`${PIPER_API}/api/voices`);
  const data = await response.json();
  return data.voices;
}
```

### Update TextToSpeech.vue Component

```typescript
// Add to TextToSpeech.vue
import { speakWithPiper } from '../services/piperTTS';

// Add toggle for Piper vs Web Speech API
const usePiperTTS = ref(localStorage.getItem('use-piper-tts') === 'true');

const toggleSpeech = async () => {
  if (isSpeaking.value) {
    speechSynthesis.cancel();
    isSpeaking.value = false;
  } else {
    if (usePiperTTS.value) {
      // Use Piper TTS
      try {
        isSpeaking.value = true;
        await speakWithPiper(props.text, props.lang);
      } catch (error) {
        console.error('Piper TTS failed, falling back to Web Speech API');
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(props.text);
        utterance.lang = props.lang;
        speechSynthesis.speak(utterance);
      } finally {
        isSpeaking.value = false;
      }
    } else {
      // Use Web Speech API (current implementation)
      const utterance = new SpeechSynthesisUtterance(props.text);
      utterance.lang = props.lang;
      if (selectedVoice.value) {
        utterance.voice = selectedVoice.value;
      }
      utterance.onstart = () => { isSpeaking.value = true; };
      utterance.onend = () => { isSpeaking.value = false; };
      utterance.onerror = () => { isSpeaking.value = false; };
      speechSynthesis.speak(utterance);
    }
  }
};
```

---

## Deployment Steps

### 1. Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Create Fly.io App

```bash
# In your project directory
fly launch --name easytranslator-tts --region fra

# This creates fly.toml configuration file
```

### 4. Configure fly.toml

```toml
# fly.toml
app = "easytranslator-tts"
primary_region = "fra"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[env]
  LOG_LEVEL = "info"
```

### 5. Add Volume for Models (Optional)

```bash
# If models are too large for Docker image
fly volumes create piper_models --size 1 --region fra
```

### 6. Deploy

```bash
# Build and deploy
fly deploy

# Check status
fly status

# View logs
fly logs
```

### 7. Add Custom Domain (Optional)

```bash
fly certs add tts.easytranslator.com
```

---

## Cost Breakdown

### Fly.io Pricing

**Free Tier (Sufficient for Starting):**
- 3 shared-cpu VMs with 256MB RAM each
- 160 GB outbound data transfer/month
- Persistent volumes: 3GB included
- **Total: $0/month** for low-medium traffic

**Estimated Traffic Capacity (Free Tier):**
- Each TTS request: ~50-150 KB audio
- 160GB / 100KB = ~1.6 million requests/month
- **Realistically**: 10,000-50,000 requests/month

**Paid Usage (If Exceeding Free Tier):**
- Shared CPU VM: $1.94/month per 256MB
- Memory: $0.0000008/MB-second
- Bandwidth: $0.02/GB (after free 160GB)
- Persistent volumes: $0.15/GB/month

**Example Cost Calculation (30k requests/month):**
- VM (512MB, always running): $3.88/month
- Bandwidth: 30k × 100KB = 3GB = Free (under 160GB)
- Storage (1GB volume): $0.15/month
- **Total: ~$4/month**

### Comparison with Alternatives

| Solution | Monthly Cost | Cold Starts | Quality | Control |
|----------|-------------|-------------|---------|---------|
| Web Speech API | $0 | No | Variable | Low |
| Google Cloud TTS | $4/1M chars | No | Good | Medium |
| AWS Polly | $4/1M chars | No | Good | Medium |
| Fly.io + Piper | $0-5 | <1s | Good | Full |
| Hetzner VPS | $4.50 | No | Good | Full |
| Railway | $5-10 | No | Good | Full |

---

## Model Selection Guide

### Recommended Models per Language

Download from: https://github.com/rhasspy/piper/releases

**Quality Levels:**
- `x_low`: 4-8 MB, fastest, lower quality
- `low`: 10-15 MB, fast, decent quality
- `medium`: 20-40 MB, good speed/quality balance ⭐
- `high`: 50-100 MB, slower, best quality

**Recommended Configuration:**
- Use `medium` quality for all languages
- Total size: ~500-800 MB for 15-20 languages
- Fits easily in Fly.io free tier

**Example Models:**

```bash
# French
fr_FR-siwis-medium.onnx (28 MB, female)
fr_FR-tom-medium.onnx (32 MB, male)

# German
de_DE-eva_k-medium.onnx (30 MB, female)
de_DE-thorsten-medium.onnx (32 MB, male)

# Spanish
es_ES-carlfm-medium.onnx (28 MB, female)
es_ES-sharvard-medium.onnx (30 MB, male)

# Italian
it_IT-riccardo_fasol-medium.onnx (25 MB, male)

# Portuguese
pt_PT-tugao-medium.onnx (32 MB, female)

# Dutch
nl_NL-rdh-medium.onnx (28 MB, female)
nl_NL-nathalie-medium.onnx (30 MB, male)

# Polish
pl_PL-darkman-medium.onnx (26 MB, female)

# Russian
ru_RU-irina-medium.onnx (28 MB, female)

# Japanese
ja_JP-hikari-medium.onnx (35 MB, female)

# Chinese
zh_CN-huayan-medium.onnx (40 MB, female)
```

---

## Performance Characteristics

### Response Time Breakdown

```
User clicks Play button
    ↓
Frontend API call: ~20-50ms
    ↓
Backend receives request: ~10ms
    ↓
Piper TTS generation: ~100-300ms (depends on text length)
    ↓
Audio encoding to base64: ~10-20ms
    ↓
Response sent to frontend: ~20-50ms
    ↓
Audio playback starts
────────────────────────────
Total: ~150-430ms
```

**Factors affecting speed:**
- Text length (longer = slower)
- Model size (medium is fastest recommended quality)
- Server CPU (shared CPU on Fly.io is adequate)
- Network latency (use regional deployment)

### Optimization Strategies

1. **Regional Deployment**
   ```bash
   # Deploy to multiple regions
   fly regions add fra ams lhr # Europe
   fly regions add iad ord # US
   ```

2. **Keep VMs Warm**
   ```toml
   # fly.toml
   min_machines_running = 1  # Prevents cold starts
   ```

3. **Audio Caching**
   - Cache common phrases (localStorage)
   - Skip API call if already generated

4. **Streaming Audio** (Advanced)
   - Stream audio chunks as they're generated
   - Reduces perceived latency

---

## Migration Strategy

### Phase 1: Add Piper as Optional Premium Feature

```typescript
// Add toggle in settings
const ttsMode = ref<'browser' | 'premium'>('browser');

// Load from localStorage
onMounted(() => {
  const saved = localStorage.getItem('tts-mode');
  ttsMode.value = saved === 'premium' ? 'premium' : 'browser';
});

// Use appropriate TTS based on selection
if (ttsMode.value === 'premium') {
  await speakWithPiper(text, lang);
} else {
  speechSynthesis.speak(utterance);
}
```

**Benefits:**
- Users can opt-in to better quality
- App still works offline with browser TTS
- Easy A/B testing
- Gradual migration path

### Phase 2: Set Piper as Default (Optional)

Once stable, make Piper the default with browser TTS as fallback:

```typescript
try {
  await speakWithPiper(text, lang);
} catch (error) {
  console.warn('Piper TTS unavailable, using browser TTS');
  speechSynthesis.speak(utterance);
}
```

### Phase 3: Analytics & Monitoring

Track usage to optimize:

```typescript
// Log TTS usage
gtag('event', 'tts_used', {
  method: 'piper', // or 'browser'
  language: lang,
  duration: audioDuration
});
```

---

## Security Considerations

### API Rate Limiting

Add rate limiting to prevent abuse:

```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/api/speak", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def speak(...):
    # 10 requests per minute per IP
    ...
```

### Input Validation

```python
# Limit text length
if len(text) > 1000:
    raise HTTPException(400, "Text too long")

# Sanitize input
import re
text = re.sub(r'[^\w\s\.\,\!\?\-\'\"]', '', text)
```

### CORS Configuration

```python
# Only allow your frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://easytranslator.pages.dev"],
    allow_methods=["POST"],
    allow_headers=["*"],
)
```

### API Key (Optional)

```python
# Add API key authentication
@app.post("/api/speak")
async def speak(text: str, api_key: str = Header(...)):
    if api_key != os.getenv("TTS_API_KEY"):
        raise HTTPException(401, "Invalid API key")
    ...
```

---

## Monitoring & Logging

### Fly.io Built-in Monitoring

```bash
# View metrics
fly dashboard

# Real-time logs
fly logs

# SSH into VM
fly ssh console
```

### Custom Logging

```python
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)

@app.post("/api/speak")
async def speak(text: str, lang: str, voice: str):
    start_time = datetime.now()

    # ... TTS generation ...

    duration = (datetime.now() - start_time).total_seconds()
    logging.info(f"TTS generated: lang={lang}, voice={voice}, "
                f"length={len(text)}, duration={duration}s")
```

### Error Tracking

Consider integrating Sentry for error tracking:

```python
import sentry_sdk

sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    sentry_sdk.capture_exception(exc)
    return {"error": "Internal server error"}
```

---

## Alternative Hosting Providers

If Fly.io doesn't work out, here are alternatives:

### Railway ($5-10/month)
- Pros: Easy GitHub integration, nice UI
- Cons: More expensive than Fly.io
- Best for: Developers who want simplicity

### Render ($7/month)
- Pros: Good documentation, stable
- Cons: More expensive, fewer free tier options
- Best for: Production apps with steady traffic

### Hetzner VPS ($4.50/month)
- Pros: Predictable costs, no cold starts, generous resources
- Cons: Manual server management, no auto-scaling
- Best for: High traffic, cost-sensitive projects

### Google Cloud Run (Serverless)
- Pros: True serverless, scales to zero
- Cons: Cold starts (2-3s), complex pricing
- Best for: Variable traffic patterns

---

## Conclusion & Recommendation

### Current State (Web Speech API)
- ✅ Works well for MVP
- ✅ No costs
- ✅ Offline capable
- ❌ Inconsistent quality

### Recommended Upgrade Path (Fly.io + Piper)
- ✅ Consistent quality across all devices
- ✅ Full control over voices
- ✅ Minimal cost ($0-5/month)
- ✅ Easy to deploy and maintain
- ❌ Requires internet connection

### Implementation Timeline

**Week 1: Setup**
- Download Piper models
- Create Docker container
- Deploy to Fly.io
- Test API locally

**Week 2: Integration**
- Add Piper TTS service to frontend
- Implement fallback to Web Speech API
- Add user preference toggle

**Week 3: Testing & Optimization**
- Test across languages
- Monitor performance
- Optimize model loading
- Add caching

**Week 4: Launch**
- Deploy to production
- Monitor usage
- Collect user feedback
- Iterate based on data

---

## Resources

### Documentation
- **Piper TTS**: https://github.com/rhasspy/piper
- **Voice Models**: https://github.com/OHF-Voice/piper1-gpl
- **Fly.io Docs**: https://fly.io/docs/
- **FastAPI**: https://fastapi.tiangolo.com/

### Community
- **Piper Discord**: https://discord.gg/rhasspy
- **Fly.io Community**: https://community.fly.io/

### Model Downloads
- **Hugging Face**: https://huggingface.co/rhasspy/piper-voices
- **Direct Downloads**: https://github.com/rhasspy/piper/releases

---

**Last Updated**: November 2024
**Status**: Ready for implementation
**Estimated Setup Time**: 2-4 hours
**Estimated Cost**: $0-5/month
