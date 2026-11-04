# Library expansion — 2026-11-04

Scope: reuse existing calculations, record snapshots, training player, renderer and fixed source archive. No new runtime dependencies, accounts, cloud services or public deployment.

- Full USDA SR Legacy 2018-04: 7,793 foods, six core nutrients, 46,112 available fields and 646 missing positions. Original 80 Chinese mappings and their facts/revisions unchanged. Other names stay English; Chinese search hints do not establish equivalence. Historical US brands/restaurant items are not current Chinese products.
- Source archive SHA256: b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0. Generator validates archive, duplicate identities and original 80 values. Distributed manifest carries original row metadata, definitions, derivations and shard hashes. Tests cover all distributed rows, source IDs, units, null propagation and estimated source categories.
- 24 self-authored example recipes use existing source-backed ingredients. Calculated totals are not laboratory measurements or professionally approved diets. New cooked-food combinations explicitly use cooked weights.
- 18 exercise entries, 15 continuous MP4s from pinned Desk Break commit 8d475aa476b2c0e9ec6d09d8558faf17161e19ef (MIT). All 15 media manifests and distinct key poses pass verification. Inspected one intermediate key image per added clip for framing. No professional exercise review claimed.

## Checks

- `npm test`: 23/23 pass. Two new tests cover the full data set and pending-intake backup/resolution. Initial pending fixture omitted the required meals array, so migration correctly rejected it; fixed the fixture and reran successfully.
- `node scripts/verify-motion.mjs`: all 15 mappings/files/key poses pass.
- `npm run build`: pass. Existing single JS chunk warning remains (~1.06 MB minified); full food library assets load on demand, not inside this chunk.
- `git diff --check`: pass (Git line-ending warning only).

## UI evidence

Used only the separate `?sandbox=1` test profile, at 390 × 844 browser viewport. No real user records modified.

1. Search 酱油 returns six English original matches. Open FDC 174278, inspect six nutrient values, source, publication date, fixed version and licensing. Save 10 g: diary shows 6 kcal. Reload, open original meal and its food snapshot: 10 g and sr2018-174278-r1 preserved. Long English names wrap inside the mobile layout.
2. Save synthetic pending 黄瓜 / 100 克 / original note. Diary stays at 36 kcal and shows one excluded pending intake. Reload preserves pending entry. Find matching cucumber, require explicit correspondence/quantity checkbox, save: total rises once to 51 kcal and pending entry disappears. Program test verifies original text remains in the meal snapshot and duplicate resolution fails.
3. New dead-bug detail: MP4 readyState 4, duration 4.8 s, visible moving grey figure. Start training with one set, open in-session demonstration, play/pause/replay: timer advances from 00:06 to 00:15 and completed sets remain 0/1. Leaving retains paused session. This supplements existing follow-along timing tests; it is not a physical-device background/lock-screen test.
4. Search new 红薯牛奶早餐, open recipe: 150 g cooked peeled sweet potato + 250 g milk, 267 kcal estimate, ingredient-source links and existing preparation/intake controls visible.
5. Browser error log empty during these checks. Screenshot: `food-library-phone.png` (local evidence, ignored by Git).

Not verified: physical iPhone/Android, professional motion correctness, current branded formulations, fully localized Chinese coverage, all nutrients beyond the six base fields, real AI or cloud synchronization. Local server remains available; no push or public deployment performed in this round.
