# EasyTranslator

A Progressive Web App for real-time speech translation powered by [Mistral AI's Voxtral](https://mistral.ai/) model.

Record your voice, and instantly get transcriptions and translations into multiple languages.

## Live Demo

- **Extended version:** [speak-and-translate.vercel.app](https://speak-and-translate.vercel.app)
- **Simple version:** [speak-and-translate-simple.vercel.app](https://speak-and-translate-simple.vercel.app)

## Features

### Extended Version (`main` branch)

- Translate speech into **up to 10 languages** simultaneously
- Save transcripts locally for later reference
- Re-translate saved recordings with different target languages
- Text-to-speech playback of translations
- Audio waveform visualization with WaveSurfer.js

### Simple Version (`simple` branch)

- Translate speech into **one target language** at a time
- Conversation history stored locally
- Streamlined, minimal interface
- Text-to-speech playback

### Common Features

- **Bring Your Own Key (BYOK):** Uses your personal Mistral API key (stored locally, never sent to any server except Mistral)
- **Offline-capable PWA:** View saved content offline, record audio locally
- **Auto-detect source language:** Voxtral automatically identifies the spoken language
- **Mobile-friendly:** Optimized for both desktop and mobile browsers

## Requirements

- **Node.js 18+** (developed with Node 22)
- **npm** (comes with Node.js)
- A [Mistral AI API key](https://console.mistral.ai/) with access to Voxtral

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/speak-and-translate.git
cd speak-and-translate

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### First-Time Setup

1. Click the **Settings** icon
2. Enter your Mistral API key
3. (Extended version) Select your target languages
4. Start recording!

### Environment Variables (Optional)

For local development convenience, you can set your API key in a `.env` file:

```env
VITE_MISTRAL_API_KEY=your_api_key_here
```

This is only used in development mode as a fallback.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (includes TypeScript checking) |
| `npm run preview` | Preview production build locally |

## Tech Stack

- **Framework:** [Vue 3](https://vuejs.org/) with Composition API
- **Language:** [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Build Tool:** [Vite 7](https://vitejs.dev/)
- **State Management:** [Pinia](https://pinia.vuejs.org/)
- **Routing:** [Vue Router 4](https://router.vuejs.org/)
- **Database:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Audio Visualization:** [WaveSurfer.js](https://wavesurfer.xyz/)
- **Animations:** [GSAP](https://greensock.com/gsap/)
- **Icons:** [Lucide Vue](https://lucide.dev/)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

## Project Structure

```
src/
├── components/       # Reusable Vue components
├── composables/      # Vue composables (useAudioRecorder, etc.)
├── config/           # App configuration (languages, etc.)
├── db/               # Dexie database setup
├── router/           # Vue Router configuration
├── stores/           # Pinia stores (settings, translation, transcriptions)
├── views/            # Page components
├── App.vue           # Root component
└── main.ts           # Application entry point
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Extended version with multi-language support |
| `simple` | Simple version with single-language translation |

The `simple` branch is based on the `simple-version` tag and receives only bug fixes.

## Deployment

Built for static hosting. The production build outputs to `/dist/`.

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static hosting provider.

### Vercel Branch Deployments

This project uses Vercel's branch-to-domain feature:
- `main` branch → `speak-and-translate.vercel.app`
- `simple` branch → `speak-and-translate-simple.vercel.app`

## Browser Support

- Chrome/Edge 89+ (recommended)
- Firefox 90+
- Safari 15+

**Note:** Microphone access requires HTTPS (or localhost for development).

## License

GNU GPL

## Author

Robert Wildling ([@rowild](https://github.com/rowild))
