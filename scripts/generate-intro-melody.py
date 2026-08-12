"""Generate CreamyTuner's original five-second intro chime."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44_100
DURATION_SECONDS = 5.0
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "audio" / "creamytuner-intro.wav"


def midi_frequency(note: int) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def bell(sample_time: float, start: float, duration: float, note: int, volume: float) -> float:
    local_time = sample_time - start
    if local_time < 0 or local_time >= duration:
        return 0.0
    attack = min(1.0, local_time / 0.018)
    release = math.exp(-4.2 * local_time / duration)
    tail = min(1.0, (duration - local_time) / 0.11)
    frequency = midi_frequency(note)
    shimmer = (
        math.sin(2 * math.pi * frequency * local_time)
        + 0.34 * math.sin(2 * math.pi * frequency * 2.01 * local_time + 0.2)
        + 0.14 * math.sin(2 * math.pi * frequency * 3.98 * local_time + 0.55)
    )
    return volume * attack * release * tail * shimmer


def pad(sample_time: float, start: float, duration: float, notes: tuple[int, ...], volume: float) -> float:
    local_time = sample_time - start
    if local_time < 0 or local_time >= duration:
        return 0.0
    attack = min(1.0, local_time / 0.22)
    release = min(1.0, (duration - local_time) / 0.36)
    movement = 0.86 + 0.14 * math.sin(2 * math.pi * 0.7 * local_time)
    return volume * attack * release * movement * sum(
        math.sin(2 * math.pi * midi_frequency(note) * local_time + index * 0.28)
        for index, note in enumerate(notes)
    ) / len(notes)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    notes = [
        (0.00, 0.72, 65, 0.54),  # F5
        (0.42, 0.72, 69, 0.52),  # A5
        (0.84, 0.88, 72, 0.56),  # C6
        (1.42, 0.62, 69, 0.40),
        (1.78, 0.90, 74, 0.55),  # D6
        (2.28, 0.82, 72, 0.48),
        (2.76, 0.74, 67, 0.43),  # G5
        (3.16, 0.84, 69, 0.48),
        (3.68, 1.28, 72, 0.50),
        (3.72, 1.24, 77, 0.38),  # final F6 sparkle
    ]
    frames: list[float] = []
    for index in range(int(SAMPLE_RATE * DURATION_SECONDS)):
        time = index / SAMPLE_RATE
        value = pad(time, 0.0, 2.45, (53, 57, 60), 0.12)
        value += pad(time, 2.25, 2.75, (50, 53, 57), 0.11)
        for start, duration, note, volume in notes:
            value += bell(time, start, duration, note, volume)
        fade = min(1.0, time / 0.025, (DURATION_SECONDS - time) / 0.16)
        frames.append(value * max(0.0, fade))

    peak = max(abs(value) for value in frames) or 1.0
    gain = 0.84 / peak
    pcm = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, value * gain)) * 32_767)) for value in frames)
    with wave.open(str(OUTPUT), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)

    print(f"Wrote {OUTPUT} ({DURATION_SECONDS:.1f}s, {SAMPLE_RATE} Hz mono PCM)")


if __name__ == "__main__":
    main()
