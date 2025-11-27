# EasyTranslator Documentation

This directory contains locally cached documentation for the libraries and APIs used in the EasyTranslator project.

## Contents

### Web Speech API
Location: `/docs/web-speech-api/`

Browser-native speech recognition and synthesis API.

**Files:**
- `README.md` - Overview and quick start guide
- `API.md` - Complete API reference with all methods, properties, and events
- `USAGE.md` - Detailed usage guide with best practices and patterns
- `examples/` - Working code examples
  - `basic-recognition.js` - Simple speech recognition
  - `continuous-recognition.js` - Continuous recognition with interim results
  - `on-device-recognition.js` - On-device processing with language pack management
  - `contextual-biasing.js` - Domain-specific recognition improvement
  - `speech-synthesis.js` - Text-to-speech with voice selection
- `version.txt` - Version info and compatibility notes

**Key Features:**
- Speech recognition (audio to text)
- Speech synthesis (text to audio)
- On-device processing (experimental)
- Contextual biasing
- Multilingual support

**Browser Compatibility:** Requires vendor prefixes (webkitSpeechRecognition)

---

### Mistral Voxtral
Location: `/docs/mistral-voxtral/`

Mistral AI's frontier speech understanding models for transcription and audio Q&A.

**Files:**
- `README.md` - Overview, model variants, and quick start
- `API.md` - Complete API reference with endpoints and parameters
- `examples/` - Integration examples
  - `basic-transcription.js` - Simple audio transcription
  - `transcription-with-timestamps.js` - Segment-level timestamps for subtitles
  - `audio-chat.js` - Q&A and summarization from audio
  - `function-calling.js` - Voice commands triggering backend functions
  - `vue-composable.ts` - Vue 3 composable for EasyTranslator integration
  - `edge-function.ts` - Serverless function to hide API key
- `version.txt` - Version info, pricing, and capabilities

**Model Variants:**
- Voxtral (24B) - Production scale (`voxtral-small-latest`)
- Voxtral Mini (3B) - Edge deployment (`voxtral-mini-latest`)
- Voxtral Mini Transcribe - API-optimized transcription

**Key Features:**
- 32k token context (30+ minutes audio)
- Built-in Q&A and summarization
- Native multilingual support (auto-detection)
- Function-calling from voice
- $0.001 per minute pricing

**API Endpoints:**
- `POST /v1/audio/transcriptions` - Transcription only
- `POST /v1/chat/completions` - Chat with audio input

---

## Quick Reference

### When to Use Which?

**Use Web Speech API when:**
- Need browser-native recognition (no API costs)
- Building voice commands for UI
- Want text-to-speech synthesis
- Privacy is critical (can run on-device)
- Working offline

**Limitations:**
- Server-based in Chrome (requires network)
- Less accurate than Voxtral
- No built-in translation
- Variable browser support

**Use Mistral Voxtral when:**
- Need high-accuracy transcription
- Want to ask questions about audio
- Building translation features
- Need function-calling from voice
- Working with long-form audio (up to 30 min)

**Limitations:**
- Requires API key and network
- Costs $0.001 per minute
- Not available offline

---

## EasyTranslator Integration

### Current Implementation
EasyTranslator currently uses **Voxtral Mini** for transcription:

```typescript
// In useAudioRecorder.ts
const formData = new FormData()
formData.append('file', audioBlob, 'recording.webm')
formData.append('model', 'voxtral-mini')  // ← Current model

const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'x-api-key': apiKey },
  body: formData,
})
```

### Potential Enhancements

1. **Add Web Speech API as Fallback**
   - Use for quick, local recognition
   - Fall back to Voxtral for accuracy
   - Enable offline mode

2. **Implement Audio Q&A**
   - Let users ask questions about conversations
   - Summarize long recordings
   - Extract action items from meetings

3. **Enable Function Calling**
   - Voice commands: "Translate to French"
   - Auto-detect: "Send this to my email"
   - Smart actions: "Save this conversation"

4. **Add Timestamp Support**
   - Generate subtitles from transcriptions
   - Enable seeking in long recordings
   - Create conversation chapters

5. **Optimize with Edge Functions**
   - Hide API key from frontend
   - Add rate limiting
   - Implement caching

---

## Documentation Maintenance

**Last Updated:** 2025-11-26

**Update Schedule:**
- Check for API changes monthly
- Update examples when EasyTranslator architecture changes
- Add new examples based on user needs

**How to Update:**
1. Visit source URLs listed in each `version.txt`
2. Check for API changes or new features
3. Update relevant markdown files
4. Add new examples if needed
5. Update this README with changes

---

## External Links

### Web Speech API
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Spec: https://wicg.github.io/speech-api/

### Mistral Voxtral
- Announcement: https://mistral.ai/news/voxtral
- API Docs: https://docs.mistral.ai/capabilities/audio_transcription
- Pricing: https://mistral.ai/pricing

---

## Contributing

When adding new documentation:
1. Follow the existing structure
2. Include working code examples
3. Document browser/API compatibility
4. Update this README
5. Add version info to `version.txt`
