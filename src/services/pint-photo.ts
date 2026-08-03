import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PintPhotoSource = 'camera' | 'library';

export async function choosePintPhoto(source: PintPhotoSource): Promise<string | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission is needed to take a pint photo.');
  }
  if (source === 'library' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo library permission is needed to choose a pint photo. You can enable it in Settings.');
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 0.75,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    return compressWebPhoto(asset);
  }

  const directory = new Directory(Paths.document, 'pint-photos');
  directory.create({ idempotent: true, intermediates: true });
  const extension = fileExtension(asset.fileName, asset.mimeType);
  const destination = new File(directory, `pint-${Date.now()}${extension}`);
  new File(asset.uri).copy(destination);
  return destination.uri;
}

async function compressWebPhoto(asset: ImagePicker.ImagePickerAsset) {
  const objectUrl = asset.file ? URL.createObjectURL(asset.file) : null;
  const source = objectUrl ?? asset.uri;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The selected photo could not be read.'));
      element.src = source;
    });
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const outputSize = Math.min(640, cropSize);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The selected photo could not be prepared.');
    context.drawImage(
      image,
      (image.naturalWidth - cropSize) / 2,
      (image.naturalHeight - cropSize) / 2,
      cropSize,
      cropSize,
      0,
      0,
      outputSize,
      outputSize,
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('The selected photo could not be compressed.')), 'image/jpeg', 0.72);
    });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The selected photo could not be saved.'));
      reader.onerror = () => reject(new Error('The selected photo could not be saved.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function fileExtension(fileName?: string | null, mimeType?: string | null) {
  const match = fileName?.match(/\.[a-z0-9]+$/i);
  if (match) return match[0].toLowerCase();
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}
