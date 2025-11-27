# Piper TTS Python API

## Overview

The Piper Python API provides direct integration with Piper TTS in Python applications. It offers the lowest latency, full control over the synthesis process, and supports streaming audio generation for real-time applications.

## Installation

```bash
pip install piper-tts
```

### Optional: GPU Acceleration

```bash
pip install onnxruntime-gpu
```

## Quick Start

### Basic Synthesis

```python
from piper import PiperVoice

# Load voice model
voice = PiperVoice.load('en_US-lessac-medium.onnx')

# Synthesize to WAV file
voice.synthesize('Hello, this is a test.', 'output.wav')
```

### Streaming Synthesis

```python
from piper import PiperVoice
import wave

voice = PiperVoice.load('en_US-lessac-medium.onnx')

# Stream audio chunks
with wave.open('output.wav', 'wb') as wav_file:
    # Set WAV parameters
    wav_file.setnchannels(1)  # Mono
    wav_file.setsampwidth(2)  # 16-bit
    wav_file.setframerate(voice.config.sample_rate)

    # Generate audio in chunks
    for audio_chunk in voice.synthesize_stream_raw('Hello from streaming API.'):
        wav_file.writeframes(audio_chunk)
```

## Core API

### PiperVoice Class

#### Loading a Voice Model

```python
from piper import PiperVoice

# Load from path
voice = PiperVoice.load('/path/to/en_US-lessac-medium.onnx')

# With GPU acceleration
voice = PiperVoice.load('en_US-lessac-medium.onnx', use_cuda=True)

# With custom speaker (multi-speaker models)
voice = PiperVoice.load('multi_speaker_model.onnx', speaker_id=1)
```

**Parameters**:
- `model_path` (str): Path to `.onnx` model file
- `use_cuda` (bool): Enable GPU acceleration (default: False)
- `speaker_id` (int): Default speaker ID for multi-speaker models (default: 0)

**Returns**: `PiperVoice` instance

#### synthesize() - File Output

Generate audio and save directly to WAV file.

```python
voice.synthesize(
    text='Your text here',
    wav_file='output.wav',
    length_scale=1.0,
    noise_scale=0.667,
    noise_w=0.8,
    sentence_silence=0.0
)
```

**Parameters**:
- `text` (str): Text to synthesize
- `wav_file` (str): Output WAV file path
- `length_scale` (float): Speaking speed (default: 1.0)
  - < 1.0: Faster speech
  - > 1.0: Slower speech
- `noise_scale` (float): Speech variability (default: 0.667)
  - Lower: More robotic/consistent
  - Higher: More natural/variable
- `noise_w` (float): Duration variability (default: 0.8)
- `sentence_silence` (float): Silence between sentences in seconds (default: 0.0)

**Returns**: None (writes to file)

**Example**:

```python
# Slower, more expressive speech
voice.synthesize(
    'This is slower and more natural.',
    'expressive.wav',
    length_scale=1.2,
    noise_scale=0.8,
    noise_w=0.9,
    sentence_silence=0.5
)
```

#### synthesize_stream_raw() - Streaming Audio

Generate audio as raw PCM chunks for real-time processing.

```python
for audio_chunk in voice.synthesize_stream_raw(
    text='Streaming text',
    length_scale=1.0,
    noise_scale=0.667,
    noise_w=0.8
):
    # audio_chunk is bytes of PCM audio data
    process_audio(audio_chunk)
```

**Parameters**:
- `text` (str): Text to synthesize
- `length_scale` (float): Speaking speed
- `noise_scale` (float): Speech variability
- `noise_w` (float): Duration variability

**Yields**: `bytes` - Raw PCM audio data (16-bit, mono)

**Use Cases**:
- Real-time playback
- Streaming over network
- Custom audio processing
- Integration with audio frameworks

#### Voice Properties

```python
# Access voice configuration
sample_rate = voice.config.sample_rate  # e.g., 22050
num_speakers = voice.config.num_speakers  # Number of speakers
language = voice.config.language  # e.g., 'en_US'

# Get current speaker ID
speaker_id = voice.speaker_id
```

### SynthesisConfig Class (Advanced)

For fine-grained control over synthesis parameters:

```python
from piper import PiperVoice, SynthesisConfig

voice = PiperVoice.load('en_US-lessac-medium.onnx')

# Create custom synthesis configuration
config = SynthesisConfig(
    length_scale=1.2,
    noise_scale=0.8,
    noise_w=0.9,
    sentence_silence=0.5
)

# Use with synthesis
voice.synthesize('Text here', 'output.wav', **config.__dict__)
```

## Complete Examples

### Example 1: Simple TTS Script

```python
#!/usr/bin/env python3
"""
Simple text-to-speech script
"""
from piper import PiperVoice
import sys

def main():
    if len(sys.argv) < 3:
        print("Usage: python tts.py <text> <output.wav>")
        sys.exit(1)

    text = sys.argv[1]
    output_file = sys.argv[2]

    # Load voice
    print("Loading voice model...")
    voice = PiperVoice.load('en_US-lessac-medium.onnx')

    # Synthesize
    print(f"Synthesizing: {text}")
    voice.synthesize(text, output_file)

    print(f"Audio saved to {output_file}")

if __name__ == '__main__':
    main()
```

**Usage**:
```bash
python tts.py "Hello, world!" output.wav
```

### Example 2: Real-Time Audio Playback

```python
#!/usr/bin/env python3
"""
Real-time audio playback using PyAudio
"""
from piper import PiperVoice
import pyaudio

def play_audio(text, model_path='en_US-lessac-medium.onnx'):
    # Load voice
    voice = PiperVoice.load(model_path)

    # Initialize PyAudio
    p = pyaudio.PyAudio()

    # Open stream
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=voice.config.sample_rate,
        output=True
    )

    try:
        # Stream audio chunks
        for audio_chunk in voice.synthesize_stream_raw(text):
            stream.write(audio_chunk)
    finally:
        # Cleanup
        stream.stop_stream()
        stream.close()
        p.terminate()

if __name__ == '__main__':
    play_audio("Hello! This is real-time text to speech playback.")
```

**Dependencies**:
```bash
pip install pyaudio
```

### Example 3: Batch Processing

```python
#!/usr/bin/env python3
"""
Batch process multiple text files to audio
"""
from piper import PiperVoice
from pathlib import Path

def batch_synthesize(input_dir, output_dir, model_path='en_US-lessac-medium.onnx'):
    # Load voice once (reused for all files)
    voice = PiperVoice.load(model_path)

    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # Process all .txt files
    for text_file in input_path.glob('*.txt'):
        print(f"Processing {text_file.name}...")

        # Read text
        text = text_file.read_text(encoding='utf-8')

        # Generate output filename
        output_file = output_path / f"{text_file.stem}.wav"

        # Synthesize
        voice.synthesize(text, str(output_file), sentence_silence=0.5)

        print(f"  → {output_file}")

    print("Batch processing complete!")

if __name__ == '__main__':
    batch_synthesize('texts/', 'audio/')
```

**Usage**:
```bash
python batch_tts.py
```

### Example 4: Multi-Language Support

```python
#!/usr/bin/env python3
"""
Multi-language TTS with automatic voice selection
"""
from piper import PiperVoice
from pathlib import Path

# Voice model mapping
VOICE_MODELS = {
    'en': 'en_US-lessac-medium.onnx',
    'de': 'de_DE-thorsten-medium.onnx',
    'es': 'es_ES-mls-medium.onnx',
    'fr': 'fr_FR-mls-medium.onnx',
    'it': 'it_IT-riccardo-medium.onnx',
    'ja': 'ja_JP-mls-medium.onnx',
    'zh': 'zh_CN-huayan-medium.onnx'
}

class MultiLanguageTTS:
    def __init__(self, model_dir='.'):
        self.model_dir = Path(model_dir)
        self.voices = {}

    def load_voice(self, language):
        """Load voice model for specified language"""
        if language not in VOICE_MODELS:
            raise ValueError(f"Unsupported language: {language}")

        if language not in self.voices:
            model_path = self.model_dir / VOICE_MODELS[language]
            self.voices[language] = PiperVoice.load(str(model_path))

        return self.voices[language]

    def synthesize(self, text, language, output_file):
        """Synthesize text in specified language"""
        voice = self.load_voice(language)
        voice.synthesize(text, output_file)

def main():
    tts = MultiLanguageTTS(model_dir='models/')

    # English
    tts.synthesize("Hello, world!", 'en', 'hello_en.wav')

    # German
    tts.synthesize("Guten Tag, Welt!", 'de', 'hello_de.wav')

    # Spanish
    tts.synthesize("¡Hola, mundo!", 'es', 'hello_es.wav')

    # French
    tts.synthesize("Bonjour, le monde!", 'fr', 'hello_fr.wav')

    print("Multi-language synthesis complete!")

if __name__ == '__main__':
    main()
```

### Example 5: Web Server Integration

```python
#!/usr/bin/env python3
"""
FastAPI server with Piper TTS
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from piper import PiperVoice
import io
import wave

app = FastAPI()

# Load voice at startup
voice = None

@app.on_event("startup")
def load_voice_model():
    global voice
    voice = PiperVoice.load('en_US-lessac-medium.onnx')
    print("Voice model loaded!")

@app.post("/synthesize")
async def synthesize(text: str):
    """Synthesize text to speech"""
    if not voice:
        raise HTTPException(status_code=503, detail="Voice model not loaded")

    if not text or len(text) > 5000:
        raise HTTPException(status_code=400, detail="Invalid text length")

    # Create in-memory WAV file
    wav_buffer = io.BytesIO()

    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(voice.config.sample_rate)

        # Generate audio
        for audio_chunk in voice.synthesize_stream_raw(text):
            wav_file.writeframes(audio_chunk)

    # Return audio
    wav_buffer.seek(0)
    return StreamingResponse(
        wav_buffer,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=speech.wav"}
    )

@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": voice is not None}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
```

**Dependencies**:
```bash
pip install fastapi uvicorn
```

**Run**:
```bash
python server.py
```

**Test**:
```bash
curl -X POST "http://localhost:8000/synthesize?text=Hello" -o test.wav
```

### Example 6: Async Integration with asyncio

```python
#!/usr/bin/env python3
"""
Async TTS using concurrent.futures
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from piper import PiperVoice

class AsyncPiperTTS:
    def __init__(self, model_path, max_workers=4):
        self.voice = PiperVoice.load(model_path)
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    async def synthesize(self, text, output_file):
        """Async synthesis using thread pool"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            self.executor,
            self.voice.synthesize,
            text,
            output_file
        )

    def shutdown(self):
        self.executor.shutdown()

async def main():
    tts = AsyncPiperTTS('en_US-lessac-medium.onnx')

    # Synthesize multiple texts concurrently
    tasks = [
        tts.synthesize("First sentence.", "output1.wav"),
        tts.synthesize("Second sentence.", "output2.wav"),
        tts.synthesize("Third sentence.", "output3.wav"),
    ]

    await asyncio.gather(*tasks)
    print("All syntheses complete!")

    tts.shutdown()

if __name__ == '__main__':
    asyncio.run(main())
```

## Advanced Usage

### Custom Audio Processing

```python
from piper import PiperVoice
import numpy as np

voice = PiperVoice.load('en_US-lessac-medium.onnx')

# Collect all audio chunks
audio_data = b''
for chunk in voice.synthesize_stream_raw('Hello, world!'):
    audio_data += chunk

# Convert to numpy array for processing
audio_array = np.frombuffer(audio_data, dtype=np.int16)

# Apply custom processing (e.g., normalize)
audio_normalized = audio_array / np.max(np.abs(audio_array))
audio_processed = (audio_normalized * 32767).astype(np.int16)

# Save processed audio
import wave
with wave.open('processed.wav', 'wb') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(voice.config.sample_rate)
    wav_file.writeframes(audio_processed.tobytes())
```

### Multi-Speaker Voices

```python
from piper import PiperVoice

# Load multi-speaker model
voice = PiperVoice.load('multi_speaker_model.onnx')

# Check number of speakers
num_speakers = voice.config.num_speakers
print(f"Available speakers: {num_speakers}")

# Generate audio with different speakers
for speaker_id in range(num_speakers):
    voice.speaker_id = speaker_id
    voice.synthesize(
        f"This is speaker {speaker_id}.",
        f"speaker_{speaker_id}.wav"
    )
```

### Phoneme Injection

```python
from piper import PiperVoice

voice = PiperVoice.load('en_US-lessac-medium.onnx')

# Use phonemes to control pronunciation
text = "This is [[h@loU]] world with custom phonemes."
voice.synthesize(text, 'phonemes.wav')
```

## Performance Optimization

### GPU Acceleration

```python
from piper import PiperVoice

# Enable CUDA (requires onnxruntime-gpu)
voice = PiperVoice.load('en_US-lessac-medium.onnx', use_cuda=True)

# Synthesis is now GPU-accelerated
voice.synthesize('Fast GPU synthesis!', 'gpu_output.wav')
```

**Performance Gain**: 3-10x faster depending on hardware

### Memory Management

```python
# For long-running applications, reuse voice instance
voice = PiperVoice.load('en_US-lessac-medium.onnx')

# Good: Reuse voice for multiple syntheses
for i in range(100):
    voice.synthesize(f"Sentence {i}", f"output_{i}.wav")

# Bad: Loading voice repeatedly
for i in range(100):
    voice = PiperVoice.load('en_US-lessac-medium.onnx')  # Slow!
    voice.synthesize(f"Sentence {i}", f"output_{i}.wav")
```

### Streaming for Large Texts

```python
from piper import PiperVoice
import wave

def synthesize_large_text(text, output_file, model_path='en_US-lessac-medium.onnx'):
    """Efficiently synthesize large texts using streaming"""
    voice = PiperVoice.load(model_path)

    with wave.open(output_file, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(voice.config.sample_rate)

        # Stream chunks (memory-efficient)
        for chunk in voice.synthesize_stream_raw(text):
            wav_file.writeframes(chunk)

# Process 10,000 word document
large_text = " ".join(["word"] * 10000)
synthesize_large_text(large_text, 'audiobook.wav')
```

## Error Handling

```python
from piper import PiperVoice
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def safe_synthesize(text, output_file, model_path='en_US-lessac-medium.onnx'):
    """Synthesis with comprehensive error handling"""
    try:
        # Load voice
        logger.info(f"Loading voice model: {model_path}")
        voice = PiperVoice.load(model_path)

        # Validate text
        if not text or len(text.strip()) == 0:
            raise ValueError("Text cannot be empty")

        if len(text) > 50000:
            raise ValueError("Text too long (max 50,000 characters)")

        # Synthesize
        logger.info(f"Synthesizing {len(text)} characters")
        voice.synthesize(text, output_file)

        logger.info(f"Audio saved to {output_file}")
        return True

    except FileNotFoundError:
        logger.error(f"Model file not found: {model_path}")
        return False

    except ValueError as e:
        logger.error(f"Invalid input: {e}")
        return False

    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        return False

# Usage
success = safe_synthesize("Hello, world!", "output.wav")
if not success:
    print("Synthesis failed, check logs")
```

## Integration with EasyTranslator

### Backend Service (FastAPI)

```python
# backend/piper_service.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from piper import PiperVoice
import io
import wave

app = FastAPI()

# CORS for Vue.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Voice models cache
voices = {}

def get_voice(language: str):
    """Load and cache voice models"""
    if language not in voices:
        model_path = f"models/{language}-medium.onnx"
        voices[language] = PiperVoice.load(model_path)
    return voices[language]

@app.post("/api/synthesize")
async def synthesize(text: str, language: str = "en_US"):
    """Synthesize text to speech"""
    try:
        voice = get_voice(language)

        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(voice.config.sample_rate)

            for chunk in voice.synthesize_stream_raw(text):
                wav_file.writeframes(chunk)

        wav_buffer.seek(0)
        return StreamingResponse(wav_buffer, media_type="audio/wav")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Comparison: Python API vs Other Interfaces

| Feature | Python API | HTTP Server | CLI |
|---------|-----------|-------------|-----|
| Latency | Lowest | Low | High |
| Control | Full | Limited | Limited |
| Streaming | Yes | No | No |
| Language | Python only | Any | Shell scripts |
| Setup | Simple | Medium | Simple |
| Best For | Python apps | Web apps | Testing |

## Next Steps

- **HTTP Server**: See [HTTP_API.md](./HTTP_API.md) for web integration
- **CLI Reference**: See [CLI.md](./CLI.md) for command-line usage
- **Examples**: See [examples/](./examples/) for more integration patterns

## Version Information

- **Piper Version**: 1.3.0
- **Python Version**: 3.7+
- **Documentation Updated**: 2025-11-27
