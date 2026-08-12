# Creamy deterministic Blender pipeline

This folder builds one unbranded clear-pint Creamy model and derives every Welcome and tutorial visual from it. No downloaded models, textures, fonts, or paid add-ons are required.

## Requirements

- Blender 4.2 LTS or newer. Blender is free: <https://www.blender.org/download/>
- A Blender build with FFmpeg/H.264 enabled (standard Blender downloads include it).
- No Python packages outside Blender.

The checked-in configuration uses Cycles on the CPU for repeatable rendering and compatibility with older graphics drivers. It clears the startup scene and creates the model, materials, lighting, camera, facial poses, ingredients, and animation procedurally.

## Build everything

From the repository root on Windows PowerShell:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python design\mascot\build_creamy.py -- --render all
```

The Microsoft Store build exposes `blender-launcher.exe`; it accepts the same arguments.

On macOS or Linux:

```bash
blender --background --factory-startup --python design/mascot/build_creamy.py -- --render all
```

Optional arguments:

```text
--config <json>          Default: design/mascot/render_config.json
--output-dir <folder>   Default: design/mascot/output
--render all            Welcome videos, poster, and tutorial PNGs
--render welcome        Welcome videos and poster only
--render poster         Finished Welcome poster only
--render tutorial       Tutorial PNGs only
--render none           Build and save the .blend without rendering
--seed <integer>        Override the deterministic config seed
--tutorial-limit <N>    Render the first N tutorial states for a quick check
--no-save-blend         Do not write the generated .blend file
```

## Deterministic outputs

The default command writes:

```text
design/mascot/output/
├── creamy-master.blend
├── manifest.json
├── welcome/
│   ├── creamy-entrance.mp4   # 720×720, 3.2 seconds, 30 fps, H.264
│   ├── creamy-idle.mp4       # 720×720, 2.4 seconds, 30 fps, seamless loop
│   └── creamy-poster.png     # 720×720 finished still
└── tutorial/
    ├── 01-empty-bored-closed.png
    ├── 02-empty-bored-open.png
    ├── ...
    ├── 16-angry.png
    └── 17-full-blink.png     # 192×192 transparent RGBA PNGs
```

The Welcome entrance starts empty, brings ingredients in, pours/fills the pint, changes the complete face to happy, and finishes with a sparkle-and-tilt celebration. The separate idle file begins at the same finished pose and loops a restrained bob, depth turn, blink, glow, and sparkle cycle. App playback should play `creamy-entrance.mp4` once, switch to looping `creamy-idle.mp4`, and use `creamy-poster.png` for reduced motion or failed video playback.

Tutorial PNGs use one fixed camera and identical 192×192 bounds. Their canvas is genuinely transparent; glow and ingredient particles should be separate app layers so Creamy never acquires a navy square.

## Quality checks after rendering

1. Confirm both videos report 30 fps and the intended durations with `ffprobe`.
2. Loop `creamy-idle.mp4` several times and check that frame 72 returns cleanly to frame 1.
3. Open tutorial PNGs over white and checkerboard backgrounds; all four corners must have alpha `0`.
4. Flip rapidly through the tutorial states. The pint rim, eyes, cheeks, camera, and face center must not shift.
5. Keep `manifest.json` with copied assets so the app can validate dimensions and timing.

The generated `output/` directory is intentionally ignored. Copy approved renders into the app asset tree only after visual review.
