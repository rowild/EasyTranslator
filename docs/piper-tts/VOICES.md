# Piper TTS Voice Models

## Overview

Piper TTS supports 40+ languages with multiple voice options per language. All voices are trained using VITS (Variational Inference Text-to-Speech) technology and exported to ONNX Runtime format for efficient cross-platform deployment.

## Voice Repository

All voice models are hosted on Hugging Face:

**Repository**: https://huggingface.co/rhasspy/piper-voices

**License**: Mostly MIT (but always check individual voice licenses)

**Format**: Each voice requires 2 files:
- `.onnx` - Neural network model file
- `.onnx.json` - Configuration file (metadata, sample rate, speakers, etc.)

## Quality Levels

Voices are available in different quality tiers:

### Low Quality
- **Size**: 5-10 MB
- **Speed**: 3-5x real-time
- **Use Case**: Embedded devices, bandwidth-constrained scenarios
- **Intelligibility**: Good
- **Naturalness**: Basic

### Medium Quality (Recommended)
- **Size**: 15-30 MB
- **Speed**: 1-2x real-time
- **Use Case**: Most applications, balanced quality/performance
- **Intelligibility**: Excellent
- **Naturalness**: Very good

### High Quality
- **Size**: 50-100 MB
- **Speed**: 0.5-1x real-time
- **Use Case**: Production apps, audiobooks, accessibility
- **Intelligibility**: Excellent
- **Naturalness**: Excellent

## Downloading Voices

### Using Piper Voice Manager

```bash
# Download specific voice
python3 -m piper.download_voice en_US-lessac-medium

# List all available voices
python3 -m piper.download_voice --list

# Download to specific directory
python3 -m piper.download_voice en_US-lessac-medium --output-dir /path/to/models
```

### Manual Download

1. Visit https://huggingface.co/rhasspy/piper-voices
2. Navigate to `files` tab
3. Download both `.onnx` and `.onnx.json` files
4. Place in same directory

### Bulk Download Script

```bash
#!/bin/bash
# Download multiple voices at once

VOICES=(
  "en_US-lessac-medium"
  "en_GB-alba-medium"
  "de_DE-thorsten-medium"
  "es_ES-mls-medium"
  "fr_FR-mls-medium"
  "it_IT-riccardo-medium"
  "ja_JP-mls-medium"
  "zh_CN-huayan-medium"
)

for voice in "${VOICES[@]}"; do
  echo "Downloading $voice..."
  python3 -m piper.download_voice "$voice"
done

echo "All voices downloaded!"
```

## Available Languages & Voices

### English

#### American English (en_US)
- **lessac-medium**: General purpose, natural prosody
- **lessac-high**: High quality variant
- **lessac-low**: Lightweight variant
- **amy-medium**: Female voice, clear pronunciation
- **ryan-medium**: Male voice, professional
- **ryan-high**: High quality male voice
- **libritts-high**: Multiple speakers (200+ voices)

#### British English (en_GB)
- **alba-medium**: Scottish accent
- **jenny_dioco-medium**: Neutral British accent
- **northern_english_male-medium**: Northern accent

#### Other English Variants
- **en_IN** (Indian English): Multiple voices
- **en_AU** (Australian English): Available
- **en_NZ** (New Zealand English): Available

### European Languages

#### German (de_DE)
- **thorsten-medium**: Male, clear pronunciation
- **thorsten-high**: High quality variant
- **eva_k-medium**: Female voice
- **karlsson-medium**: Alternative male voice
- **kerstin-medium**: Female, professional
- **mls-medium**: Multi-speaker

#### French (fr_FR)
- **mls-medium**: Multi-speaker, 4 voices
- **siwis-medium**: Female, Swiss accent
- **tom-medium**: Male voice
- **upmc-medium**: Female, clear

#### Spanish (es_ES)
- **mls-medium**: Multi-speaker, Spanish
- **carlfm-medium**: Male, clear
- **davefx-medium**: Alternative male

#### Spanish Variants
- **es_MX** (Mexican Spanish): Multiple voices
- **es_AR** (Argentine Spanish): Available

#### Italian (it_IT)
- **riccardo-medium**: Male, natural
- **mls-medium**: Multi-speaker

#### Portuguese
- **pt_BR-faber-medium**: Brazilian Portuguese, male
- **pt_BR-mls-medium**: Brazilian, multi-speaker
- **pt_PT-tugão-medium**: European Portuguese

#### Dutch (nl_NL)
- **mls-medium**: Multi-speaker
- **nathalie-medium**: Female voice
- **rdh-medium**: Male voice

#### Polish (pl_PL)
- **mls-medium**: Multi-speaker
- **darkman-medium**: Male voice
- **gosia-medium**: Female voice

#### Russian (ru_RU)
- **ruslan-medium**: Male voice
- **dmitri-medium**: Alternative male
- **irina-medium**: Female voice

### Nordic Languages

#### Danish (da_DK)
- **talesyntese-medium**: Official voice

#### Norwegian (no_NO)
- **talesyntese-medium**: Multiple variants

#### Swedish (sv_SE)
- **nst-medium**: Swedish voice

#### Finnish (fi_FI)
- **harri-medium**: Male voice

#### Icelandic (is_IS)
- **bui-medium**: Icelandic voice
- **salka-medium**: Female variant

### Eastern European

#### Czech (cs_CZ)
- **jirka-medium**: Male voice

#### Ukrainian (uk_UA)
- **lada-medium**: Female voice

#### Hungarian (hu_HU)
- **anna-medium**: Female voice

#### Romanian (ro_RO)
- **mihai-medium**: Male voice

### Asian Languages

#### Chinese
- **zh_CN-huayan-medium**: Mandarin, female
- **zh_CN-huayan-high**: High quality variant

#### Japanese (ja_JP)
- **mls-medium**: Multi-speaker

#### Korean (ko_KR)
- **kss-medium**: Female voice

#### Vietnamese (vi_VN)
- **vivos-medium**: Multi-speaker

#### Hindi (hi_IN)
- **male-medium**: Male voice

### Middle Eastern

#### Arabic (ar_SA)
- **nawar-medium**: Female voice

#### Turkish (tr_TR)
- **fahrettin-medium**: Male voice
- **fettah-medium**: Alternative male

### Other Languages

#### Greek (el_GR)
- **rapunzelina-medium**: Female voice

#### Catalan (ca_ES)
- **upc-medium**: Catalan voice

#### Swahili (sw_KE)
- **lanfrica-medium**: Swahili voice

#### Kazakh (kk_KZ)
- **iseke-medium**: Kazakh voice

#### Georgian (ka_GE)
- **natia-medium**: Georgian voice

## Voice Characteristics

### Sample Rates

Most voices use one of these sample rates:
- **16000 Hz**: Lower quality, smaller files
- **22050 Hz**: Standard quality (most common)
- **24000 Hz**: Higher quality
- **48000 Hz**: Professional quality

### Speakers

Some models support multiple speakers:

```python
# Check number of speakers
voice = PiperVoice.load('en_US-libritts-high.onnx')
num_speakers = voice.config.num_speakers
print(f"Available speakers: {num_speakers}")  # 200+

# Use specific speaker
voice.speaker_id = 42
voice.synthesize("Hello from speaker 42", "output.wav")
```

**Multi-speaker models**:
- `en_US-libritts-high`: 200+ speakers
- `es_ES-mls-medium`: 4 speakers
- `fr_FR-mls-medium`: 4 speakers
- Various `*-mls-medium` models

## Voice Selection Guide

### For EasyTranslator

Recommended voices for each supported language:

| Language | Code | Recommended Voice | Size | Quality |
|----------|------|------------------|------|---------|
| Italian | it | it_IT-riccardo-medium | 25 MB | High |
| French | fr | fr_FR-mls-medium | 28 MB | High |
| German | de | de_DE-thorsten-medium | 24 MB | High |
| Spanish | es | es_ES-mls-medium | 26 MB | High |
| Portuguese | pt | pt_BR-faber-medium | 23 MB | High |
| Dutch | nl | nl_NL-mls-medium | 27 MB | Good |
| Polish | pl | pl_PL-mls-medium | 29 MB | Good |
| Russian | ru | ru_RU-ruslan-medium | 22 MB | Good |
| Japanese | ja | ja_JP-mls-medium | 31 MB | Good |
| Chinese | zh | zh_CN-huayan-medium | 26 MB | High |
| English | en | en_US-lessac-medium | 21 MB | High |

### For Web Applications

**Recommended**: Medium quality voices
- Good balance of quality and file size
- Fast enough for real-time synthesis
- Acceptable download size for Docker containers

**Total size for all EasyTranslator languages**: ~280 MB

### For Embedded Devices

**Recommended**: Low quality voices
- Smaller footprint
- Faster synthesis
- Lower memory usage
- Still intelligible

### For Audiobooks/Accessibility

**Recommended**: High quality voices
- Most natural prosody
- Better for long listening sessions
- Worth the extra size and slower synthesis

## License Considerations

**Important**: Always check individual voice licenses!

### Common Licenses

- **MIT**: Most permissive, allows commercial use
- **Creative Commons**: Various restrictions
- **Research Only**: Some voices are research-only

### Checking License

```bash
# Download voice with license info
python3 -m piper.download_voice en_US-lessac-medium

# Check model card
cat en_US-lessac-medium/MODEL_CARD
```

**From documentation**:
> "Piper is intended for personal use and text to speech research only"

**Important**: Review licenses before commercial deployment!

## Voice Samples

Listen to voice samples at:
https://rhasspy.github.io/piper-samples/

Browse by:
- Language
- Quality level
- Speaker characteristics

## Model Files Structure

Each voice consists of:

### .onnx File
The neural network model containing:
- Encoder weights
- Decoder weights
- Attention mechanisms
- Trained on specific language/speaker

### .onnx.json File
Configuration metadata:

```json
{
  "audio": {
    "sample_rate": 22050
  },
  "espeak": {
    "voice": "en-us"
  },
  "inference": {
    "noise_scale": 0.667,
    "length_scale": 1.0,
    "noise_w": 0.8
  },
  "num_speakers": 1,
  "speaker_id_map": {}
}
```

## Creating Custom Voices

Want to create your own voice? See the training documentation:

### Requirements
- 1-10 hours of audio recordings
- Transcriptions of all audio
- Single speaker (for single-speaker model)
- Clean audio (minimal background noise)

### Training Process
1. Prepare dataset
2. Generate phonemes with espeak-ng
3. Train VITS model
4. Export to ONNX
5. Test with Piper

See official training guide: https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/TRAINING.md

## Voice Management Best Practices

### Storage Organization

```
models/
├── en_US/
│   ├── lessac-medium.onnx
│   ├── lessac-medium.onnx.json
│   ├── lessac-high.onnx
│   └── lessac-high.onnx.json
├── de_DE/
│   ├── thorsten-medium.onnx
│   └── thorsten-medium.onnx.json
└── es_ES/
    ├── mls-medium.onnx
    └── mls-medium.onnx.json
```

### Docker Image Optimization

```dockerfile
# Download only needed voices
RUN python3 -m piper.download_voice en_US-lessac-medium && \
    python3 -m piper.download_voice de_DE-thorsten-medium && \
    # Only languages you support
    rm -rf /tmp/*  # Clean up temp files
```

### Lazy Loading

```python
# Load voices on-demand instead of at startup
voices_cache = {}

def get_voice(language):
    if language not in voices_cache:
        model_path = f"models/{language}-medium.onnx"
        voices_cache[language] = PiperVoice.load(model_path)
    return voices_cache[language]
```

### Version Pinning

Track which voice versions you're using:

```
# voice_versions.txt
en_US-lessac-medium==v1.0.0
de_DE-thorsten-medium==v1.0.0
es_ES-mls-medium==v1.0.0
```

## Troubleshooting

### Voice Not Found

```bash
# Verify both files exist
ls -lh en_US-lessac-medium.onnx
ls -lh en_US-lessac-medium.onnx.json

# Both must be present!
```

### Audio Quality Issues

Try different voices:
```bash
# If voice sounds robotic, try higher quality
python3 -m piper.download_voice en_US-lessac-high

# If synthesis is slow, try lower quality
python3 -m piper.download_voice en_US-lessac-low
```

### Language Not Supported

Check available voices:
```bash
python3 -m piper.download_voice --list | grep "LANGUAGE_CODE"
```

If language missing, consider:
- Using similar language (e.g., es_ES for es_MX)
- Training custom voice
- Contributing to Piper project

## Next Steps

- [Installation Guide](./README.md)
- [CLI Documentation](./CLI.md)
- [HTTP API](./HTTP_API.md)
- [Python API](./PYTHON_API.md)

## Version Information

- **Voice Repository**: https://huggingface.co/rhasspy/piper-voices
- **Total Languages**: 40+
- **Total Voices**: 200+
- **Documentation Updated**: 2025-11-27
