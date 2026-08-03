import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PintPhotoSource = 'camera' | 'library';

export async function choosePintPhoto(source: PintPhotoSource): Promise<string | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission is needed to take a pint photo.');
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 0.75,
    base64: Platform.OS === 'web',
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    return asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
  }

  const directory = new Directory(Paths.document, 'pint-photos');
  directory.create({ idempotent: true, intermediates: true });
  const extension = fileExtension(asset.fileName, asset.mimeType);
  const destination = new File(directory, `pint-${Date.now()}${extension}`);
  new File(asset.uri).copy(destination);
  return destination.uri;
}

function fileExtension(fileName?: string | null, mimeType?: string | null) {
  const match = fileName?.match(/\.[a-z0-9]+$/i);
  if (match) return match[0].toLowerCase();
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}
