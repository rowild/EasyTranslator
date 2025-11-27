# Mistral Voxtral Documentation

**Version**: Latest (voxtral-mini-latest, voxtral-small-latest)
**Fetched**: 2025-11-26
**Sources**:
- https://mistral.ai/news/voxtral
- https://docs.mistral.ai/capabilities/audio_transcription

## Overview

Voxtral is Mistral AI's frontier open-source speech understanding model family designed for production-scale and edge deployments. Released July 15, 2025, under Apache 2.0 license.

## Model Variants

### Voxtral (24B)
- **Use Case**: Production-scale applications
- **Model ID**: `voxtral-small-latest`
- **Context Window**: 32k tokens (30 min transcription, 40 min understanding)
- **Features**: Full speech understanding, Q&A, summarization, function-calling

### Voxtral Mini (3B)
- **Use Case**: Local and edge deployments
- **Model ID**: `voxtral-mini-latest`
- **Context Window**: 32k tokens (30 min transcription, 40 min understanding)
- **Features**: Optimized for efficiency while maintaining quality

### Voxtral Mini Transcribe
- **Use Case**: API-optimized transcription
- **Model ID**: `voxtral-mini-latest` (via `/v1/audio/transcriptions`)
- **Pricing**: $0.001 per minute
- **Optimization**: Cost and latency efficiency for transcription tasks

## Core Capabilities

- **Long-form Context**: Up to 30 minutes of audio transcription or 40 minutes for understanding tasks
- **Built-in Q&A and Summarization**: Direct questioning and structured summary generation
- **Native Multilingual Support**: Automatic language detection across English, Spanish, French, Portuguese, Hindi, German, Dutch, Italian, and others
- **Function-Calling from Voice**: Direct triggering of backend functions based on spoken intents
- **Text Understanding**: Retains capabilities of Mistral Small 3.1 language model backbone

## Quick Start

### Transcription Only
```python
import os
from mistralai import Mistral

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

with open("/path/to/file/audio.mp3", "rb") as f:
    transcription_response = client.audio.transcriptions.complete(
        model="voxtral-mini-latest",
        file={"content": f, "file_name": "audio.mp3"},
    )

print(transcription_response)
```

### Chat with Audio
```python
import base64
from mistralai import Mistral

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

with open("audio.mp3", "rb") as f:
    audio_base64 = base64.b64encode(f.read()).decode('utf-8')

chat_response = client.chat.complete(
    model="voxtral-mini-latest",
    messages=[{
        "role": "user",
        "content": [
            {"type": "input_audio", "input_audio": audio_base64},
            {"type": "text", "text": "What's in this file?"}
        ]
    }]
)
```

## Pricing

- **API Transcription**: $0.001 per minute
- **Self-Hosted**: Free (Apache 2.0 license via Hugging Face)

## Performance Benchmarks

Voxtral outperforms comparable systems:
- Exceeds Whisper large-v3 on English and multilingual benchmarks
- Beats GPT-4o mini Transcribe and Gemini 2.5 Flash across transcription tasks
- Achieves state-of-the-art results on English short-form and Mozilla Common Voice
- Competitive with GPT-4o-mini on audio understanding tasks
- Unparalleled cost and latency-efficiency for transcription

## Enterprise Features

- Private production-scale deployment within customer infrastructure
- Domain-specific fine-tuning for specialized contexts
- Advanced features: speaker identification, emotion detection
- Dedicated integration support

## See Also

- [API Reference](./API.md) - Complete API documentation
- [Examples](./examples/) - Code examples for various use cases
- [version.txt](./version.txt) - Version information and notes
