


Feature: Dual-Column Snapping Language Picker in First-Run Popup (PWA, Mobile-First)

Build a dual-column vertical wheel picker for selecting input and output languages. This picker will live inside a popup (modal) that appears under specific conditions in a mobile-first PWA.

1. Overall Concept

The app has two language selections:

Input language

Output language

Languages are selected via a dual-column vertical wheel picker:

Left column: input language

Right column: output language

Each column is a vertically scrollable list of languages, each row displaying:

A flag (use the existing “flag column” that is already available in the project, no need to redefine its data structure)

The language name (e.g. “German”, “French”) for readability and accessibility.

In the vertical center of the screen, there is a fixed “active language” rectangle (selection window):

The lists scroll behind this rectangle.

The row whose center aligns with this rectangle is the selected language.

That row should be visually highlighted.

2. Popup Behavior & App Startup Logic

The PWA runs on a mobile phone (mobile-first design).

On app start, the app should:

Check localStorage or IndexedDB (either is fine; choose one and implement consistently) for previously saved languages:

savedInputLanguageCode

savedOutputLanguageCode

Behavior:

If no saved languages are found:

Immediately open the language picker popup.

Show a heading/string like: “Choose your input and output language”.

The columns can start at any reasonable default (for example, center on a default pair such as the device language and English), or simply start from the top of the list.

If saved languages are found:

Do not open the popup automatically.

Use those languages as the active input and output languages for the app.

There must be a footer button in the main app UI (visible when the popup is closed), e.g. in a fixed footer bar:

Tapping this button opens the same language picker popup again.

When the popup is opened via this button, it is considered “edit mode” instead of first-run mode.

In this case:

The popup title / text should be: “Change your input and output language”.

The wheel picker columns should auto-scroll so that the currently active input and output languages are centered in the “active language” rectangle.

3. Popup Layout & UX

The popup should be a modal overlay:

Full-screen or nearly full-screen on mobile.

Dim the background behind it to focus attention.

Inside the popup:

Show a headline or short text at the top:

First-time: “Choose your input and output language”.

Edit mode: “Change your input and output language”.

Below the heading, show the dual-column snapping language picker as described below.

At the bottom of the popup:

A primary confirmation button (e.g. “Save” or “Confirm”).

Optionally, a secondary cancel button (e.g. “Cancel”) that closes the popup without changing the saved languages.

4. Dual-Column Wheel Picker Behavior

For each column independently (left = input, right = output):

The column is a vertically scrollable list (overflow-y: scroll or equivalent).

Each row has a fixed height (e.g. 56px–64px) to simplify snapping calculations.

The row contents:

Use the existing flag column (flag image or icon).

Language name text.

Visual design:

Non-selected rows above and below the center window:

Slightly reduced opacity, or slightly smaller font, to look “in the background”.

The row inside the center rectangle (active language):

Full opacity, possibly slightly larger font or bold.

It should look clearly selected.

Scrolling and snapping logic per column:

While the user scrolls (dragging with touch), the list moves freely, with normal scroll inertia.

When the user releases the scroll:

After a brief delay (e.g. 100–200ms) or on scroll end, determine which row’s center is closest to the vertical center of the selection window.

Programmatically scroll the column so that this row’s center aligns exactly with the center of the window (smooth animated snapping).

Update that column’s selected language accordingly.

If the user taps/clicks on a non-selected row:

Smoothly scroll the column so that the tapped row moves into the center window and becomes the selected language.

5. State Management & Persistence

Internal state:

selectedInputLanguageCode

selectedOutputLanguageCode

isFirstRun (true/false, derived from whether saved languages exist).

On popup first-run confirmation:

Save selectedInputLanguageCode and selectedOutputLanguageCode to localStorage or IndexedDB.

Close the popup.

Use the selected languages as the active languages in the app.

On popup edit mode confirmation:

Update the saved languages in storage.

Close the popup.

Update the app’s active languages.

6. Footer Button Behavior (Reopening the Popup)

The main app UI should have a footer with a button like “Language Settings” or similar.

When this button is tapped:

Open the language picker popup.

Set the headline string to “Change your input and output language”.

In both columns, automatically scroll to the rows that correspond to the currently active input and output languages so that they start centered in the “active language” rectangle before any interaction.

Ensure that the snapping logic still works when the user scrolls away from these pre-centered selections.

7. Accessibility & Keyboard (Optional but Recommended)

Treat each column as a role="listbox" and each row as role="option".

Mark the centered row with aria-selected="true".

If feasible, allow keyboard navigation (up/down arrow keys) when the popup is focused—this is secondary for mobile but helpful for desktop usage.

8. Edge Cases & Constraints

Prevent overscrolling beyond the top and bottom of the list.

Optionally, prevent input and output languages from being the same:

If both columns are snapped to the same language, either allow it or automatically adjust one column—choose one approach and implement it consistently.

The component must work well on small mobile screens and with touch input as the primary interaction.