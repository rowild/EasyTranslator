# Web Speech API Usage Guide

## Speech Recognition

### Basic Setup

Always handle browser prefixes for compatibility:

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
```

### Configuration Best Practices

#### Language Setting
Always explicitly specify language codes:

```javascript
recognition.lang = "en-US";  // Recommended
// Other examples: "es-ES", "fr-FR", "de-DE", "it-IT"
```

#### Continuous vs. Single Recognition

**Single Utterance (Default):**
```javascript
recognition.continuous = false;  // Stops after one result
```

**Continuous Recognition:**
```javascript
recognition.continuous = true;  // Keeps listening until stopped
```

#### Interim Results

Enable for real-time feedback during speech:

```javascript
recognition.interimResults = true;

recognition.onresult = (event) => {
  let interimTranscript = '';
  let finalTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcript;
    } else {
      interimTranscript += transcript;
    }
  }

  console.log('Interim:', interimTranscript);
  console.log('Final:', finalTranscript);
};
```

### Handling Results

#### Single Alternative
```javascript
recognition.maxAlternatives = 1;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const confidence = event.results[0][0].confidence;
  console.log(`Result: ${transcript} (confidence: ${confidence})`);
};
```

#### Multiple Alternatives
```javascript
recognition.maxAlternatives = 3;

recognition.onresult = (event) => {
  const result = event.results[0];
  console.log('Alternatives:');
  for (let i = 0; i < result.length; i++) {
    console.log(`${i + 1}. ${result[i].transcript} (${result[i].confidence})`);
  }
};
```

### Error Handling

Implement comprehensive error handling:

```javascript
recognition.onerror = (event) => {
  console.error(`Recognition error: ${event.error}`);

  switch(event.error) {
    case 'no-speech':
      console.log('No speech was detected');
      break;
    case 'audio-capture':
      console.log('No microphone was found or audio capture failed');
      break;
    case 'not-allowed':
      console.log('Microphone permission denied');
      break;
    case 'network':
      console.log('Network error occurred');
      break;
    case 'aborted':
      console.log('Recognition was aborted');
      break;
    default:
      console.log('Recognition error:', event.error);
  }
};

recognition.onnomatch = (event) => {
  console.log('Speech was detected but not recognized');
};
```

### Lifecycle Management

```javascript
// Start recognition
recognition.onstart = () => {
  console.log('Recognition started');
};

// Audio capture begins
recognition.onaudiostart = () => {
  console.log('Audio capturing started');
};

// Speech detected
recognition.onspeechstart = () => {
  console.log('Speech has been detected');
};

// Speech ended
recognition.onspeechend = () => {
  console.log('Speech has stopped');
  recognition.stop();  // Optional: explicitly stop
};

// Recognition ended
recognition.onend = () => {
  console.log('Recognition service disconnected');
};
```

## On-Device Speech Recognition

### Check Language Pack Availability

Before using on-device recognition, verify language availability:

```javascript
async function checkAndStartRecognition() {
  try {
    const result = await SpeechRecognition.available({
      langs: ["en-US"],
      processLocally: true
    });

    if (result === "available") {
      // Language pack installed, start recognition
      recognition.processLocally = true;
      recognition.start();
    } else if (result === "downloadable") {
      // Need to install language pack
      console.log('Downloading language pack...');
      const success = await SpeechRecognition.install({
        langs: ["en-US"],
        processLocally: true
      });

      if (success) {
        console.log('Language pack installed successfully');
        recognition.processLocally = true;
        recognition.start();
      }
    } else {
      console.log('On-device recognition not available');
      // Fall back to server-based recognition
      recognition.processLocally = false;
      recognition.start();
    }
  } catch (error) {
    console.error('Error checking language availability:', error);
  }
}
```

### Enable On-Device Processing

```javascript
recognition.processLocally = true;
recognition.start();
```

**Benefits:**
- Works offline
- Better privacy (audio not sent to servers)
- Lower latency

**Requirements:**
- Language pack must be installed
- Browser support for on-device recognition

## Contextual Biasing

Improve recognition accuracy for domain-specific vocabulary:

```javascript
// Define phrases with boost values (0.0 - 10.0)
const domainPhrases = [
  { phrase: "cardiovascular", boost: 8.0 },
  { phrase: "electrocardiogram", boost: 7.0 },
  { phrase: "arrhythmia", boost: 7.0 },
  { phrase: "hypertension", boost: 6.0 },
];

// Create phrase objects
const phraseObjects = domainPhrases.map(
  p => new SpeechRecognitionPhrase(p.phrase, p.boost)
);

// Apply to recognition
recognition.phrases = phraseObjects;
recognition.start();
```

**Boost Guidelines:**
- 0.0-3.0: Slight preference
- 3.0-6.0: Moderate preference
- 6.0-10.0: Strong preference

## Speech Synthesis

### Voice Selection

Populate and select from available voices:

```javascript
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = synth.getVoices();
  console.log(`Loaded ${voices.length} voices`);

  voices.forEach((voice, index) => {
    console.log(`${index}: ${voice.name} (${voice.lang})`);
  });
}

// Load voices (required for some browsers)
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
```

### Create and Configure Utterances

```javascript
const utterance = new SpeechSynthesisUtterance("Hello world");

// Select voice
const selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Female'));
utterance.voice = selectedVoice;

// Configure speech parameters
utterance.pitch = 1.0;   // Range: 0 to 2 (default: 1)
utterance.rate = 1.0;    // Range: 0.5 to 2 (default: 1)
utterance.volume = 1.0;  // Range: 0 to 1 (default: 1)

// Speak
synth.speak(utterance);
```

### Synthesis Events

Monitor synthesis progress:

```javascript
utterance.onstart = (event) => {
  console.log('Speech started');
};

utterance.onend = (event) => {
  console.log('Speech completed');
};

utterance.onpause = (event) => {
  const char = event.utterance.text.charAt(event.charIndex);
  console.log(`Paused at character ${event.charIndex}: "${char}"`);
};

utterance.onresume = (event) => {
  console.log('Speech resumed');
};

utterance.onerror = (event) => {
  console.error('Speech synthesis error:', event.error);
};
```

### Playback Control

```javascript
// Pause current utterance
synth.pause();

// Resume paused utterance
synth.resume();

// Stop and clear queue
synth.cancel();

// Check if speaking
if (synth.speaking) {
  console.log('Currently speaking');
}

// Check if paused
if (synth.paused) {
  console.log('Currently paused');
}
```

## Best Practices

### Recognition Best Practices

1. **Always specify language explicitly**
   ```javascript
   recognition.lang = "en-US";  // Don't rely on defaults
   ```

2. **Handle all error cases**
   ```javascript
   recognition.onerror = handleError;
   recognition.onnomatch = handleNoMatch;
   ```

3. **Clean up on component unmount**
   ```javascript
   componentWillUnmount() {
     recognition.abort();
   }
   ```

4. **Implement permission checks**
   ```javascript
   navigator.permissions.query({ name: 'microphone' })
     .then(result => {
       if (result.state === 'granted') {
         recognition.start();
       } else if (result.state === 'prompt') {
         // Request permission
       }
     });
   ```

5. **Use on-device when privacy matters**
   ```javascript
   if (privacyMode) {
     recognition.processLocally = true;
   }
   ```

### Synthesis Best Practices

1. **Load voices properly**
   ```javascript
   speechSynthesis.onvoiceschanged = loadVoices;
   ```

2. **Cancel before navigation**
   ```javascript
   window.addEventListener('beforeunload', () => {
     speechSynthesis.cancel();
   });
   ```

3. **Implement playback queue management**
   ```javascript
   if (synth.speaking) {
     synth.cancel();  // Clear queue before adding new
   }
   synth.speak(utterance);
   ```

4. **Hide keyboard on mobile after synthesis**
   ```javascript
   utterance.onstart = () => {
     document.activeElement.blur();
   };
   ```

5. **Test across devices**
   - Voice availability varies by platform
   - Synthesis quality differs between browsers
   - Some voices may require network connection

## Common Patterns

### Voice Command Handler

```javascript
const commands = {
  'navigate home': () => window.location.href = '/',
  'show menu': () => toggleMenu(),
  'search for *': (query) => search(query),
};

recognition.onresult = (event) => {
  const command = event.results[0][0].transcript.toLowerCase();

  for (const [pattern, handler] of Object.entries(commands)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '(.+)'));
      const match = command.match(regex);
      if (match) {
        handler(match[1]);
        return;
      }
    } else if (command.includes(pattern)) {
      handler();
      return;
    }
  }

  console.log('Command not recognized:', command);
};
```

### Real-Time Transcription

```javascript
recognition.continuous = true;
recognition.interimResults = true;

let finalTranscript = '';

recognition.onresult = (event) => {
  let interimTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcript + ' ';
    } else {
      interimTranscript += transcript;
    }
  }

  // Update UI
  document.getElementById('final').textContent = finalTranscript;
  document.getElementById('interim').textContent = interimTranscript;
};
```

### Voice-Controlled Form

```javascript
const formFields = {
  'first name': document.getElementById('firstName'),
  'last name': document.getElementById('lastName'),
  'email': document.getElementById('email'),
};

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const activeField = document.activeElement;

  if (activeField.tagName === 'INPUT') {
    activeField.value = transcript;
  }
};

// Auto-start when focusing on form fields
Object.values(formFields).forEach(field => {
  field.addEventListener('focus', () => {
    recognition.start();
  });
});
```
