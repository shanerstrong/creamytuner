export const labelOcrAvailable = false;

export async function recognizeLabelPhoto(_uri: string): Promise<string> {
  throw new Error('Automatic label reading is available in the installed iOS and Android beta.');
}
