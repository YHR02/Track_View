# Track Wise — Engineering Blueprint & Walkthrough Log (blue.md)

This document serves as the permanent local engineering blueprint and system log for **Track Wise**. Any architectural adjustments, refactoring iterations, bug resolutions, or visual redesigns are logged here for continuity.

---

## 1. System Architecture & Component Mapping

The application has been refactored into a strict **Separation of Concerns (SoC)** model:
- **Generic HTTP Client** ([http-client.ts](file:///Users/syam/Documents/SYAM/Track_View/src/lib/http-client.ts)):
  - Zero coupling with sheet schemas.
  - Implements exponential backoff retries ($1000\text{ms} \rightarrow 2000\text{ms} \rightarrow 4000\text{ms}$) on transient `429` (Quota Exceeded) and `5xx` errors.
  - Forces `cache: 'no-store'` on all fetch options to prevent stale GET browser cache resets.
- **Core Workspace Coordinator** ([spreadsheet.service.ts](file:///Users/syam/Documents/SYAM/Track_View/src/services/spreadsheet.service.ts)):
  - Integrates locate search, validation, auto-repair, and creation fallback.
- **Single-Responsibility Utilities**:
  - `spreadsheet-validator.ts`: Checks structure compliance.
  - `spreadsheet-repair.ts`: Safely reconstructs missing tabs and missing columns.
  - `spreadsheet-initializer.ts`: Seeds fresh worksheets.
- **Repositories Layer**: Pure CRUD access routines using `SHEET_NAMES` and `SHEET_HEADERS` constants.
- **Data Schemas & Type System**: Migrated old logs to `Entry` type validation ([entry.ts](file:///Users/syam/Documents/SYAM/Track_View/src/types/entry.ts)).

---

## 2. Dynamic Weekly Habit Matrix & Optimistic States

- **Weekly Habit Matrix**:
  - Main interactive hub of the dashboard.
  - Computes current week dates (Mon to Sun).
  - **Zero-Modal Boolean Logging**: Clicking a boolean tracker cell toggles its completion status immediately in one click, without launching a modal. Complex tracker types (Numeric, Duration, Rating) continue to open the log configurator modal for value adjustment.
  - **Animated Checkbox Pop**: Checked icons bounce smoothly into view via `animate-check-pop` CSS scaling keyframes.
  - Hovering cells displays hover tooltips containing values and notes.
- **Optimistic State Synchronisation** ([use-logs.ts](file:///Users/syam/Documents/SYAM/Track_View/src/hooks/use-logs.ts)):
  - Mutation handlers cancel all pending read requests and optimistically update all range queries (`['logs', 'range']`) in one pass.
  - Invalidates the complete `['logs']` query tree (Wildcard invalidation) upon settled mutations to sync daily logs, calendars, and year heatmaps concurrently.

---

## 3. Premium Monochrome Identity & Branding

- **Custom Emblem Monogram Logo** ([Logo.tsx](file:///Users/syam/Documents/SYAM/Track_View/src/components/ui/Logo.tsx)):
  - $32\times32$ scalable vector bounding box.
  - Monogram connection representing "T" (task bar) and "W" (tracking wave).
  - Integrated into the browser tab favicon ([favicon.svg](file:///Users/syam/Documents/SYAM/Track_View/public/favicon.svg)), login, layout headers.

---

## 4. Rebuild Verification Log (Post-Recovery)

Following the accidental Git branch cleanup, the visual layers and system features were successfully restored:
- Styles reset to dark theme parameters in `index.css`.
- Monogram branding reinstated inside `public/favicon.svg` and `Logo.tsx`.
- Linear layout sidebar fully configured in `Shell.tsx`.
- Dense matrix dashboard completely restored in `Dashboard.tsx`.
- Category selectors and outline edit modes updated in `Trackers.tsx`.
- Visual completion rate grids recovered in `Calendar.tsx`.
- Dark-theme monochromatic charts set up in `Analytics.tsx`.
- Compact account configuration boxes written to `Settings.tsx`.

Production build builds cleanly:
```bash
vite v5.4.21 building for production...
transforming...
✓ 2383 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.86 kB │ gzip:   0.49 kB
dist/assets/index-CENUh-Sp.css   51.08 kB │ gzip:   9.20 kB
dist/assets/index-B-FzgzSw.js   715.30 kB │ gzip: 201.71 kB
✓ built in 1.82s
```
All system hooks, stores, pages, and components remain in stable configuration.
