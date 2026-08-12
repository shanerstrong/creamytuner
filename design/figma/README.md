# Creamy Tuner Figma workflow

Figma is the visual source of truth for Creamy Tuner. The canonical file is [Creamy Tuner Design System](https://www.figma.com/design/tw9eZunEUfHO0HvFjqLqH9).

## Ownership model

- Figma owns visual intent: variables, type, spacing, components, states, layout, and canonical screen compositions.
- React Native owns behavior, data, navigation, accessibility semantics, and platform-specific implementation.
- `visual-qa.config.json` is the contract between them. It records routes, required states, Figma node IDs, code owners, viewport, and thresholds.
- `component-map.json` links library component node IDs to existing React Native exports. Native Figma Code Connect can replace this file when the Figma workspace is upgraded to an Organization or Enterprise plan.
- `baselines/` contains 1× PNG exports from Figma only. Never promote an app screenshot into this directory.

## Design-to-code loop

1. Change or approve the component/screen in Figma.
2. Export each canonical screen node at exactly 390×844 and 1× into `design/figma/baselines/<screen>.png`.
3. Run the matching app route and establish the state declared in `visual-qa.config.json`.
4. Capture a 390×844 screenshot into `design/figma/actual/<platform>/<screen>.png` or `.jpg`. The runner detects the encoded format from the file bytes, including browser captures returned as JPEG data.
5. Run `npm run visual:qa:ios` for the release gate, or `npm run visual:qa:web` for browser diagnostics.
6. Inspect `design/figma/results-<platform>.json` and the highlighted images in `design/figma/diffs/<platform>/`.
7. Fix shared primitives first, then screen-specific layout. Do not alter Figma simply to make a code defect pass.
8. Repeat capture → compare → fix until the pixel gate and every semantic check pass.

Use `--screens` to shorten an iteration:

```powershell
npm run visual:qa:ios -- --screens library,builder
```

The runner also accepts `--actual-dir`, `--baseline-dir`, and `--output-dir`.

## Acceptance criteria

- Canonical native viewport is 390×844 at 1×.
- iOS is the release gate: at most 1% mismatched pixels and no unexplained region larger than 2 px.
- Web is diagnostic: at most 3% mismatched pixels and no unexplained region larger than 3 px. Web results do not replace the iOS gate because browser fonts and safe areas render differently.
- No clipping, overlap, or off-screen controls.
- Text, icons, imagery, selected states, and navigation match the declared Figma screen state.
- Interactive controls retain accessible names.
- Primary action foreground contrast is at least 4.5:1.
- No unexpected runtime errors or warnings.

Dynamic content may be masked per screen and platform in `visual-qa.config.json`. Masks must be narrow and justified; they cannot hide stable layout or controls.

## Agent operating procedure

An agent should read `visual-qa.config.json`, capture every declared route/state, run the comparator, rank failures by shared component impact, fix the smallest owning component, and repeat. A run is complete only when the relevant pixel profile and automated contrast checks pass and the semantic checklist has been evaluated. Missing screenshots and dimension mismatches are hard failures.

On Windows, Expo Web can exercise the diagnostic loop. The release-grade iOS screenshots must be captured on a macOS simulator or physical iPhone because Windows cannot run the iOS simulator. CI should archive `results.json`, actual screenshots, and diffs for failed runs.
