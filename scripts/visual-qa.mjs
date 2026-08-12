import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import jpeg from 'jpeg-js';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = process.cwd();
const configPath = path.join(root, 'design', 'figma', 'visual-qa.config.json');

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function applyMasks(image, masks = []) {
  for (const mask of masks) {
    const startX = Math.max(0, mask.x);
    const startY = Math.max(0, mask.y);
    const endX = Math.min(image.width, mask.x + mask.width);
    const endY = Math.min(image.height, mask.y + mask.height);

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        const offset = (image.width * y + x) * 4;
        image.data[offset] = 0;
        image.data[offset + 1] = 0;
        image.data[offset + 2] = 0;
        image.data[offset + 3] = 0;
      }
    }
  }
}

function meanAbsoluteError(baseline, actual) {
  let total = 0;
  const channels = baseline.width * baseline.height * 3;

  for (let offset = 0; offset < baseline.data.length; offset += 4) {
    total += Math.abs(baseline.data[offset] - actual.data[offset]);
    total += Math.abs(baseline.data[offset + 1] - actual.data[offset + 1]);
    total += Math.abs(baseline.data[offset + 2] - actual.data[offset + 2]);
  }

  return Number(((total / channels / 255) * 100).toFixed(3));
}

function relativeLuminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lightest = Math.max(foregroundLuminance, backgroundLuminance);
  const darkest = Math.min(foregroundLuminance, backgroundLuminance);
  return (lightest + 0.05) / (darkest + 0.05);
}

function largestDiffRegions(diff, limit = 5) {
  const { width, height, data } = diff;
  const visited = new Uint8Array(width * height);
  const regions = [];
  const isDiffPixel = (pixelIndex) => {
    const offset = pixelIndex * 4;
    return data[offset] === 255 && data[offset + 1] === 107 && data[offset + 2] === 131;
  };

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index] || !isDiffPixel(index)) continue;

    const queue = [index];
    visited[index] = 1;
    let cursor = 0;
    let pixelCount = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (cursor < queue.length) {
      const current = queue[cursor];
      cursor += 1;
      pixelCount += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (visited[next] || !isDiffPixel(next)) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
    }

    regions.push({
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixelCount,
    });
  }

  return regions.sort((a, b) => b.pixelCount - a.pixelCount).slice(0, limit);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readImage(filePath) {
  const bytes = await fs.readFile(filePath);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;

  if (isPng) return PNG.sync.read(bytes);
  if (isJpeg) return jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  throw new Error(`Unsupported image format: ${path.relative(root, filePath)}`);
}

async function findActualPath(directory, screenId) {
  for (const extension of ['png', 'jpg', 'jpeg']) {
    const candidate = path.join(directory, `${screenId}.${extension}`);
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const platform = readArgument('platform', 'ios');
const profile = config.profiles[platform];

if (!profile) {
  throw new Error(`Unknown platform profile "${platform}". Expected one of: ${Object.keys(config.profiles).join(', ')}`);
}

const baselineDir = path.resolve(root, readArgument('baseline-dir', 'design/figma/baselines'));
const actualDir = path.resolve(root, readArgument('actual-dir', `design/figma/actual/${platform}`));
const outputDir = path.resolve(root, readArgument('output-dir', `design/figma/diffs/${platform}`));
const requestedScreens = readArgument('screens', '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const screens = requestedScreens.length
  ? config.screens.filter((screen) => requestedScreens.includes(screen.id))
  : config.screens;

if (requestedScreens.length && screens.length !== requestedScreens.length) {
  const found = new Set(screens.map((screen) => screen.id));
  const unknown = requestedScreens.filter((screen) => !found.has(screen));
  throw new Error(`Unknown screen id(s): ${unknown.join(', ')}`);
}

await fs.mkdir(outputDir, { recursive: true });

const results = [];
for (const screen of screens) {
  const baselinePath = path.join(baselineDir, `${screen.id}.png`);
  const actualPath = await findActualPath(actualDir, screen.id);
  const diffPath = path.join(outputDir, `${screen.id}.png`);

  if (!(await fileExists(baselinePath)) || !actualPath) {
    results.push({
      id: screen.id,
      status: 'missing',
      baseline: await fileExists(baselinePath),
      actual: Boolean(actualPath),
    });
    continue;
  }

  const baseline = await readImage(baselinePath);
  const actual = await readImage(actualPath);

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    results.push({
      id: screen.id,
      status: 'dimension-mismatch',
      baseline: `${baseline.width}x${baseline.height}`,
      actual: `${actual.width}x${actual.height}`,
    });
    continue;
  }

  const masks = config.masks?.[screen.id]?.[platform] ?? [];
  applyMasks(baseline, masks);
  applyMasks(actual, masks);

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    {
      threshold: profile.pixelThreshold,
      includeAA: profile.includeAntialiasing,
      diffColor: [255, 107, 131],
      aaColor: [174, 134, 255],
    },
  );
  const mismatchPercent = Number(((diffPixels / (baseline.width * baseline.height)) * 100).toFixed(3));
  const pass = mismatchPercent <= profile.maxMismatchPercent;

  await fs.writeFile(diffPath, PNG.sync.write(diff));
  results.push({
    id: screen.id,
    status: pass ? 'pass' : 'fail',
    mismatchPercent,
    meanAbsoluteErrorPercent: meanAbsoluteError(baseline, actual),
    maxMismatchPercent: profile.maxMismatchPercent,
    largestDiffRegions: largestDiffRegions(diff),
    diffPath: path.relative(root, diffPath).replaceAll('\\', '/'),
  });
}

const contrastResults = (config.acceptance?.contrastChecks ?? []).map((check) => {
  const ratio = contrastRatio(check.foreground, check.background);
  return {
    ...check,
    ratio: Number(ratio.toFixed(2)),
    status: ratio >= check.minimumRatio ? 'pass' : 'fail',
  };
});
const screenPassed = results.filter((result) => result.status === 'pass').length;
const screenFailed = results.filter((result) => result.status !== 'pass').length;
const contrastFailed = contrastResults.filter((result) => result.status !== 'pass').length;

const summary = {
  generatedAt: new Date().toISOString(),
  platform,
  releaseGate: profile.releaseGate,
  figmaFileKey: config.figma.fileKey,
  viewport: config.figma.canonicalViewport,
  screenPassed,
  screenFailed,
  contrastFailed,
  results,
  contrastResults,
};

const resultsPath = path.join(root, 'design', 'figma', `results-${platform}.json`);
await fs.writeFile(resultsPath, `${JSON.stringify(summary, null, 2)}\n`);

console.table(results.map(({ id, status, mismatchPercent, meanAbsoluteErrorPercent }) => ({
  screen: id,
  status,
  mismatch: mismatchPercent == null ? 'n/a' : `${mismatchPercent}%`,
  meanError: meanAbsoluteErrorPercent == null ? 'n/a' : `${meanAbsoluteErrorPercent}%`,
})));
console.table(contrastResults.map(({ id, status, ratio, minimumRatio }) => ({
  contrast: id,
  status,
  ratio,
  minimum: minimumRatio,
})));
console.log(`\nScreens: ${screenPassed} passed, ${screenFailed} failed. Contrast: ${contrastResults.length - contrastFailed} passed, ${contrastFailed} failed (${platform}${profile.releaseGate ? ', release gate' : ', diagnostic only'}).`);
console.log(`Results: ${path.relative(root, resultsPath)}`);

if (screenFailed + contrastFailed > 0) process.exitCode = 1;
