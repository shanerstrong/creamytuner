# Creamy Tuner

Creamy Tuner is an offline-first Expo app for building, saving, and spinning frozen-dessert recipes. The local MVP runs on iOS and Android from one TypeScript codebase and uses deterministic recipe guidance—no account, cloud service, analytics, subscription, or generative AI is required.

Live web demo: <https://shanerstrong.github.io/creamytuner/>

## What is included

- First-run onboarding and machine selection
- Six machine entries normalized into shared internal families
- Guided recipe builder with capacity and composition checks
- Ingredient library plus custom label-nutrition ingredients
- Per-recipe nutrition totals and metric/US display conversion
- Deterministic machine-program recommendations with explanations
- Saved recipes, search, filters, favorites, editing, duplication, and deletion
- Preparation checklist, spin progression, evaluation, and texture troubleshooting
- SQLite persistence with versioned migrations and bundled seed data
- Local JSON export on iOS/Android and a destructive reset confirmation
- Responsive dark UI for phones, with a centered maximum width on larger screens

## Run locally

Prerequisites: Node.js 20+ and npm.

```powershell
npm install
npm start
```

Use the Expo terminal shortcuts to open Android, iOS, or web. A development build is preferred for device-level SQLite validation; Expo Go is suitable for a quick UI pass on SDK 54.

Useful checks:

```powershell
npm run validate
npx expo export --platform android --output-dir dist
npx expo export --platform web --output-dir web-dist
```

## Private beta builds

`eas.json` contains an internal `preview` profile. The first EAS run will ask you to sign in, link or create an Expo project, and configure signing credentials.

```powershell
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

- Android preview output is configured as an installable APK.
- iOS internal distribution requires an Apple Developer account, signing credentials, and registered test devices.
- Replace `com.creamytuner.app` with the final reserved bundle/package identifiers before public release if needed.

## Architecture

- `app/` — Expo Router screens and navigation
- `src/components/` — shared responsive UI and visual system
- `src/data/` — bundled ingredients, recipes, machines, and program mappings
- `src/domain/` — nutrition, quantity, capacity, validation, generation, and recommendation rules
- `src/db/` — SQLite migrations and typed repositories
- `src/providers/` — application state, persistence actions, export, and reset
- `src/types.ts` — Zod-validated domain models
- `__tests__/` — unit and component coverage

SQLite is the source of truth. Ingredient nutrition is stored per label reference quantity, all canonical recipe amounts are metric, and US units are calculated for display only.

The public GitHub Pages demo uses browser-local storage because GitHub Pages cannot provide the cross-origin headers required by Expo SQLite on web. Native iOS and Android builds continue to use SQLite.

## Product and safety notes

Creamy Tuner provides informational estimates and recipe guidance, not nutritional, medical, or equipment-safety guarantees. Users should verify ingredient labels, allergies, fill lines, programs, and operating instructions for their exact machine.

Ninja, CREAMi, and model names are used descriptively. Creamy Tuner is independent and is not affiliated with or endorsed by SharkNinja.

The Creamy Tuner name had no exact match in preliminary US Apple/Google Play searches when this MVP was started. Trademark clearance and store-name reservation are still required before public launch.
