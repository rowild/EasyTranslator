# Piper TTS Command-Line Interface

## Overview

The Piper CLI is the simplest way to test and use Piper for text-to-speech synthesis. It's ideal for scripting, batch processing, and quick tests, though it's slower than the HTTP server for repeated use because it loads the voice model each time.

## Installation

```bash
pip install piper-tts
```

## Downloading Voice Models

Before using Piper, download at least one voice model:

### Using the Voice Manager

```bash
# Download a voice (example: US English)
python3 -m piper.download_voice en_US-lessac-medium

# List available voices
python3 -m piper.download_voice --list

# Download specific language
python3 -m piper.download_voice de_DE-thorsten-medium
```

### Manual Download

Visit https://huggingface.co/rhasspy/piper-voices and download:
- `[voice-name].onnx` (model file)
- `[voice-name].onnx.json` (config file)

Place both files in the same directory.

## Basic Usage

### Generate Audio File

```bash
# Basic synthesis with file output
python3 -m piper -m en_US-lessac-medium -f output.wav -- 'Hello, this is a test.'

# Using full path to model
python3 -m piper -m /path/to/en_US-lessac-medium.onnx -f test.wav -- 'Your text here'
```

### Direct Playback (requires ffplay)

```bash
# Play audio directly without saving
python3 -m piper -m en_US-lessac-medium -- 'Hello, world!'
```

**Note**: Requires `ffplay` (part of ffmpeg) to be installed:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Read from File

```bash
# Read text from file
python3 -m piper -m en_US-lessac-medium -f output.wav --input-file input.txt

# Process multiple sentences
cat story.txt | python3 -m piper -m en_US-lessac-medium -f audiobook.wav
```

## Command-Line Options

### Required Options

```bash
-m, --model PATH
```
Path to the `.onnx` voice model file (required)

### Output Options

```bash
-f, --output-file PATH
```
Save audio to WAV file (if omitted, plays directly via ffplay)

```bash
--output-raw
```
Output raw PCM audio instead of WAV format

### Audio Control

```bash
--volume FLOAT
```
Adjust output volume (default: 1.0, range: 0.0-2.0)

```bash
--no-normalize
```
Skip automatic volume normalization (use raw audio from voice model)

```bash
--sentence-silence SECONDS
```
Add silence between sentences in seconds (default: 0.0)

Example:
```bash
python3 -m piper -m en_US-lessac-medium -f speech.wav --sentence-silence 0.5 -- 'First sentence. Second sentence.'
```

### Speech Quality

```bash
--length-scale FLOAT
```
Adjust speaking speed (default: 1.0)
- < 1.0: Faster speech
- > 1.0: Slower speech

```bash
--noise-scale FLOAT
```
Control speech variability (default: 0.667)
- Lower: More consistent/robotic
- Higher: More variable/natural

```bash
--noise-w FLOAT
```
Control duration variability (default: 0.8)

Example:
```bash
# Slower, more expressive speech
python3 -m piper -m en_US-lessac-medium -f expressive.wav \
  --length-scale 1.2 --noise-scale 0.8 --noise-w 0.9 \
  -- 'This is more expressive speech.'
```

### Performance

```bash
--cuda
```
Enable GPU acceleration (requires onnxruntime-gpu)

```bash
pip install onnxruntime-gpu
python3 -m piper -m en_US-lessac-medium --cuda -f output.wav -- 'Fast GPU synthesis'
```

### Input Options

```bash
--input-file PATH
```
Read text from file instead of command line

```bash
--json-input
```
Process JSONL input for batch synthesis

Example JSONL format:
```json
{"text": "First sentence."}
{"text": "Second sentence."}
{"text": "Third sentence."}
```

Usage:
```bash
cat input.jsonl | python3 -m piper -m en_US-lessac-medium --json-input -f output.wav
```

### Multi-Speaker Voices

Some voices have multiple speakers:

```bash
--speaker NUMBER
```
Select speaker ID for multi-speaker models (default: 0)

```bash
# Use speaker 1 instead of default speaker 0
python3 -m piper -m multi_speaker_model -f output.wav --speaker 1 -- 'Hello'
```

### Debugging

```bash
--debug
```
Enable verbose logging for troubleshooting

```bash
--help
```
Display all available options

## Advanced Features

### Phoneme Injection

Override automatic phonemization using espeak-ng phoneme syntax:

```bash
python3 -m piper -m en_US-lessac-medium -f test.wav -- 'This is [[h@loU]] in phonemes.'
```

Phonemes inside `[[ ]]` blocks are passed directly to the voice model.

**Use cases:**
- Correct pronunciation of unusual words
- Control emphasis
- Handle abbreviations

**Example phoneme syntax:**
```
[[h@loU]] → "hello"
[[wɜːld]] → "world"
```

Refer to espeak-ng documentation for complete phoneme set: https://github.com/espeak-ng/espeak-ng/blob/master/docs/phonemes.md

### Processing Long Texts

For large documents, read from file:

```bash
# Process entire book
python3 -m piper -m en_US-lessac-medium \
  --input-file book.txt \
  --sentence-silence 0.8 \
  -f audiobook.wav
```

### Batch Processing

Process multiple files in a loop:

```bash
#!/bin/bash
for file in texts/*.txt; do
  output="audio/$(basename "$file" .txt).wav"
  python3 -m piper -m en_US-lessac-medium \
    --input-file "$file" \
    -f "$output"
done
```

## Binary Releases

Pre-compiled binaries are available for:

- **Linux (amd64)**: Standard x86_64 systems
- **Raspberry Pi 4 (arm64)**: ARM 64-bit
- **Raspberry Pi 3/4 (armv7)**: ARM 32-bit

Download from GitHub releases: https://github.com/OHF-Voice/piper1-gpl/releases

### Using Binary

```bash
# Download and extract
wget https://github.com/OHF-Voice/piper1-gpl/releases/download/v1.3.0/piper_linux_x86_64.tar.gz
tar -xzf piper_linux_x86_64.tar.gz

# Run directly
./piper -m en_US-lessac-medium -f test.wav -- 'Hello from binary'
```

## Performance Considerations

### Model Loading Time

The CLI loads the voice model **every time** it runs:

```bash
# Each command reloads the model (~1-3 seconds overhead)
python3 -m piper -m en_US-lessac-medium -f test1.wav -- 'First'
python3 -m piper -m en_US-lessac-medium -f test2.wav -- 'Second'
python3 -m piper -m en_US-lessac-medium -f test3.wav -- 'Third'
```

**Solution**: Use the HTTP server for repeated synthesis (see [HTTP_API.md](./HTTP_API.md))

### Synthesis Speed

Typical performance on modern hardware:

- **Low quality**: 3-5x real-time
- **Medium quality**: 1-2x real-time
- **High quality**: 0.5-1x real-time

With GPU (--cuda):
- **All qualities**: 3-10x real-time

## Example Workflows

### Simple Voice Over

```bash
#!/bin/bash
# Generate voice over for video

TEXT="Welcome to my channel. Today we'll discuss neural networks."
python3 -m piper -m en_US-lessac-medium \
  --length-scale 0.9 \
  --sentence-silence 0.5 \
  -f voiceover.wav \
  -- "$TEXT"
```

### Multi-Language Project

```bash
#!/bin/bash
# Generate audio in multiple languages

# English
python3 -m piper -m en_US-lessac-medium -f output_en.wav -- "Hello, world!"

# German
python3 -m piper -m de_DE-thorsten-medium -f output_de.wav -- "Hallo, Welt!"

# Spanish
python3 -m piper -m es_ES-mls-medium -f output_es.wav -- "¡Hola, mundo!"

# French
python3 -m piper -m fr_FR-mls-medium -f output_fr.wav -- "Bonjour, le monde!"
```

### Interactive Script

```bash
#!/bin/bash
# Interactive TTS script

echo "Enter text to synthesize (Ctrl+D to finish):"
cat > /tmp/input.txt

python3 -m piper -m en_US-lessac-medium \
  --input-file /tmp/input.txt \
  -f /tmp/output.wav

echo "Playing audio..."
ffplay -autoexit -nodisp /tmp/output.wav

rm /tmp/input.txt /tmp/output.wav
```

## Troubleshooting

### "No such file or directory" Error

```bash
# Make sure model file exists
ls en_US-lessac-medium.onnx
ls en_US-lessac-medium.onnx.json  # Config file must be present too!

# Use absolute path
python3 -m piper -m /full/path/to/model.onnx -f test.wav -- 'Test'
```

### Audio Quality Issues

```bash
# Disable normalization if audio sounds distorted
python3 -m piper -m model -f test.wav --no-normalize -- 'Test'

# Adjust volume
python3 -m piper -m model -f test.wav --volume 0.8 -- 'Test'

# Use different quality model
python3 -m piper -m en_US-lessac-high -f test.wav -- 'Test'
```

### Slow Performance

```bash
# Try GPU acceleration
python3 -m piper -m model --cuda -f test.wav -- 'Test'

# Use lower quality model
python3 -m piper -m en_US-lessac-low -f test.wav -- 'Test'

# Or use HTTP server for repeated synthesis (better performance)
```

### Missing Dependencies

```bash
# If piper module not found
pip install --upgrade piper-tts

# If ffplay not available
brew install ffmpeg  # macOS
sudo apt-get install ffmpeg  # Linux
```

## Comparison with Other Interfaces

| Feature | CLI | HTTP Server | Python API |
|---------|-----|-------------|------------|
| Setup Complexity | Lowest | Medium | Medium |
| Synthesis Speed | Slow (reloads model) | Fast | Fastest |
| Use Case | Testing, scripts | Web apps | Python apps |
| Real-time Streaming | No | No | Yes |
| Resource Efficiency | Low | High | Highest |
| Multi-request | Poor | Excellent | Good |

## Next Steps

- **For Web Integration**: See [HTTP_API.md](./HTTP_API.md)
- **For Python Apps**: See [PYTHON_API.md](./PYTHON_API.md)
- **For Custom Voices**: See [TRAINING.md](./TRAINING.md)
- **For Examples**: See [examples/](./examples/)

## Version Information

- **Piper Version**: 1.3.0
- **Documentation Updated**: 2025-11-27
