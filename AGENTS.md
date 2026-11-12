# Prototype Instructions

## Product scope agreed with the user

This is a whole-project health-management prototype, not a recipe-only prototype. Preserve Today, nutrition, training, body records, goals/plans, progress, assistant, family and privacy flows. Android and iPhone are both target experiences; responsive web is the current validation surface. Height and weight entry are baseline requirements. Food, recipe and exercise content must expose sources. Device integrations are optional later.

The user corrected the scope after recipe-only visual exploration. Recipe mockups are not the source of truth for the entire application. Do not require another image selection before completing runnable product flows.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Interaction iteration approved 2026-11-03

Prioritize prototype flow clarity: preserve conversations and context across linked objects; connect plan adjustments to the actual exercise prescription and linked execution record; demonstrate automatic, pending-confirmation, and paused adjustment states; separate recipe, preparation batch, and actual intake. Keep all nine modules. Do not expand this iteration into real-model, cloud, native-app, or production database work. The user approved implementation after reviewing the other conversation’s interaction feedback.

## Personal MVP authorized 2026-11-03

The complete current brief is docs/YOUDU_CODEX_PROMPT.txt. It supersedes the previous prototype-only scope. Preserve existing UI and nine modules. User explicitly prioritizes minimal implementation, minimal meaningful tests, reuse, exact food provenance, and hands-free follow-along inspired by established training apps. Keep five verified clips rather than padding the library. Timer completion is not actual completion. Personal profiles must not apply demo adjustment thresholds. Use sandbox=1 for QA; never clear real records. Private report originals stay local and out of public repositories. Public GitHub repository creation/source publication was explicitly requested; public website deployment was not. Distinguish real data, examples, local rules, model integration, desktop responsive testing and physical-phone acceptance.

## Existing-flow closure authorized 2026-11-04

User approved closing existing flows first: reuse existing implementation, minimum necessary tests, exact and clear food provenance. This iteration covers recoverable record deletion/correction, training pause/recovery and backup integrity, not library expansion or new cloud features. Preserve food facts and raw evidence. Deleted records remain local and in backups; never describe soft deletion as privacy erasure. Keep QA isolated from real records.

## Library coverage feedback 2026-11-03

The user finds the small sample library insufficient. Expand useful food/recipe coverage while preserving provenance and reusing existing calculation/history flows. Use the explicit scripts/food-selection.json mapping and pinned source archive; preserve existing facts and revisions. Clearly distinguish raw/cooked and regional/generic versus branded foods. Recipe additions are self-authored examples, not externally measured dishes. Current coverage: 80 food records, 12 recipes, 5 verified motion clips.

## Full library authorized 2026-11-04

User explicitly prefers a rich source-backed database in one pass rather than gradual personal wishlists. Supersedes the earlier five-clip/sample-only cap. Current: full SR Legacy 2018-04 index with 7,793 foods and six core nutrients; preserve the original 80 Chinese mappings and historical snapshots. Keep nulls and source derivations. Use 24 self-authored ingredient-based recipes, 18 exercises / 15 pinned-source motion clips. Pending intake stays separate from numerical nutrition until the user confirms a matching food and quantity. Reuse the pinned archive and renderer; no new dependencies, cloud services, or public deployment.

## Chinese food names requested 2026-11-04

User requires Chinese food names throughout, retaining original English and exact sources. Do not invent equivalence for species, cuts, brands or preparation states. Chinese display names live separately in names-zh.json, keyed to the exact FDC ID and original name, with project-authored terms, version and specific uncertainty notes. Unresolved proper names remain English with a Chinese category. Newly composed translations are not official USDA Chinese names or individually professionally reviewed. Keep name version separate from nutrition revision and never rewrite historical meal snapshots. Rebuild names after rebuilding the source catalog; verify full source identity and unchanged nutrient fields, plus meaningful ambiguous-name examples.

## Food browsing design feedback 2026-11-04

User explicitly requests applying the Product Design skills. Keep technical provenance, English originals, FDC IDs and translation explanations out of the default food list; retain them in expandable food details and the sources page. Default rows emphasize Chinese name, preparation distinctions in that name, and calories. Make filters obvious and provide numbered pagination rather than accumulating more rows. Remove the sidebar local-data promotional card. Preserve existing style and routes; do not delete underlying evidence or add unrelated features.

User additionally requested interface-design, Web Design Guidelines, UI UX Pro Max and Impeccable; installed and applied in the 2026-11-04 food browsing refinement. Retain the calm green visual system, improve legibility and accessible control states, prefer existing/native controls and avoid adding dependencies for stylistic changes. Mobile food pagination uses a page selector between previous/next controls to retain 44px targets; desktop retains numbered pages. See qa/library/four-skills-review.md for fixed source versions and verification scope.

## Whole-app design review 2026-11-04

User explicitly requests the same four design skills across all modules, not just food browsing. Preserve established green visual identity and source evidence. Prioritize readable mobile text, comfortable targets, clear missing values and units, prominent daily tasks and module navigation. Keep uncommon configuration behind native disclosures. Preserve demo and privacy boundaries without repeating implementation explanations on every personal page. Follow-along must remain hands-free between start and final confirmation.

## Task-first information hierarchy 2026-11-04

User reiterated that default screens should show only information needed for the current task. Do not promote catalog counts, implementation explanations or provenance slogans in page intros. Preserve source facts in detail/source views. Search precedes fallback entry; manual unmatched-food recording belongs in no-result state and the diary, while active matching context stays visible. Group search and filters; validate reflow at narrow widths and viewport sizes equivalent to browser zoom, not merely lack of horizontal overflow.

User extended this principle to every module: remove redundant page intros and technical explanations, disclose detailed recording/calculation/source/AI rules on demand. Keep operational state, missing-data meaning, demo limits, consent, local-only backup needs and training confirmation visible where decisions happen. Source and trace destinations remain detailed. Reuse native details/summary and existing components; do not hide essential controls or change data logic for copy cleanup.


## Review closure authorized 2026-11-12

User authorized four sequential deliveries, followed by one verified GitHub push and review handoff to the existing ChatGPT conversation “有度优化计划”: record/date/plan continuity, report/indicator management, full-catalog assistant lookup, then real preparation-batch family portions. Reuse existing source facts, snapshots, record-history, backup and UI controls. Keep explicit historical dates and started workout dates stable across midnight. Record mutations invalidate completeness. Report deletion is permanent and distinct from recoverable record deletion; retain a retryable deletion request before deleting its local blob. Shared-batch portions count all participating local profiles; individual backup/restore detaches batch identities and preserves portions already allocated elsewhere without exporting other members’ records. Do not present literal catalog search as model understanding. Keep testing isolated with sandbox=1 and clearly distinguish pure-state tests, browser interactions and physical-device acceptance.
