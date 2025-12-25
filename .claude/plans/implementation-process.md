# Implementation Process (BYO Key + Extended Mode)

This is the canonical step-by-step implementation plan **and** tracker for the work on:

- Bring-your-own Mistral API key (required for production)
- **Simple Mode** (single target language; existing flow preserved, but layout fixes requested)
- **Extended Mode** (up to 10 target languages; one Voxtral call; swipeable bubbles; “New” resets)
- No chat/history persistence (“delete and forget”)

## Process Rules (must follow)

1. Work on **exactly one step** at a time (from the tracker below).
2. When a step is finished:
   - Update **this file**: set the step `Status` to `DONE` and add a short completion note.
   - Update `CLAUDE.md`:
     - `Last completed step:` → the step you just finished
     - `Next step:` → the next step in this file
   - Create a git commit with a clear message describing that step (example format):
     - `feat: add extended mode toggle`
     - `feat: add API key settings modal`
     - `refactor: move mistral calls behind client helper`
     - `fix: simple mode bubble order and button placement`
3. At the **start of every new chat/session**, paste the `CLAUDE.md` “Implementation Progress” block to the user before doing any new work.

## Tracker

| ID | Status | Deliverable | Completion notes |
|---:|:------:|-------------|------------------|
| 00 | DONE | Add process tracker + progress block | Create `.claude/plans/implementation-process.md` and add progress tracking section to `CLAUDE.md`. |
| 01 | TODO | Define settings state | Add a Pinia store for: `mode` (simple/extended), `apiKey`, `simpleTargetLang`, `extendedTargetLangs[]` (max 10), and UX prefs; load/save to `localStorage`. |
| 02 | TODO | API key UI + gating | Add UI to set/clear API key; block recording when missing; allow dev fallback to `VITE_MISTRAL_API_KEY` only in dev builds. |
| 03 | TODO | Remove persistence/history | Remove IndexedDB/Dexie saves and in-memory “conversation history” UI; app becomes “single-turn” per recording with explicit reset. |
| 04 | TODO | Fix Simple Mode layout | Switch bubbles to top→bottom order; place “+” (next recording) **under** translation; keep simple mode behavior otherwise unchanged. |
| 05 | TODO | Extended mode language picker | Multi-select target languages (max 10) with a clear mobile UX (chips + modal grid); store selection in settings. |
| 06 | TODO | Voxtral multi-translation request | Send audio once; request JSON schema output containing `sourceText`, `sourceLanguage`, and `translations` for all selected targets; parse robustly and capture `usage`. |
| 07 | TODO | Swipeable bubbles UI | Render one translation per bubble in a horizontal swipe carousel (scroll-snap); show active language and optional TTS per bubble. |
| 08 | TODO | Extended mode “New” flow | Add “New” button (no “+” in extended mode) that clears current results and starts a fresh recording. |
| 09 | TODO | Usage display (per request) | Display request usage stats returned by API (`prompt_audio_seconds`, token counts). Note: “credits remaining” is not available via public API. |
| 10 | TODO | Mobile QA + doc refresh | Verify UX on narrow viewports; update `CLAUDE.md` architecture sections to reflect new behavior (BYO key, no persistence, two modes). |

