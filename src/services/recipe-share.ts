import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Recipe } from '@/src/types';

export type RecipeShareResult = 'shared' | 'downloaded' | 'cancelled';

type ShareRecipeImageOptions = {
  recipe: Recipe;
  imageUri?: string;
  captureNative: () => Promise<string | undefined>;
  webMode?: 'share-or-download' | 'download';
};

export async function shareRecipeImage({ recipe, imageUri, captureNative, webMode = 'share-or-download' }: ShareRecipeImageOptions): Promise<RecipeShareResult> {
  if (Platform.OS === 'web') return shareRecipeImageOnWeb(recipe, imageUri, webMode);

  const uri = await captureNative();
  if (!uri) throw new Error('The recipe image could not be created. Please try again.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('The share sheet is not available on this device.');
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: `Share ${recipe.name}`,
  });
  return 'shared';
}

async function shareRecipeImageOnWeb(recipe: Recipe, imageUri: string | undefined, mode: 'share-or-download' | 'download'): Promise<RecipeShareResult> {
  const blob = await createRecipeCardBlob(recipe, imageUri);
  const filename = `${safeFilename(recipe.name)}-creamytuner.png`;
  const file = new File([blob], filename, { type: 'image/png' });
  const shareData = {
    files: [file],
    title: recipe.name,
    text: `My ${recipe.name} recipe from Creamy Tuner`,
  };

  if (mode !== 'download' && typeof navigator.share === 'function' && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Browsers can expose file sharing but reject it for a specific target.
      // Downloading the prepared image keeps the action useful.
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }
}

async function createRecipeCardBlob(recipe: Recipe, imageUri?: string): Promise<Blob> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create the recipe image.');

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#090D20');
  background.addColorStop(0.55, '#101936');
  background.addColorStop(1, '#25143A');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  if (imageUri) {
    try {
      const image = await loadImage(imageUri);
      drawImageCover(context, image, 0, 0, width, 650);
    } catch {
      drawDessertFallback(context, width, 650);
    }
  } else {
    drawDessertFallback(context, width, 650);
  }

  const photoFade = context.createLinearGradient(0, 250, 0, 650);
  photoFade.addColorStop(0, 'rgba(9,13,32,0)');
  photoFade.addColorStop(1, 'rgba(9,13,32,0.98)');
  context.fillStyle = photoFade;
  context.fillRect(0, 240, width, 420);

  context.fillStyle = '#F14E9B';
  context.font = '900 34px system-ui, sans-serif';
  context.fillText('CREAMY TUNER', 70, 500);
  context.fillStyle = '#FFFFFF';
  context.font = '900 66px system-ui, sans-serif';
  drawWrappedText(context, recipe.name, 70, 565, 930, 76, 2);

  context.fillStyle = '#0B1128';
  roundedRect(context, 50, 680, 980, 440, 36);
  context.fill();

  context.fillStyle = '#FFFFFF';
  context.font = '900 104px system-ui, sans-serif';
  context.fillText(String(Math.round(recipe.nutrition.calories)), 85, 815);
  context.fillStyle = '#4ED9E8';
  context.font = '900 26px system-ui, sans-serif';
  context.fillText('CALORIES · ONE PINT', 85, 858);

  context.strokeStyle = 'rgba(151,170,224,0.25)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(85, 895);
  context.lineTo(995, 895);
  context.stroke();

  const macros = [
    ['Protein', recipe.nutrition.protein],
    ['Carbs', recipe.nutrition.carbs],
    ['Fat', recipe.nutrition.fat],
    ['Fiber', recipe.nutrition.fiber],
  ] as const;
  macros.forEach(([label, value], index) => {
    const x = 85 + index * 228;
    context.fillStyle = '#FFFFFF';
    context.font = '900 42px system-ui, sans-serif';
    context.fillText(`${Number(value).toFixed(1)}g`, x, 974);
    context.fillStyle = '#AEB9D9';
    context.font = '700 25px system-ui, sans-serif';
    context.fillText(label, x, 1014);
  });

  context.fillStyle = '#AEB9D9';
  context.font = '700 24px system-ui, sans-serif';
  context.fillText(`Sugars ${Number(recipe.nutrition.sugar).toFixed(1)}g · Added sugars ${Number(recipe.nutrition.addedSugar ?? 0).toFixed(1)}g`, 85, 1080);

  context.textAlign = 'center';
  context.fillStyle = '#C89BFF';
  context.font = '900 31px system-ui, sans-serif';
  context.fillText('Instagram @shaner.strong', width / 2, 1200);
  context.fillText('Everywhere else @shanerstrong', width / 2, 1245);
  context.fillStyle = '#7F8BAE';
  context.font = '600 21px system-ui, sans-serif';
  context.fillText('Estimated nutrition · Creamy Tuner', width / 2, 1300);
  context.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The recipe image could not be prepared.')), 'image/png', 0.95);
  });
}

function loadImage(uri: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Recipe photo could not be loaded.'));
    image.src = uri;
  });
}

function drawImageCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawDessertFallback(context: CanvasRenderingContext2D, width: number, height: number) {
  const glow = context.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width / 2);
  glow.addColorStop(0, '#F14E9B');
  glow.addColorStop(0.45, '#7449B9');
  glow.addColorStop(1, '#101936');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(255,255,255,0.16)';
  context.beginPath();
  context.ellipse(width / 2, 330, 280, 205, 0, 0, Math.PI * 2);
  context.fill();
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/);
  let line = '';
  let lineIndex = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
      if (lineIndex >= maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line && lineIndex < maxLines) context.fillText(line, x, y + lineIndex * lineHeight);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function safeFilename(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
}
