# Implementation Process (BYO Key + Extended Mode)

This is the canonical step-by-step implementation plan **and** tracker for the work on:

- Bring-your-own Mistral API key (required for production)
- **Simple Mode** (single target language; existing flow preserved, but layout fixes requested)
- **Extended Mode** (up to 10 target languages; one Voxtral call; swipeable bubbles; “New” resets)
- **Persistence rules**:
  - **Simple Mode**: keep existing conversation history/persistence behavior
  - **Extended Mode**: “delete and forget” (no saved history), unless we later decide otherwise

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
| 01 | DONE | Move all settings to IndexedDB | Added Dexie `settings` table + `useSettingsStore`, migrated legacy `localStorage` keys once (then clears them), and removed direct `localStorage` usage from app code (languages, info modal, TTS voice prefs). |
| 02 | DONE | API key UI + gating | Added `SettingsModal` to set/clear the key (stored in IndexedDB); record button is disabled and prompts user when missing; translation calls use saved key with dev-only fallback to `VITE_MISTRAL_API_KEY`. |
| 03 | DONE | Mode toggle + mode-specific UX | Added mode toggle in Settings; extended mode now clears/hides in-memory history and skips saving conversations to IndexedDB. |
| 04 | DONE | Fix Simple Mode layout | Removed bottom-up rendering by switching flex layouts to top→bottom; “+” now renders under the translation bubble. |
| 05 | DONE | Extended mode language picker | Added multi-select target language modal (max 10) and wiring in Settings (stored in IndexedDB settings). |
| 06 | DONE | Voxtral multi-translation request | Extended mode now requests structured output for `translations` keyed by selected targets (with json_schema + json_object fallback), parses defensively, stores `currentTranslations`, and captures `usage` for later display. |
| 07 | DONE | Swipeable bubbles UI | Added `SwipeableTranslations` carousel (scroll-snap) to render one bubble per selected target language in extended mode (with TTS) and a page-dot indicator. |
| 08 | DONE | Extended mode “New” flow | Replaced the “+” button with a “New” button in extended mode; entering extended mode clears the current dialog, and “New” resets current results and starts a fresh recording. |
| 09 | DONE | Usage display (per request) | Captured and displayed per-request usage stats when available (audio seconds + token counts); added UI note that “credits remaining” is not available via the public API. |
| 10 | DONE | Mobile QA + doc refresh | Mobile tweaks (extended “New” button sizing) and refreshed `CLAUDE.md` to reflect BYO key, Dexie-backed settings, Voxtral single-call flow, and mode/persistence rules. |

---

## Phase 2: Extended-only + Saved transcripts

Scope for this phase:

- Remove “Simple mode” from the product UX (extended-style multi-target translation only)
- Keep the existing two-flag language picker **unchanged** initially (later removed; see P2-11)
- Add a new “targets” language picker button (generic flag) in the footer
- Replace swipe UI with a vertically stacked translation-bubbles list where **only the translations list scrolls**
- Add “Save transcript” → persist to IndexedDB (Dexie)
- Add “Saved transcripts” route with list + delete + detail view
- Saved transcript detail supports **re-translate** (and can be saved again if changed)
- Archive/remove legacy picker + swipe components from `/src` into `/_BU` for backup (P2-11)

Confirmed decisions:

1. Entry point to “Saved transcripts” route:
   - Add a new footer button on the left (next to Info/Settings).
2. When re-translating an already-saved transcript:
   - Create a new entry and link it back to the original (variant/related).

### Tracker

| ID | Status | Deliverable | Completion notes |
|---:|:------:|-------------|------------------|
| P2-01 | DONE | Remove simple mode UX | Forced extended behavior (settings default/migration + removed mode toggle), removed Simple-mode-only history/output UI, and kept the existing two-flag picker unchanged. |
| P2-02 | DONE | Footer “targets” picker button | Added a generic-flag footer button next to the existing two-flag button to open `TargetLanguagesModal` (max 10) and persist selection via Dexie settings. |
| P2-03 | DONE | Vertical translations list + scroll | Replaced swipe carousel with a stacked translation-bubbles list; switched layout so only the translations list scrolls; tightened bubble spacing/padding. |
| P2-04 | DONE | Dexie `transcriptions` table + store | Added Dexie v3 `transcriptions` table with variant linkage (`variantGroupId`, `variantOfId`) and a `useTranscriptionsStore` helper for add/list/get/delete. |
| P2-05 | DONE | “Save transcript” in main flow | Added a “Save” button after translation that persists the current utterance to IndexedDB and disables after saving; resets on New/Delete/Start recording. |
| P2-06 | DONE | Add router + routes | Added `vue-router` with routes for `/` (main), `/saved` (list), and `/saved/:id` (detail), plus placeholder views. |
| P2-07 | DONE | Saved transcripts list UI | Implemented `/saved` list UI backed by IndexedDB with delete + navigation to detail; added a “Saved” footer entry point from the main view. |
| P2-08 | DONE | Saved transcript detail + re-translate | Implemented `/saved/:id` detail view using the same bubble layout, added re-translate (Voxtral) using current target selection, and “Save variant” which creates a new linked entry (variant group + parent reference) plus a related-versions navigator. |
| P2-09 | DONE | QA + docs | Ran TypeScript/build checks and refreshed `CLAUDE.md` to reflect the extended-only flow, saved transcripts routes, and Dexie persistence model. |
| P2-10 | DONE | Mute API key Save button | Disabled the API key “Save” button when the input matches the stored key (becomes “mute” immediately after saving). |
| P2-11 | DONE | Archive legacy picker UI | Removed the footer two-flag picker button + modal wiring, and moved unused legacy components (`LanguageWheel*`, `SwipeableTranslations`, etc.) into `/_BU` for backup. |
| P2-12 | DONE | Target picker prompt + settings scope | Updated the “no targets selected” prompt to open the target-language modal (not Settings), moved “Saved” to footer-right, and simplified Settings to API-key-only. |
