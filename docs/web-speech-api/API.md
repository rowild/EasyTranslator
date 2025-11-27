# SpeechRecognition API Reference

## Constructor

### `SpeechRecognition()`

Creates a new recognition object instance.

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
```

## Instance Properties

### `lang`
- **Type**: String
- **Default**: HTML lang attribute value
- **Description**: Sets/returns the language for recognition
- **Example**: `recognition.lang = "en-US";`

### `continuous`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Controls whether results stream continuously (`true`) or capture single utterances (`false`)
- **Example**: `recognition.continuous = true;`

### `interimResults`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enables interim/non-final results
- **Example**: `recognition.interimResults = true;`

### `maxAlternatives`
- **Type**: Number
- **Default**: `1`
- **Description**: Sets maximum alternative transcriptions per result
- **Example**: `recognition.maxAlternatives = 3;`

### `phrases` (Experimental)
- **Type**: Array of SpeechRecognitionPhrase objects
- **Description**: Array of contextual biasing phrases to improve accuracy
- **Example**:
```javascript
const phraseObjects = [
  new SpeechRecognitionPhrase("azure", 5.0),
  new SpeechRecognitionPhrase("khaki", 3.0)
];
recognition.phrases = phraseObjects;
```

### `processLocally` (Experimental)
- **Type**: Boolean
- **Description**: Requires on-device processing instead of server-based recognition
- **Example**: `recognition.processLocally = true;`

### `grammars` (Deprecated)
- **Status**: Removed from specification
- **Note**: Do not use in new code

## Static Methods

### `available()` (Experimental)

Checks language availability for on-device recognition.

**Syntax:**
```javascript
SpeechRecognition.available(options)
```

**Parameters:**
- `options.langs` - Array of language codes to check
- `options.processLocally` - Boolean indicating on-device requirement

**Returns:** Promise resolving to:
- `"available"` - Language pack already installed
- `"downloadable"` - Language pack can be downloaded
- `"unavailable"` - Language not accessible

**Example:**
```javascript
SpeechRecognition.available({
  langs: ["en-US"],
  processLocally: true
}).then((result) => {
  if (result === "available") {
    recognition.start();
  } else if (result === "downloadable") {
    // Install language pack
  }
});
```

### `install()` (Experimental)

Installs language packs for on-device recognition.

**Syntax:**
```javascript
SpeechRecognition.install(options)
```

**Parameters:**
- `options.langs` - Array of language codes to install
- `options.processLocally` - Boolean indicating on-device requirement

**Returns:** Promise resolving to boolean indicating success

**Example:**
```javascript
SpeechRecognition.install({
  langs: ["en-US"],
  processLocally: true
}).then((success) => {
  if (success) {
    console.log("Language pack installed");
  }
});
```

## Instance Methods

### `start()`

Begins listening for audio input.

**Syntax:**
```javascript
recognition.start()
```

**Example:**
```javascript
startBtn.onclick = () => {
  recognition.start();
  console.log("Ready to receive speech input");
};
```

### `stop()`

Stops listening and returns results based on captured audio.

**Syntax:**
```javascript
recognition.stop()
```

**Example:**
```javascript
recognition.onspeechend = () => {
  recognition.stop();
};
```

### `abort()`

Stops listening without returning results.

**Syntax:**
```javascript
recognition.abort()
```

## Events

Recognition lifecycle events in order:

1. **`start`** - Recognition has begun
2. **`audiostart`** - Audio capturing started
3. **`soundstart`** - Sound detected
4. **`speechstart`** - Speech detected
5. **`speechend`** - Speech has ended
6. **`soundend`** - Sound has ended
7. **`audioend`** - Audio capturing stopped
8. **`end`** - Recognition service disconnected

### Result Events

#### `result`
Fired when the recognition service returns a result.

**Event Object Properties:**
- `results` - SpeechRecognitionResultList containing recognition results
- `resultIndex` - Index of the lowest result that has changed

**Example:**
```javascript
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const confidence = event.results[0][0].confidence;
  console.log(`Recognized: ${transcript} (${confidence})`);
};
```

**Result Structure:**
```
event.results → SpeechRecognitionResultList
  └─ [0] → SpeechRecognitionResult
      └─ [0] → SpeechRecognitionAlternative
          ├─ transcript (string)
          └─ confidence (number 0-1)
```

#### `nomatch`
Fired when the recognition service returns no match.

**Example:**
```javascript
recognition.onnomatch = (event) => {
  console.log("Speech not recognized");
};
```

### Error Event

#### `error`
Fired when a recognition error occurs.

**Error Types:**
- `no-speech` - No speech detected
- `audio-capture` - Audio capture failed
- `not-allowed` - Permission denied
- `network` - Network communication error
- `aborted` - Recognition aborted

**Example:**
```javascript
recognition.onerror = (event) => {
  console.log(`Error: ${event.error}`);
  if (event.error === 'not-allowed') {
    console.log('Microphone permission denied');
  }
};
```

## Contextual Biasing (Experimental)

Improve recognition accuracy for domain-specific terms by providing hints with boost values.

**Boost Range**: 0.0 to 10.0 (higher values increase recognition likelihood)

**Example:**
```javascript
const phraseData = [
  { phrase: "azure", boost: 5.0 },
  { phrase: "khaki", boost: 3.0 },
  { phrase: "tan", boost: 2.0 },
];

const phraseObjects = phraseData.map(
  (p) => new SpeechRecognitionPhrase(p.phrase, p.boost)
);

recognition.phrases = phraseObjects;
```

## Complete Example

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configuration
recognition.continuous = false;
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// Start recognition
const startBtn = document.querySelector("button");
startBtn.onclick = () => {
  recognition.start();
  console.log("Ready to receive a color command.");
};

// Handle results
recognition.onresult = (event) => {
  const color = event.results[0][0].transcript;
  const confidence = event.results[0][0].confidence;
  console.log(`Result: ${color} (${confidence})`);
  document.querySelector("html").style.backgroundColor = color;
};

// Handle errors
recognition.onerror = (event) => {
  console.log(`Error: ${event.error}`);
};

// Handle no match
recognition.onnomatch = (event) => {
  console.log("Speech not recognized");
};

// Handle speech end
recognition.onspeechend = () => {
  recognition.stop();
};
```

## Related Interfaces

- **SpeechRecognitionResultList** - Array-like object containing recognition results
- **SpeechRecognitionResult** - Single recognition result with alternatives
- **SpeechRecognitionAlternative** - Single alternative with transcript and confidence
- **SpeechRecognitionEvent** - Event object for result events
- **SpeechRecognitionErrorEvent** - Event object for error events
- **SpeechRecognitionPhrase** - Contextual biasing phrase with boost value
