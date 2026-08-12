import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const welcomeHero = path.join(root, 'assets', 'images', 'mascot', 'welcome-hero-v4.png');
const tutorial = path.join(root, 'assets', 'images', 'mascot', 'rendered', 'tutorial');

function pngMetadata(file: string) {
  const bytes = readFileSync(file);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

describe('rendered Creamy assets', () => {
  test('ships the generated high-resolution Welcome hero', () => {
    expect(existsSync(welcomeHero)).toBe(true);
    expect(statSync(welcomeHero).size).toBeGreaterThan(1_000_000);
    const metadata = pngMetadata(welcomeHero);
    expect(metadata.width).toBeGreaterThanOrEqual(800);
    expect(metadata.height).toBeGreaterThanOrEqual(1200);
  });

  test('keeps every tutorial frame aligned and RGBA-capable', () => {
    const names = [
      '01-empty-bored-closed.png', '02-empty-bored-open.png', '03-fill-25-happy-closed.png',
      '04-fill-25-happy-open.png', '05-fill-50-happy-closed.png', '06-fill-50-happy-open.png',
      '07-fill-75-happy-closed.png', '08-fill-75-happy-open.png', '09-near-full-concerned-closed.png',
      '10-near-full-concerned-open.png', '11-full-happy-closed.png', '12-full-happy-open.png',
      '13-overflow-frightened-closed.png', '14-overflow-frightened-open.png', '15-celebration.png',
      '16-angry.png', '17-full-blink.png',
    ];
    for (const name of names) expect(pngMetadata(path.join(tutorial, name))).toEqual({ width: 192, height: 192, colorType: 6 });
  });
});
