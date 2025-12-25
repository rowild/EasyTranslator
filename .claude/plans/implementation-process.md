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
- Keep the existing two-flag language picker **unchanged** for now
- Add a new “targets” language picker button (generic flag) next to the two-flag button
- Replace swipe UI with a vertically stacked translation-bubbles list where **only the translations list scrolls**
- Add “Save transcript” → persist to IndexedDB (Dexie)
- Add “Saved transcripts” route with list + delete + detail view
- Saved transcript detail supports **re-translate** (and can be saved again if changed)

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
| P2-03 | TODO | Vertical translations list + scroll | Replace swipe carousel with stacked translation bubbles; make only that list scroll; tighten bubble padding/margins. |
| P2-04 | TODO | Dexie `transcriptions` table + store | Add a new table for saved transcripts including audio blob, transcript, translations, and metadata like detected source language + selected target codes/order; include `variantOfId` (or similar) to link re-translation variants. |
| P2-05 | TODO | “Save transcript” in main flow | Add Save button after translation; save current utterance; disable once saved; reset saved state on “New” or new recording. |
| P2-06 | TODO | Add router + routes | Add `vue-router` and implement `/` (main), `/saved` (list), `/saved/:id` (detail). |
| P2-07 | TODO | Saved transcripts list UI | List saved items with timestamp + transcript snippet; support delete; navigate to detail. |
| P2-08 | TODO | Saved transcript detail + re-translate | Show saved transcript using the same layout; allow re-translate with current target selection; allow saving as a new entry linked as a variant/related record. |
| P2-09 | TODO | QA + docs | Verify mobile layout, scroll behavior, and persistence; update `CLAUDE.md` architecture notes for Phase 2. |
