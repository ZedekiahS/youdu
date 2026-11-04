# Whole-app information hierarchy — 2026-11-04

## Scope
Applied the existing interface-design, Web Design Guidelines, UI UX Pro Max and Impeccable guidance to task-first content throughout the app. Reused native details/summary with a small Help component; no dependency, schema, data source or calculation changes.

- Today: removed redundant introduction and storage explanation.
- Training: example template collapsed; timing and progress rules available on demand; actual timer, completed sets and foreground limitation remain visible.
- Body: trend/correction/report-storage explanations collapsed; manual report entry remains clear.
- Plan: shortened repetitive intro; reminder availability and execution state remain visible.
- Progress: nutrition-statistics and summary methodology collapsed; units, missing days and incomplete-record state remain visible.
- Assistant: context inputs collapsed, implementation explanation moved behind About; demo identity and unsupported automation stay visible.
- Family/settings: reduced repeated storage descriptions; consent, profile switching exposure and backup requirement stay visible.
- Exercise/media/prepared meals/deleted records: sources, playback and calculation/recovery details are contextual disclosures. Explicit source/trace screens retain full evidence.

## Verification performed
- npm test: 26 passed, 0 failed; existing calculation/source identity, Chinese names, backup/profile isolation, history and training tests reused. No copy-mirroring tests added.
- npm run build: passed; pre-existing >500 kB bundle advisory remains.
- Impeccable source detector across edited UI files: [] (not a substitute for visual review).
- Browser QA used the existing sandbox test profile, not actual personal records.
- Visual screenshots inspected at 390×844: today, workout, body, plan, progress, assistant, family, settings.
- DOM width checks at 320×700 across the same eight routes: no document horizontal overflow. This is viewport reflow, not actual device or browser zoom testing.
- Desktop 1042×764: report view and assistant disclosures inspected; training session inspected through DOM.
- Nutrition explanation expanded with Enter; report and assistant-context disclosures expanded/collapsed with pointer. Source/context details remain reachable.
- Session explanation expansion kept paused timer at 00:15 and completed groups at 0/1. This turn did not rerun full motion playback or live exercise sessions; existing clock tests passed.
- During hot reload the browser briefly retained an outdated ui.jsx export. Refreshed that module and reloaded; all eight routes subsequently rendered correctly.

Screenshots: clarity-*-390.png, clarity-reports-desktop.png, clarity-assistant-desktop.png. Layout observations: clarity-layout-checks.json. Screenshot files are ignored local QA artifacts.
