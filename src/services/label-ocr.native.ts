import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';

export const labelOcrAvailable = true;

export async function recognizeLabelPhoto(uri: string) {
  const result = await recognizeText(uri);
  return result.text;
}
