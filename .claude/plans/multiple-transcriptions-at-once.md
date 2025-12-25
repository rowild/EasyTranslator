# Multiple Translations “At Once” with Voxtral (10+ target languages)

## Summary

- Voxtral is not inherently limited to “2 languages”. Your app currently returns **1 transcription (source language)** + **1 translation (target language)** because the prompt and data model only ask/store one translation.
- There is **no dedicated API parameter** like `target_languages: [...]` for audio → N translations. However, because you use Voxtral via **`POST /v1/chat/completions`** (instruction-following), you *can* request **multiple target translations in a single response** (e.g., 10 languages) and parse them.
- For cost/latency control and better failure isolation, another strong option is: **transcribe once** (`/v1/audio/transcriptions`) then **translate the text into N languages** with a text model in parallel.

## What your current implementation does

In `src/stores/translation.ts`, the app sends audio to:

- `POST https://api.mistral.ai/v1/chat/completions`
- `model: "voxtral-small-latest"`
- `response_format: { "type": "json_object" }`

And asks Voxtral to return JSON shaped like:

```json
{
  "sourceText": "...",
  "sourceLanguage": "en",
  "translatedText": "...",
  "targetLanguage": "it"
}
```

So the “2 languages” you observe are simply:

1) detected source language (for the transcription)  
2) one chosen target language (for the translation)

## What Voxtral/Mistral APIs support (relevant to multi-target translation)

### 1) Audio → arbitrary structured output (includes N translations)

Mistral’s “Audio & Transcription” capability describes using Voxtral models with the **chat completions** endpoint and audio input (`input_audio`), which can generate any text output you instruct (including structured JSON).  
Source: https://docs.mistral.ai/capabilities/audio_transcription

To make the output reliably machine-parseable, Mistral provides **JSON mode** via:

```json
"response_format": { "type": "json_object" }
```

Source: https://docs.mistral.ai/capabilities/structured_output/json_mode

This combination (audio chat + JSON mode) is exactly what you already use, so extending to “10 target languages at once” is mostly a prompt + parsing + UI/storage change.

### 2) Audio → transcription (optimized endpoint)

Mistral also exposes `POST /v1/audio/transcriptions` for transcription-only workloads (Voxtral Mini Transcribe).  
Source: https://docs.mistral.ai/capabilities/audio_transcription

This endpoint does **not** have a “translate into many targets” feature; it’s transcription-focused.

### 3) Voxtral is multilingual (but “multi-target” is still an orchestration problem)

Voxtral is described as “natively multilingual” and is evaluated on speech translation benchmarks, but the API still expects you to specify *what you want back* via prompts (chat) or via your own pipeline (transcribe → translate).  
Sources:
- https://mistral.ai/news/voxtral
- https://huggingface.co/mistralai/Voxtral-Mini-3B-2507

## Option A (simplest): one Voxtral call that returns 10 translations as JSON

### Idea

Keep the current single request (audio → chat completions) but change the required JSON response to include a `translations` map or array.

Example JSON shape:

```json
{
  "sourceText": "…",
  "sourceLanguage": "de",
  "translations": {
    "en": "…",
    "fr": "…",
    "it": "…",
    "es": "…"
  }
}
```

### Why it works

The chat completions endpoint can return any content; JSON mode ensures it is valid JSON.

### Practical constraints

- **Output size** grows with the number of languages. Expect longer latency and higher cost because the model must generate ~10× more text.
- You may need to raise `max_tokens` so the response doesn’t truncate for longer utterances.
- Reliability improves if you:
  - require fixed keys (or an array with required `lang` entries),
  - instruct “include all requested languages even if translation equals source text”.

## Option B (often best UX/cost): transcribe once, then translate to N languages (parallel text calls)

### Idea

1) Call `POST /v1/audio/transcriptions` to get `sourceText` (and often detected `language`).  
2) Call a **text model** (e.g., `mistral-small-latest`) to translate the transcription into N languages concurrently.

### Why it can be better

- **Cheaper + faster** in many cases: the transcription endpoint is optimized, and text translation is usually less expensive than generating 10 translations inside a single large audio-chat response.
- **Failure isolation**: if one language fails (429/timeout), you still show the others.
- **Incremental rendering**: you can display translations as they arrive.

### Tradeoffs

- More moving parts: N+1 requests instead of 1.
- More attention needed for rate limits (throttle concurrency, retry 429s).

## App-level implications (regardless of option)

### Storage model changes

Currently the DB schema stores one translation:

- `translatedText: string`
- `targetLang: string`

If you want to keep multiple translations per utterance, you’ll likely want:

- `translations: Record<string, string>` (store as JSON string) **or**
- a separate table like `conversationTranslations` with `(conversationId, lang, text)`

This requires a Dexie schema version bump in `src/db/db.ts`.

### UI changes

Your target language selector currently implies a single selection. For “10 at once” you need:

- multi-select (checkbox/grid) and a list of “active target languages”
- a way to display multiple outputs (stacked list, tabs, or “show more”)

### TTS considerations

If you speak the translations aloud, the browser’s Web Speech API voices are inconsistent across platforms/languages. Supporting 10 languages in the UI doesn’t guarantee 10 high-quality voices for playback.

## Recommendation for this project

- If your priority is **minimal code change**, implement **Option A** (single Voxtral call returning `translations`).
- If your priority is **latency/cost control** and **better resilience**, implement **Option B** (transcribe once → translate N times in parallel).

If you want, I can implement either approach end-to-end (prompt + parsing + UI + DB migration) after you confirm:

1) should users always translate to all 10 languages, or choose a subset?  
2) how should conversation history store/display multiple translations?

