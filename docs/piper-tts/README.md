# Piper TTS Documentation

## Overview

**Piper** is a fast, local neural text-to-speech engine designed for on-device speech synthesis. It embeds espeak-ng for phonemization and prioritizes speed, making it ideal for real-time applications, accessibility tools, and embedded systems.

### Key Features

- **100% Local Processing**: Runs entirely on-device without cloud dependencies
- **Fast Synthesis**: Optimized for real-time speech generation
- **Multi-Language Support**: 40+ languages with multiple voice options
- **Multiple Interfaces**: CLI, HTTP API, Python API, and C/C++ library
- **GPU Acceleration**: Optional CUDA support for faster processing
- **Open Source**: GPL-3.0 license with active community

### Repository

- **GitHub**: https://github.com/OHF-Voice/piper1-gpl
- **Stars**: 1.8k+
- **License**: GPL-3.0
- **Latest Version**: v1.3.0 (July 2025)

## What Makes Piper Unique

1. **Local-First Architecture**: No internet connection required after setup
2. **Lightweight**: Suitable for Raspberry Pi and embedded devices
3. **Production-Ready**: Used by Home Assistant, NVDA screen reader, and 396+ projects
4. **Voice Training**: Supports creating custom voices using VITS technology
5. **ONNX Runtime**: Models exported to ONNX format for cross-platform compatibility

## Architecture

### Technology Stack

- **Core Engine**: C++ (92.8%)
- **Python Bindings**: Python (6.6%)
- **Phonemization**: espeak-ng (embedded)
- **Model Format**: ONNX Runtime
- **Voice Training**: VITS (Variational Inference TTS)

### How It Works

```
Text Input → espeak-ng (Phonemization) → ONNX Model → WAV Audio Output
```

Piper uses espeak-ng's `espeak_TextToPhonemesWithTerminator` function to convert text into phonemes while preserving punctuation information. This allows voice models to adjust prosody based on sentence structure (periods, commas, questions, etc.).

## Installation

### Quick Start (Python)

```bash
pip install piper-tts
```

### With HTTP Server Support

```bash
pip install piper-tts[http]
```

### Development Installation

```bash
git clone https://github.com/OHF-voice/piper1-gpl.git
cd piper1-gpl
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

### System Requirements

**For Building from Source:**
- build-essential
- cmake
- ninja-build
- Python 3.7+

**Optional (for GPU acceleration):**
- CUDA toolkit
- onnxruntime-gpu

## Supported Languages

Piper supports 40+ languages including:

**European Languages:**
- English (US, GB, India)
- Spanish (Spain, Argentina, Mexico)
- French, German, Italian
- Portuguese (Brazil, Portugal)
- Dutch, Polish, Russian
- Czech, Danish, Finnish, Greek
- Norwegian, Swedish, Ukrainian

**Asian Languages:**
- Chinese (Mandarin)
- Japanese
- Hindi
- Korean
- Vietnamese

**Other Languages:**
- Arabic
- Turkish
- Catalan
- And many more...

Each language may have multiple voice options with different quality levels (low, medium, high).

## Available Interfaces

### 1. Command-Line Interface (CLI)

**Best for**: Quick testing, scripting, batch processing

**Pros:**
- Simple and straightforward
- No additional setup required

**Cons:**
- Slower for repeated use (loads model each time)
- Limited to file-based workflow

See [CLI.md](./CLI.md) for detailed documentation.

### 2. HTTP Web Server

**Best for**: Web application integration, microservices, serverless backends

**Pros:**
- Model loaded once, serves multiple requests
- RESTful API design
- Easy integration with any language/framework

**Cons:**
- Requires separate server process
- Additional HTTP overhead

See [HTTP_API.md](./HTTP_API.md) for detailed documentation.

### 3. Python API

**Best for**: Direct Python integration, custom applications, real-time synthesis

**Pros:**
- Full control over synthesis process
- Streaming support for real-time audio
- Lowest latency

**Cons:**
- Python-only
- Requires managing model lifecycle

See [PYTHON_API.md](./PYTHON_API.md) for detailed documentation.

### 4. C/C++ Library (libpiper)

**Best for**: Native applications, embedded systems, maximum performance

**Pros:**
- Highest performance
- Smallest memory footprint
- No Python dependency

**Cons:**
- More complex integration
- Manual memory management

See [BUILDING.md](./BUILDING.md) for compilation instructions.

## Performance Characteristics

### Speed Benchmarks

Piper is optimized for real-time synthesis:

- **CPU (Medium quality)**: ~1-2x real-time (generates 1 second of audio in 0.5-1 seconds)
- **GPU (CUDA)**: ~3-5x real-time
- **Raspberry Pi 4**: Real-time capable with low/medium quality voices

### Resource Usage

**Model Size:**
- Low quality: ~5-10 MB
- Medium quality: ~15-30 MB
- High quality: ~50-100 MB

**Memory:**
- Typical runtime: 50-200 MB RAM
- Embedded systems: Can run on 512 MB+ devices

**CPU:**
- Modern desktop: <10% CPU usage during synthesis
- Raspberry Pi 4: 30-50% CPU usage

## Voice Models

### Downloading Voices

Voice models are hosted on Hugging Face:
- **Repository**: https://huggingface.co/rhasspy/piper-voices
- **License**: MIT (check individual voice licenses)
- **Format**: Each voice requires 2 files:
  - `.onnx` (model file)
  - `.onnx.json` (configuration file)

### Voice Quality Levels

1. **Low Quality**
   - Smallest size (~5-10 MB)
   - Fastest synthesis
   - Good intelligibility
   - Best for: Embedded devices, bandwidth-constrained scenarios

2. **Medium Quality**
   - Balanced size (~15-30 MB)
   - Good synthesis speed
   - Natural-sounding
   - Best for: Most applications, recommended default

3. **High Quality**
   - Largest size (~50-100 MB)
   - Slower synthesis
   - Most natural prosody
   - Best for: Production applications, audiobooks, accessibility

### Popular Voices

**English (US):**
- `en_US-lessac-medium` (common example voice)
- `en_US-amy-medium`
- `en_US-ryan-high`

**Other Languages:**
Check the Hugging Face repository for the complete catalog.

## Integration with Web Applications

### Architecture Options

#### Option 1: Python Backend + HTTP API (Recommended)

```
Vue.js Frontend → Serverless Function (Python) → Piper HTTP Server → Audio Response
```

**Pros:**
- Clean separation of concerns
- Scalable
- Can run on Vercel/Netlify with container support

**Cons:**
- Requires containerization for serverless
- Cold start times

#### Option 2: Dedicated Backend Service

```
Vue.js Frontend → Node.js/FastAPI Backend → Piper HTTP Server → Audio Response
```

**Pros:**
- Model stays loaded (fast responses)
- Full control
- No cold starts

**Cons:**
- Requires always-on server
- More infrastructure to manage

#### Option 3: Client-Side (Not Recommended)

Piper requires ONNX Runtime which doesn't run efficiently in browsers. Use Web Speech API instead for client-side TTS.

### Recommended Setup for EasyTranslator

Given your current architecture (Vue 3 + Serverless Functions):

1. **Add Piper as Alternative TTS Backend** alongside Web Speech API
2. **Create Serverless Function** (`/api/synthesize.ts`) that:
   - Accepts text and language
   - Calls Piper HTTP server (running on separate container/VPS)
   - Returns WAV audio blob
3. **Frontend Integration** in your AudioPlayer component:
   - Toggle between Web Speech API (client-side) and Piper (server-side)
   - Handle audio playback for both sources

See [examples/vue-integration.md](./examples/vue-integration.md) for implementation details.

## Important Considerations

### Licensing

- **Piper Software**: GPL-3.0 (open source)
- **Voice Models**: Mostly MIT, but CHECK INDIVIDUAL LICENSES
- **Usage Restriction**: "Piper is intended for personal use and text to speech research only"

### Privacy

- **Local Processing**: All synthesis happens on your server/device
- **No Data Sent to Cloud**: Complete privacy for user text
- **GDPR Compliant**: No data collection by default

### Production Checklist

Before deploying Piper in production:

- [ ] Verify voice license allows commercial use
- [ ] Test performance on target hardware
- [ ] Implement proper error handling
- [ ] Set up monitoring for synthesis failures
- [ ] Cache commonly used phrases
- [ ] Consider voice model versioning strategy
- [ ] Plan for model updates and migrations

## Use Cases

### Perfect For:
- Privacy-focused applications
- Offline applications
- Accessibility tools
- Smart home automation
- Embedded devices
- Research projects
- Self-hosted services

### Not Ideal For:
- Client-side web apps (use Web Speech API)
- High-concurrency public services (without proper infrastructure)
- Applications requiring instant cold starts

## Community & Support

### Notable Projects Using Piper

- **Home Assistant**: Smart home automation platform
- **NVDA**: Screen reader for visually impaired users
- **LocalAI**: Local AI inference framework
- **Open Voice OS**: Voice assistant platform
- **396+ Projects**: Depend on Piper on GitHub

### Resources

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides in `/docs` folder
- **Samples**: https://rhasspy.github.io/piper-samples/
- **Training Guide**: Create custom voices
- **Build Guide**: Compile from source

## Next Steps

1. **Start with CLI**: [CLI.md](./CLI.md) - Test basic functionality
2. **Try HTTP API**: [HTTP_API.md](./HTTP_API.md) - Integrate with your app
3. **Explore Python API**: [PYTHON_API.md](./PYTHON_API.md) - Advanced integration
4. **See Examples**: [examples/](./examples/) - Real-world integration patterns

## Version Information

**Documentation Version**: 1.0
**Piper Version**: 1.3.0
**Last Updated**: 2025-11-27
**Fetched From**: https://github.com/OHF-Voice/piper1-gpl
