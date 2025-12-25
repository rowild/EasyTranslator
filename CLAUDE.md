# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Implementation Progress (must show at chat start)

At the start of every new chat/session, present the following to the user before doing any work:

- Last completed step: 03 (Mode toggle + mode-specific UX)
- Next step: 04 (Fix Simple Mode layout)

Process source of truth: `.claude/plans/implementation-process.md`

## Project Overview

EasyTranslator is a Progressive Web App (PWA) for real-time speech translation using Mistral AI. Built with Vue 3, TypeScript, and Vite, it enables users to record audio, transcribe speech, translate it to target languages, and store conversations offline using IndexedDB.

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

Required environment variables in `.env`:
```
VITE_MISTRAL_API_KEY=your_api_key_here
```

Access in code via `import.meta.env.VITE_MISTRAL_API_KEY`

## Architecture Overview

### Data Flow

```
User Records Audio → useAudioRecorder Composable
    ↓
Audio Blob → Mistral Transcription API (voxtral-mini model)
    ↓
Transcribed Text → Mistral Chat API (mistral-small-latest model)
    ↓
Translated Text → IndexedDB via Dexie → Conversation History
```

### Key Components

**State Management (Pinia):**
- `/src/stores/translation.ts` - Central store managing translation flow, API calls, and conversation history
- Handles both Mistral API integrations (transcription + translation)
- Persists target language preference to localStorage

**Audio Recording:**
- `/src/composables/useAudioRecorder.ts` - Encapsulates microphone access, recording, and real-time volume visualization
- Uses MediaRecorder API for audio capture
- AudioContext + AnalyserNode for volume feedback
- Returns audio Blob on stop

**Database Layer:**
- `/src/db/db.ts` - Dexie wrapper for IndexedDB
- Single `conversations` table with indexes on: `++id`, `createdAt`, `sourceLang`, `targetLang`
- Schema: `{ id?, createdAt, sourceText, sourceLang, translatedText, targetLang }`

**Main View:**
- `/src/views/MainView.vue` - Orchestrates entire translation workflow
- Handles offline detection
- Coordinates between composable, store, and child components

### Component Hierarchy

```
App.vue
└─ MainView.vue
   ├─ LanguageSelector.vue (modal with 10 languages)
   ├─ RecordButton.vue (animated with volume ring)
   ├─ AudioPlayer.vue (WaveSurfer.js waveform visualization)
   └─ ConversationList.vue (history display with playback)
```

## Mistral AI Integration

The app makes **direct frontend calls** to Mistral AI (no backend proxy required):

**Transcription:**
```
POST https://api.mistral.ai/v1/audio/transcriptions
FormData: { file: audioBlob, model: 'voxtral-mini' }
```

**Translation:**
```
POST https://api.mistral.ai/v1/chat/completions
Body: {
  model: 'mistral-small-latest',
  messages: [
    { role: 'system', content: 'Translation prompt' },
    { role: 'user', content: sourceText }
  ]
}
```

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
- View conversation history (from IndexedDB)
- Record audio locally
- Change language preference (from localStorage)
- Play translations via Web Speech API

**Requires Online:**
- Transcription (Mistral API)
- Translation (Mistral API)

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
- **localStorage**: `targetLang` persisted for language preference
- **IndexedDB**: All conversations with full text + metadata
- Store initialization loads both on app mount

### API Key Security
- API key currently exposed in frontend via `VITE_` prefix
- For production: Use `/api/` edge functions to proxy and hide key
- Never commit `.env` file (already in `.gitignore`)

### Error Handling
- All API calls wrapped in try/catch
- Errors stored in `store.error` and displayed in UI
- Console logging for debugging
- Graceful degradation when offline

## Supported Languages

Target languages (10 total):
- Italian (it), French (fr), German (de), Spanish (es), Portuguese (pt)
- Dutch (nl), Polish (pl), Russian (ru), Japanese (ja), Chinese (zh)

Source language auto-detected by Mistral (defaults to 'en').

## Build Output

`npm run build` produces:
- Static assets in `/dist/`
- Service worker with Workbox configuration
- PWA manifest (`manifest.webmanifest`)
- Optimized chunks with code splitting

Deploy `/dist/` to any static hosting (Vercel, Netlify, etc.).
