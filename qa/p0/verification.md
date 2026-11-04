# Existing-flow closure · 2026-11-04

Scope: reuse local storage, original pages and source snapshots. No dependencies or food/motion content added. Checks used `?sandbox=1`, newly created synthetic profiles `流程收口测试` and `备份恢复测试（恢复）`; no real health data.

## Automated checks

`npm test`: 21 passed (16 reused + 5 focused checks).

New checks cover multiple removals and correction undo across backup/profile switch; conflicting preparation portions and measurement dates; linked activity/plan status; paused session/follow elapsed time and partial completion; invalid imported dates/units/source-field mismatches/queues/base64; all 480 catalog nutrient fields against pinned source rows, food identities and units.

Source archive SHA256 recomputed as `b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0`. `src/foods.json` and `public/data/food-evidence.json` remain unchanged. This confirms extraction fidelity, not equivalence to a user's actual Chinese food or cooked dish.

## Browser checks

- New QA profile preserves previous QA profiles. Two 100 g cucumber records total 30 kcal. Delete both, reload: two deleted records remain; recover both, no duplicates.
- Change one record to 50 g, reload: source revision remains `sr2018-168409-r1`, UI rounds 7.5 kcal to 8. Undo: 100 g / 15 kcal restored.
- Two-set march session: mark one actual set, start follow-along for the remaining set, pause and reload. Still 1/2 completed; total timer remains 00:07 and preparation timer 5 seconds across two reloads. Resume, end follow early, save: one set / one rounded minute only.
- Delete and restore that activity: linked plan returns to partial completion, original two-set prescription preserved.
- Invalid backup with `march-99` in a two-set prescription refused with readable error; current profile retained.
- Valid synthetic backup with one deleted/corrected cucumber record and one public motion poster restored into a new profile. Poster original opens; deleted meal restores and correction undo returns 100 g / 15 kcal. Existing QA profile still shows two meals, one activity and its partial plan.
- Body: 70 → 71 kg correction, undo → 70; delete and restore → 70. Phone layout shows all actions.
- 390×844 viewport: follow pause/replay/resume controls and body actions inspected. `paused-phone.png` is the saved viewport evidence (ignored in Git). Temporary viewport reset afterward.

## Boundaries and observations

No physical iOS/Android or process-kill acceptance. Background pause uses browser visibility/pagehide events; a forced process kill may prevent them. Video playback controls remain separate from training controls. Recovered records may be refused when later records occupy the same date, batch portions or training plan; no silent overwrite. Soft-deleted records remain in local storage and backups; permanent erasure/report deletion is not part of this change.

Import checks are structural and internal consistency checks, not cryptographic proof that an external backup is authentic. IndexedDB batch writes are atomic within the file store, not a cross-store transaction with localStorage. Quota/process-failure injection was not performed.

Existing build chunk-size warning remains. Initial local preview was stopped; restarted hidden on port 5178. Browser initially failed to connect and one navigation timed out; after the service started, the observed test tab worked. Tests were not performed on the connection-error page. One exact Chinese select-label lookup failed; the actual select control was then used.
