# Mistral Voxtral API Reference

## Base URL

```
https://api.mistral.ai/v1
```

## Authentication

All requests require an API key passed via the `Authorization` header:

```bash
Authorization: Bearer $MISTRAL_API_KEY
```

Or for transcription endpoint:
```bash
x-api-key: $MISTRAL_API_KEY
```

## Available Models

| Model ID | Endpoint | Use Case | Pricing |
|----------|----------|----------|---------|
| `voxtral-small-latest` | `/chat/completions` | Production-scale chat with audio | Standard chat pricing |
| `voxtral-mini-latest` | `/chat/completions` | Edge/local chat with audio | Standard chat pricing |
| `voxtral-mini-latest` | `/audio/transcriptions` | Optimized transcription | $0.001/min |

## Endpoints

### POST /v1/audio/transcriptions

Transcribe audio to text using Voxtral Mini Transcribe.

#### Request Parameters

**Form Data:**
- `file` (required): Audio file to transcribe
  - Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
  - Max file size: Check API limits
- `model` (required): Model ID (`voxtral-mini-latest`)
- `language` (optional): Manual language specification (e.g., "en", "es", "fr")
  - Improves accuracy when known
  - Incompatible with `timestamp_granularities`
- `timestamp_granularities` (optional): Array of granularity levels
  - Values: `["segment"]`
  - Enables segment-level timestamps
  - Incompatible with `language` parameter

#### Response Format

```json
{
  "id": "d719e752a0f845c895758933ea488cb0",
  "created": 1756386611,
  "model": "voxtral-mini-latest",
  "usage": {
    "prompt_audio_seconds": 19,
    "prompt_tokens": 10,
    "total_tokens": 452,
    "completion_tokens": 67
  },
  "object": "audio.transcription",
  "text": "[transcribed text]"
}
```

With timestamps:
```json
{
  "text": "[full transcribed text]",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "First segment of speech"
    },
    {
      "start": 5.2,
      "end": 10.8,
      "text": "Second segment of speech"
    }
  ]
}
```

#### Examples

**Python (File Upload):**
```python
import os
from mistralai import Mistral

client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

with open("/path/to/file/audio.mp3", "rb") as f:
    transcription_response = client.audio.transcriptions.complete(
        model="voxtral-mini-latest",
        file={"content": f, "file_name": "audio.mp3"},
    )

print(transcription_response.text)
```

**Python (URL):**
```python
transcription_response = client.audio.transcriptions.complete(
    model="voxtral-mini-latest",
    file_url="https://example.com/audio.mp3"
)
```

**Python (With Timestamps):**
```python
transcription_response = client.audio.transcriptions.complete(
    model="voxtral-mini-latest",
    file_url="https://docs.mistral.ai/audio/obama.mp3",
    timestamp_granularities=["segment"]
)

for segment in transcription_response.segments:
    print(f"[{segment.start}s - {segment.end}s]: {segment.text}")
```

**TypeScript:**
```typescript
import { Mistral } from "@mistralai/mistralai";
import fs from "fs";

const client = new Mistral({ apiKey: process.env["MISTRAL_API_KEY"] });
const audio_file = fs.readFileSync('/path/to/file/audio.mp3');

const transcriptionResponse = await client.audio.transcriptions.complete({
    model: "voxtral-mini-latest",
    file: {fileName: "audio.mp3", content: audio_file}
});

console.log(transcriptionResponse.text);
```

**cURL:**
```bash
curl --location 'https://api.mistral.ai/v1/audio/transcriptions' \
  --header "x-api-key: $MISTRAL_API_KEY" \
  --form 'file=@"/path/to/file/audio.mp3"' \
  --form 'model="voxtral-mini-latest"'
```

**cURL (With Language):**
```bash
curl --location 'https://api.mistral.ai/v1/audio/transcriptions' \
  --header "x-api-key: $MISTRAL_API_KEY" \
  --form 'file=@"/path/to/file/audio.mp3"' \
  --form 'model="voxtral-mini-latest"' \
  --form 'language="en"'
```

### POST /v1/chat/completions

Chat completion with audio input support.

#### Request Parameters

**Body (JSON):**
- `model` (required): Model ID (`voxtral-mini-latest` or `voxtral-small-latest`)
- `messages` (required): Array of message objects

**Message Object:**
- `role`: "user", "assistant", or "system"
- `content`: String or array of content objects

**Content Object (for multimodal):**
- `type`: "text" or "input_audio"
- `text`: Text content (when type is "text")
- `input_audio`: Base64-encoded audio (when type is "input_audio")

#### Response Format

```json
{
  "id": "d719e752a0f845c895758933ea488cb0",
  "created": 1756386611,
  "model": "voxtral-mini-latest",
  "usage": {
    "prompt_audio_seconds": 19,
    "prompt_tokens": 10,
    "total_tokens": 452,
    "completion_tokens": 67
  },
  "object": "chat.completion",
  "choices": [{
    "index": 0,
    "finish_reason": "stop",
    "message": {
      "role": "assistant",
      "content": "[response text]"
    }
  }]
}
```

#### Examples

**Python (Base64 Audio):**
```python
import base64
import os
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

print(chat_response.choices[0].message.content)
```

**TypeScript:**
```typescript
import { Mistral } from "@mistralai/mistralai";
import fs from "fs";

const client = new Mistral({ apiKey: process.env["MISTRAL_API_KEY"] });
const audio_file = fs.readFileSync('local_audio.mp3');
const audio_base64 = audio_file.toString('base64');

const chatResponse = await client.chat.complete({
    model: "voxtral-mini-latest",
    messages: [{
        role: "user",
        content: [
            {type: "input_audio", input_audio: audio_base64},
            {type: "text", text: "What's in this file?"}
        ]
    }]
});

console.log(chatResponse.choices[0].message.content);
```

**cURL:**
```bash
curl --location https://api.mistral.ai/v1/chat/completions \
  --header "Authorization: Bearer $MISTRAL_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "model": "voxtral-mini-latest",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "input_audio", "input_audio": "<base64_audio_data>"},
        {"type": "text", "text": "What'\''s in this file?"}
      ]
    }]
  }'
```

**Audio Q&A:**
```python
# Ask questions about audio content
chat_response = client.chat.complete(
    model="voxtral-mini-latest",
    messages=[{
        "role": "user",
        "content": [
            {"type": "input_audio", "input_audio": audio_base64},
            {"type": "text", "text": "Summarize the main points discussed in this audio."}
        ]
    }]
)
```

**Function Calling from Audio:**
```python
# Define functions that can be called
tools = [{
    "type": "function",
    "function": {
        "name": "set_reminder",
        "description": "Set a reminder based on voice command",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "time": {"type": "string"}
            },
            "required": ["title", "time"]
        }
    }
}]

chat_response = client.chat.complete(
    model="voxtral-mini-latest",
    messages=[{
        "role": "user",
        "content": [
            {"type": "input_audio", "input_audio": audio_base64}
        ]
    }],
    tools=tools,
    tool_choice="auto"
)

# Process function calls
if chat_response.choices[0].message.tool_calls:
    for tool_call in chat_response.choices[0].message.tool_calls:
        print(f"Function: {tool_call.function.name}")
        print(f"Arguments: {tool_call.function.arguments}")
```

## Usage Tracking

All responses include usage statistics:

```json
{
  "usage": {
    "prompt_audio_seconds": 19,      // Audio input duration
    "prompt_tokens": 10,              // Text input tokens
    "completion_tokens": 67,          // Generated tokens
    "total_tokens": 452               // Total tokens processed
  }
}
```

## Language Support

Automatic language detection for:
- English (en)
- Spanish (es)
- French (fr)
- Portuguese (pt)
- Hindi (hi)
- German (de)
- Dutch (nl)
- Italian (it)
- And others

## Audio Format Support

Supported formats:
- MP3 (.mp3)
- MP4 (.mp4, .m4a)
- MPEG (.mpeg, .mpga)
- WAV (.wav)
- WebM (.webm)

## Rate Limits

Check your API dashboard for current rate limits. Typical limits include:
- Requests per minute
- Audio minutes per day
- Concurrent requests

## Error Handling

**Common Error Codes:**
- `400` - Bad request (invalid parameters)
- `401` - Authentication failed (invalid API key)
- `429` - Rate limit exceeded
- `500` - Internal server error

**Error Response Format:**
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Description of the error"
  }
}
```

## Best Practices

1. **Choose the Right Endpoint:**
   - Use `/audio/transcriptions` for simple transcription
   - Use `/chat/completions` for Q&A, summarization, or function calling

2. **Optimize Audio:**
   - Use appropriate compression for audio files
   - Consider file size when choosing format
   - Trim silence from beginning/end

3. **Language Parameter:**
   - Specify language when known for better accuracy
   - Let auto-detection work for unknown languages
   - Don't use with timestamp_granularities

4. **Timestamp Granularities:**
   - Use only when you need precise timing
   - Incompatible with language parameter
   - Adds processing overhead

5. **Base64 Encoding:**
   - Required for chat completions
   - Can increase payload size by ~33%
   - Consider file upload for transcription endpoint

6. **Error Handling:**
   - Always implement retry logic with exponential backoff
   - Check rate limits before bulk processing
   - Handle network timeouts gracefully

## Migration from Other Services

### From OpenAI Whisper:
```python
# OpenAI Whisper
response = openai.Audio.transcribe("whisper-1", audio_file)

# Mistral Voxtral (equivalent)
response = client.audio.transcriptions.complete(
    model="voxtral-mini-latest",
    file={"content": audio_file, "file_name": "audio.mp3"}
)
```

### From Google Speech-to-Text:
- Similar pricing model (per minute)
- Better multilingual support
- Integrated with chat capabilities
- Function calling from audio (unique to Voxtral)
