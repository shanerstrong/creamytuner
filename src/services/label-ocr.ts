// Platform builds resolve label-ocr.native.ts or label-ocr.web.ts first.
// This fallback also gives TypeScript a platform-neutral module shape.
export const labelOcrAvailable = false;

export async function recognizeLabelPhoto(_uri: string): Promise<string> {
  throw new Error('Automatic label reading requires the installed iOS or Android beta.');
}
