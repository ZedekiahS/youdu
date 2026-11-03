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
