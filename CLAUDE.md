# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Implementation Progress (must show at chat start)

At the start of every new chat/session, present the following to the user before doing any work:

- Last completed step: P2-08 (Saved transcript detail + re-translate)
- Next step: P2-09 (QA + docs)

Process source of truth: `.claude/plans/implementation-process.md`

## Project Overview

EasyTranslator is a Progressive Web App (PWA) for real-time speech translation using Mistral AI. Built with Vue 3, TypeScript, and Vite, it enables users to record audio, transcribe speech, translate it to target languages (Simple/Extended modes), and (in Simple mode) store conversation history offline using IndexedDB.

## Development Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production (includes TypeScript checking)
npm run build

# Preview production build locally
npm run preview
```

## Environment Setup

- Production: users must enter their own Mistral API key in the app Settings (stored locally in IndexedDB).
- Development (optional convenience): set `VITE_MISTRAL_API_KEY` in `.env` to avoid typing it during local testing.

`VITE_MISTRAL_API_KEY` is only used as a fallback in `import.meta.env.DEV`.

## Architecture Overview

### Data Flow

```
User Records Audio → useAudioRecorder Composable
    ↓
Audio Blob → (convert to WAV + base64)
    ↓
Audio + Prompt → Mistral Chat Completions (Voxtral model)
    ↓
Structured JSON → UI state
    ↓
Simple Mode: save conversation to IndexedDB (Dexie)
Extended Mode: delete-and-forget (no persistence)
```

### Key Components

**State Management (Pinia):**
- `/src/stores/settings.ts` - Dexie-backed settings store (mode, API key, language prefs, extended targets, TTS prefs)
- `/src/stores/translation.ts` - Voxtral request/parse flow + in-memory state + Simple-mode conversation persistence
- Exposes per-request `lastUsage` and (extended mode) `currentTranslations`

**Audio Recording:**
- `/src/composables/useAudioRecorder.ts` - Encapsulates microphone access, recording, and real-time volume visualization
- Uses MediaRecorder API for audio capture
- AudioContext + AnalyserNode for volume feedback
- Returns audio Blob on stop

**Database Layer:**
- `/src/db/db.ts` - Dexie wrapper for IndexedDB
- `conversations` table: `++id, createdAt, sourceLang, targetLang`
- `settings` table: `&id` (single row: `id='app'`)

**Main View:**
- `/src/views/MainView.vue` - Orchestrates entire translation workflow
- Handles offline detection
- Coordinates between composable, store, and child components

### Component Hierarchy

```
App.vue
└─ MainView.vue
   ├─ LanguageWheelPicker.vue (source + Simple-mode target selection)
   ├─ SettingsModal.vue (mode toggle + API key + extended targets)
   ├─ TargetLanguagesModal.vue (extended multi-select, max 10)
   ├─ SwipeableTranslations.vue (extended output carousel)
   ├─ UsageStats.vue (per-request usage)
   ├─ RecordingVisualizer.vue (live mic visualization)
   ├─ AudioPlayer.vue (recording playback)
   └─ TextToSpeech.vue (speech synthesis)
```

## Mistral AI Integration

The app makes **direct frontend calls** to Mistral AI (no backend proxy required):

**Transcription + Translation (single Voxtral call):**
```
POST https://api.mistral.ai/v1/chat/completions
Authorization: Bearer <user key>
Body: {
  model: "voxtral-small-latest",
  response_format: { type: "json_object" | "json_schema" },
  messages: [
    { role: "system", content: "instructions" },
    { role: "user", content: [{ type: "input_audio", input_audio: "<base64>" }, { type: "text", text: "..." }] }
  ]
}
```

- **Simple mode** expects: `sourceText`, `sourceLanguage`, `translatedText`, `targetLanguage`
- **Extended mode** expects: `sourceText`, `sourceLanguage`, `translations` keyed by selected target codes (max 10)

**Optional Backend:** The `/api/` directory contains serverless edge functions (`transcribe.ts`, `translate.ts`) that can proxy these calls if you want to hide the API key from the frontend.

## PWA Configuration

Configured in `/vite.config.ts` using `vite-plugin-pwa`:
- Auto-updates via service worker
- Workbox caching strategies (cache-first for assets, network-first for API)
- Manifest includes app name, icons, theme color
- Icons required: `pwa-192x192.png`, `pwa-512x512.png`, `favicon.ico`

Service worker automatically generated during build and handles offline asset caching.

## Offline Capabilities

**Works Offline:**
- View conversation history (Simple mode, from IndexedDB)
- Record audio locally
- Change settings (from IndexedDB)
- Play translations via Web Speech API

**Requires Online:**
- Voxtral transcription/translation (Mistral API)

Offline state detected via `navigator.onLine` and displayed in UI with red "Offline" badge.

## TypeScript Configuration

Strict mode enabled in `tsconfig.json`. All Vue components use `<script setup lang="ts">` syntax. Path alias `@/` maps to `/src/`.

## Important Development Notes

### Audio Handling
- Audio format: `audio/webm` (MediaRecorder default)
- Volume calculation: Uses FFT size 256 with AnalyserNode
- Must handle microphone permission states: 'granted', 'denied', 'prompt', 'unknown'
- Cleanup required: Stop all MediaStream tracks and close AudioContext

### State Persistence
- **IndexedDB (Dexie)**:
  - `settings` row (`id='app'`) stores mode, API key, language prefs, extended targets, and TTS preferences
  - `conversations` stores Simple-mode conversation history
- **Legacy migration**: some older `localStorage` keys are migrated once into IndexedDB, then removed

### API Key Security
- Production behavior is **BYO key**: the app does not ship an API key; the user enters it in Settings and it’s stored locally in IndexedDB.
- Direct frontend calls still send the key in the request; if you need to hide it from the browser, use the `/api/` proxy approach.
- Never commit `.env` files (already in `.gitignore`).

### Error Handling
- All API calls wrapped in try/catch
- Errors stored in `store.error` and displayed in UI
- Console logging for debugging
- Graceful degradation when offline

## Supported Languages

- Languages come from `src/config/languages.ts` (some entries share the same 2-letter `displayCode`).
- **Simple mode**: select 1 target language (by `displayCode`) via the language picker.
- **Extended mode**: select up to 10 unique target `displayCode`s in Settings.
- Source language is auto-detected by Voxtral (with an optional user-selected fallback in Settings).

## Build Output

`npm run build` produces:
- Static assets in `/dist/`
- Service worker with Workbox configuration
- PWA manifest (`manifest.webmanifest`)
- Optimized chunks with code splitting

Deploy `/dist/` to any static hosting (Vercel, Netlify, etc.).
