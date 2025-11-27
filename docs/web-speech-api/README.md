# Web Speech API Documentation

**Version**: Current Web Standard
**Fetched**: 2025-11-26
**Sources**:
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API

## Overview

The Web Speech API enables two distinct functionalities:
1. **Speech Recognition** - Converting audio to text
2. **Speech Synthesis** - Converting text to speech

## Important Limitations

On some browsers, like Chrome, using Speech Recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing, so it won't work offline.

## Quick Start

### Speech Recognition

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = false;
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log(`Recognized: ${transcript}`);
};

recognition.start();
```

### Speech Synthesis

```javascript
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance("Hello world");

utterance.pitch = 1.0;  // Range: 0 to 2
utterance.rate = 1.0;   // Range: 0.5 to 2

synth.speak(utterance);
```

## Browser Compatibility

Listed as "not Baseline" - the feature does not work uniformly across widely-used browsers. Browser-specific prefixes may be required (e.g., `webkitSpeechRecognition`).

## Key Features

- Continuous or single-utterance recognition
- Interim results support
- Multiple alternative transcriptions
- On-device processing (experimental)
- Contextual biasing for domain-specific terms
- Multilingual support
- Voice selection for synthesis
- Playback control (pause/resume/cancel)

## See Also

- [API Reference](./API.md) - Complete API documentation
- [Usage Guide](./USAGE.md) - Detailed usage examples and patterns
- [Examples](./examples/) - Code examples and use cases
