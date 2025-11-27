# Piper TTS HTTP API

## Overview

The Piper HTTP server provides a RESTful API for text-to-speech synthesis. It's the recommended interface for web applications, microservices, and serverless backends. The model is loaded once when the server starts, making it much faster than the CLI for repeated synthesis.

## Installation

Install Piper with HTTP dependencies:

```bash
pip install piper-tts[http]
```

## Starting the Server

### Basic Usage

```bash
# Start server with a specific voice model
python3 -m piper.http_server --model en_US-lessac-medium

# Server runs on http://localhost:5000 by default
```

### With Custom Configuration

```bash
# Specify host and port
python3 -m piper.http_server \
  --model en_US-lessac-medium \
  --host 0.0.0.0 \
  --port 8080

# With GPU acceleration
python3 -m piper.http_server \
  --model en_US-lessac-medium \
  --cuda

# Multiple speakers (if model supports it)
python3 -m piper.http_server \
  --model multi_speaker_model \
  --speaker 0
```

### Server Options

```bash
--model PATH          # Path to .onnx voice model (required)
--host HOST          # Server host (default: localhost)
--port PORT          # Server port (default: 5000)
--cuda               # Enable GPU acceleration
--speaker NUMBER     # Default speaker ID for multi-speaker models
--help               # Show all options
```

## API Endpoints

### POST / - Synthesize Speech (Primary Endpoint)

Generate audio from text using POST request.

#### Request

**Method**: `POST`

**URL**: `http://localhost:5000/`

**Headers**:
```
Content-Type: text/plain
```

**Body**: Plain text to synthesize

#### Response

**Status**: `200 OK`

**Headers**:
```
Content-Type: audio/wav
```

**Body**: WAV audio file (binary)

#### Example (curl)

```bash
# Basic synthesis
curl -X POST \
  -H 'Content-Type: text/plain' \
  --data 'Hello, this is a test of the Piper TTS system.' \
  -o output.wav \
  'http://localhost:5000/'

# Multi-line text
curl -X POST \
  -H 'Content-Type: text/plain' \
  --data 'First sentence. Second sentence. Third sentence.' \
  -o output.wav \
  'http://localhost:5000/'
```

#### Example (JavaScript/Fetch)

```javascript
async function synthesizeSpeech(text) {
  const response = await fetch('http://localhost:5000/', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: text
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const audioBlob = await response.blob();
  return audioBlob;
}

// Usage
synthesizeSpeech('Hello, world!')
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  });
```

#### Example (Python/requests)

```python
import requests

def synthesize_speech(text, output_file='output.wav'):
    response = requests.post(
        'http://localhost:5000/',
        headers={'Content-Type': 'text/plain'},
        data=text.encode('utf-8')
    )

    if response.status_code == 200:
        with open(output_file, 'wb') as f:
            f.write(response.content)
        return True
    else:
        raise Exception(f"Synthesis failed: {response.status_code}")

# Usage
synthesize_speech("Hello from Python!")
```

### GET / - Synthesize Speech (Alternative)

Generate audio from text using GET request with query parameters.

#### Request

**Method**: `GET`

**URL**: `http://localhost:5000/?text=YOUR_TEXT_HERE`

**Query Parameters**:
- `text` (required): Text to synthesize (URL-encoded)

#### Response

Same as POST endpoint (WAV audio file)

#### Example (curl)

```bash
# Simple GET request
curl -G \
  --data-urlencode 'text=This is a test.' \
  -o output.wav \
  'http://localhost:5000/'

# With special characters
curl -G \
  --data-urlencode 'text=Hello! How are you? I am fine, thank you.' \
  -o output.wav \
  'http://localhost:5000/'
```

#### Example (JavaScript)

```javascript
async function synthesizeSpeechGET(text) {
  const params = new URLSearchParams({ text });
  const response = await fetch(`http://localhost:5000/?${params}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.blob();
}
```

### GET /voices - List Available Voices

Retrieve information about all available voice models on the server.

#### Request

**Method**: `GET`

**URL**: `http://localhost:5000/voices`

#### Response

**Status**: `200 OK`

**Headers**:
```
Content-Type: application/json
```

**Body**: JSON array of voice objects

```json
[
  {
    "name": "en_US-lessac-medium",
    "language": "en_US",
    "quality": "medium",
    "speakers": 1
  }
]
```

#### Example

```bash
# List voices
curl http://localhost:5000/voices | jq
```

```javascript
// Fetch available voices
async function getVoices() {
  const response = await fetch('http://localhost:5000/voices');
  const voices = await response.json();
  return voices;
}

getVoices().then(voices => {
  console.log('Available voices:', voices);
});
```

## Advanced Synthesis Parameters

### JSON Request Format (Extended API)

For advanced control, send JSON payload with synthesis parameters:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  --data '{
    "text": "This is advanced synthesis.",
    "length_scale": 1.2,
    "noise_scale": 0.667,
    "noise_w": 0.8,
    "speaker": 0
  }' \
  -o output.wav \
  'http://localhost:5000/'
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | string | (required) | Text to synthesize |
| `length_scale` | float | 1.0 | Speaking speed (< 1.0 faster, > 1.0 slower) |
| `noise_scale` | float | 0.667 | Speech variability (lower = robotic, higher = natural) |
| `noise_w` | float | 0.8 | Duration variability |
| `speaker` | int | 0 | Speaker ID (for multi-speaker models) |

### Example: Slower, More Expressive Speech

```javascript
async function synthesizeExpressive(text) {
  const response = await fetch('http://localhost:5000/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      length_scale: 1.3,    // 30% slower
      noise_scale: 0.8,     // More natural variation
      noise_w: 0.9          // More duration variation
    })
  });

  return await response.blob();
}
```

## Integration Patterns

### Pattern 1: Direct Frontend to Piper (Development Only)

```
Vue.js App → Piper HTTP Server (localhost:5000) → Audio Response
```

**Setup**: Run Piper server locally during development

```bash
# Terminal 1: Start Piper
python3 -m piper.http_server --model en_US-lessac-medium

# Terminal 2: Start Vue dev server
npm run dev
```

**Frontend Code**:

```typescript
// src/composables/usePiperTTS.ts
export function usePiperTTS() {
  const PIPER_URL = 'http://localhost:5000';

  async function synthesize(text: string): Promise<Blob> {
    const response = await fetch(PIPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text
    });

    if (!response.ok) {
      throw new Error(`Piper synthesis failed: ${response.status}`);
    }

    return await response.blob();
  }

  return { synthesize };
}
```

**Pros**:
- Simple setup
- Fast iteration

**Cons**:
- Not suitable for production (CORS, security)
- Server must run locally

### Pattern 2: Serverless Function Proxy (Production)

```
Vue.js App → Vercel Function (/api/synthesize) → Piper Server (VPS/Container) → Audio Response
```

**Piper Server** (runs on VPS/container):

```bash
# Run Piper on dedicated server
python3 -m piper.http_server \
  --host 0.0.0.0 \
  --port 5000 \
  --model en_US-lessac-medium
```

**Serverless Function** (`/api/synthesize.ts`):

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

const PIPER_SERVER_URL = process.env.PIPER_SERVER_URL || 'http://your-server:5000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const response = await fetch(PIPER_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text
    });

    if (!response.ok) {
      throw new Error(`Piper server error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: 'Synthesis failed' });
  }
}
```

**Frontend**:

```typescript
// src/composables/usePiperTTS.ts
export function usePiperTTS() {
  async function synthesize(text: string): Promise<Blob> {
    const response = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Synthesis failed: ${response.status}`);
    }

    return await response.blob();
  }

  return { synthesize };
}
```

**Environment Variables** (`.env`):

```
PIPER_SERVER_URL=http://your-piper-server:5000
```

**Pros**:
- Secure (API endpoint hidden from frontend)
- Scalable
- CORS handled by serverless function

**Cons**:
- Requires separate Piper server infrastructure
- Additional latency from proxy

### Pattern 3: Docker Container (All-in-One)

**Dockerfile**:

```dockerfile
FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Piper
RUN pip install piper-tts[http]

# Download voice model
WORKDIR /models
RUN python3 -m piper.download_voice en_US-lessac-medium

# Expose port
EXPOSE 5000

# Start server
CMD ["python3", "-m", "piper.http_server", \
     "--model", "/models/en_US-lessac-medium.onnx", \
     "--host", "0.0.0.0", \
     "--port", "5000"]
```

**Build and Run**:

```bash
# Build image
docker build -t piper-tts-server .

# Run container
docker run -d -p 5000:5000 --name piper piper-tts-server

# Test
curl -X POST \
  -H 'Content-Type: text/plain' \
  --data 'Docker test successful!' \
  -o test.wav \
  http://localhost:5000/
```

**Deploy to Fly.io** (example):

```bash
# Install flyctl
brew install flyctl  # macOS

# Login
flyctl auth login

# Launch app
flyctl launch

# Deploy
flyctl deploy
```

## Performance Optimization

### Caching Strategy

Cache frequently used phrases:

```typescript
class PiperCache {
  private cache = new Map<string, Blob>();
  private maxSize = 100;

  async synthesize(text: string): Promise<Blob> {
    // Check cache
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    // Synthesize
    const response = await fetch('http://localhost:5000/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text
    });

    const blob = await response.blob();

    // Store in cache
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(text, blob);

    return blob;
  }
}
```

### Request Queuing

Limit concurrent requests:

```typescript
class PiperQueue {
  private queue: Array<() => Promise<void>> = [];
  private active = 0;
  private maxConcurrent = 3;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.active++;
    const task = this.queue.shift();

    if (task) {
      await task();
      this.active--;
      this.processQueue();
    }
  }
}
```

## Error Handling

### Robust Client Implementation

```typescript
export class PiperClient {
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  async synthesize(text: string, retries = 0): Promise<Blob> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.blob();

    } catch (error) {
      if (retries < this.maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, this.retryDelay * (retries + 1))
        );
        return this.synthesize(text, retries + 1);
      }

      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

## Security Considerations

### Production Checklist

- [ ] **API Key Protection**: Add authentication to Piper endpoint
- [ ] **Rate Limiting**: Prevent abuse
- [ ] **Input Validation**: Limit text length
- [ ] **CORS Configuration**: Restrict allowed origins
- [ ] **HTTPS Only**: Encrypt traffic
- [ ] **Network Isolation**: Don't expose Piper directly to internet

### Example: Protected Endpoint

```typescript
// /api/synthesize.ts with rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Max 100 requests per window
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply rate limiting
  await limiter(req, res);

  // Validate input
  const { text } = req.body;
  if (!text || text.length > 5000) {
    return res.status(400).json({ error: 'Invalid text length' });
  }

  // Check API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Proceed with synthesis...
}
```

## Monitoring

### Health Check Endpoint

```python
# Custom health check (add to piper.http_server)
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'model': model_name,
        'uptime': time.time() - start_time
    })
```

### Logging

```bash
# Run with logging
python3 -m piper.http_server \
  --model en_US-lessac-medium \
  2>&1 | tee piper.log
```

## Comparison: POST vs GET

| Aspect | POST | GET |
|--------|------|-----|
| Text Length | Unlimited | URL length limit (~2KB) |
| Caching | Not cached by browsers | Cached by default |
| Security | More secure (body not in logs) | Less secure (URL logged) |
| Bookmarkable | No | Yes |
| Best For | Production, long text | Quick tests, short phrases |

**Recommendation**: Use POST for production applications.

## Next Steps

- **Python Integration**: See [PYTHON_API.md](./PYTHON_API.md)
- **CLI Alternative**: See [CLI.md](./CLI.md)
- **EasyTranslator Integration**: See [examples/easytranslator-integration.md](./examples/easytranslator-integration.md)

## Version Information

- **Piper Version**: 1.3.0
- **Documentation Updated**: 2025-11-27
