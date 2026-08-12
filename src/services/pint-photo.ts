import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

export type PintPhotoSource = 'camera' | 'library';
export type LocalPhotoKind = 'pint' | 'profile' | 'ingredient-label';

const explainedPhotoAccess = new Set<PintPhotoSource>();

export class PhotoPermissionError extends Error {
  constructor(message: string, public readonly canOpenSettings = true) {
    super(message);
    this.name = 'PhotoPermissionError';
  }
}

export async function choosePintPhoto(source: PintPhotoSource): Promise<string | null> {
  return chooseLocalPhoto(source, 'pint');
}

export async function chooseProfilePhoto(source: PintPhotoSource): Promise<string | null> {
  return chooseLocalPhoto(source, 'profile');
}

export async function chooseIngredientLabelPhoto(source: PintPhotoSource): Promise<string | null> {
  return chooseLocalPhoto(source, 'ingredient-label');
}

export async function chooseLocalPhoto(source: PintPhotoSource, kind: LocalPhotoKind): Promise<string | null> {
  await ensurePhotoPermission(source, kind);
  const pending = Platform.OS === 'android' ? await ImagePicker.getPendingResultAsync() : null;
  if (pending && 'code' in pending) throw new Error(pending.message || 'The selected photo could not be recovered.');
  const result = pending && 'canceled' in pending
    ? pending
    : source === 'camera'
      ? await ImagePicker.launchCameraAsync(kind === 'ingredient-label' ? labelPickerOptions : pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(kind === 'ingredient-label' ? labelPickerOptions : pickerOptions);
  if (result.canceled || !result.assets?.[0]) return null;
  return persistPhoto(result.assets[0], kind);
}

export async function recoverPendingPhoto(kind: LocalPhotoKind): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const pending = await ImagePicker.getPendingResultAsync();
  if (!pending) return null;
  if ('code' in pending) throw new Error(pending.message || 'The selected photo could not be recovered.');
  if (pending.canceled || !pending.assets?.[0]) return null;
  return persistPhoto(pending.assets[0], kind);
}

export function removeLocalPhoto(uri: string, kind: LocalPhotoKind) {
  if (!uri || Platform.OS === 'web' || uri.startsWith('data:')) return;
  const folderMarker = `/creamytuner-photos/${kind}/`;
  const legacyPintMarker = kind === 'pint' ? '/pint-photos/' : '';
  if (!uri.replace(/\\/g, '/').includes(folderMarker) && (!legacyPintMarker || !uri.replace(/\\/g, '/').includes(legacyPintMarker))) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing old local photo should never prevent the new selection from saving.
  }
}

export function openPhotoPermissionSettings() {
  return Linking.openSettings();
}

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: Platform.OS !== 'web',
  aspect: [1, 1],
  quality: 0.82,
};

const labelPickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 1,
  cameraType: ImagePicker.CameraType.back,
};

async function ensurePhotoPermission(source: PintPhotoSource, kind: LocalPhotoKind) {
  if (Platform.OS === 'web') {
    if (!explainedPhotoAccess.has(source)) {
      const subject = kind === 'profile' ? 'profile photo' : kind === 'ingredient-label' ? 'ingredient-label photo' : 'recipe photo';
      const approved = window.confirm(`Local photo access\n\nCreamy Tuner opens your browser's ${source === 'camera' ? 'camera' : 'file picker'} only when you choose this action. Your ${subject} stays in this browser unless you choose to share it.`);
      if (!approved) throw new PhotoPermissionError('Photo selection was canceled.', false);
      explainedPhotoAccess.add(source);
    }
    return;
  }

  const current = source === 'camera'
    ? await ImagePicker.getCameraPermissionsAsync()
    : await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return;

  // Expo's system photo picker grants access only to the item the user chooses,
  // so normal library selection does not need broad media-library permission.
  if (source === 'library') {
    if (!explainedPhotoAccess.has(source)) {
      const approved = await confirmPhotoAccess(source, kind);
      if (!approved) throw new PhotoPermissionError('Photo selection was canceled.', false);
      explainedPhotoAccess.add(source);
    }
    return;
  }

  if (!current.canAskAgain) {
    throw new PhotoPermissionError('Camera access is turned off. Open your device Settings to allow it.');
  }

  if (!explainedPhotoAccess.has(source)) {
    const approved = await confirmPhotoAccess(source, kind);
    if (!approved) throw new PhotoPermissionError('Photo selection was canceled.', false);
    explainedPhotoAccess.add(source);
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoPermissionError('Camera permission is needed for this action. You can enable it in Settings.', !permission.canAskAgain);
  }
}

function confirmPhotoAccess(source: PintPhotoSource, kind: LocalPhotoKind): Promise<boolean> {
  const title = source === 'camera' ? 'Camera access' : 'Photo library access';
  const subject = kind === 'profile' ? 'profile picture' : kind === 'ingredient-label' ? 'ingredient label' : 'finished pint photo';
  const message = source === 'camera'
    ? `Creamy Tuner uses your camera only when you choose to take a ${subject}. The photo stays on this device unless you choose to share it.`
    : `Creamy Tuner opens your photo library only when you choose a ${subject}. It does not upload or scan your photo library.`;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    Alert.alert(title, message, [
      { text: 'Not now', style: 'cancel', onPress: () => finish(false) },
      { text: 'Continue', onPress: () => finish(true) },
    ], { cancelable: true, onDismiss: () => finish(false) });
  });
}

async function persistPhoto(asset: ImagePicker.ImagePickerAsset, kind: LocalPhotoKind) {
  if (Platform.OS === 'web') return kind === 'ingredient-label' ? compressWebLabelPhoto(asset) : compressWebPhoto(asset);

  const context = ImageManipulator.manipulate(asset.uri);
  context.resize(kind === 'ingredient-label' ? { width: 1600 } : { width: 720, height: 720 });
  const rendered = await context.renderAsync();
  const prepared = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  const directory = new Directory(Paths.document, 'creamytuner-photos', kind);
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, `${kind}-${Date.now()}.jpg`);
  new File(prepared.uri).copy(destination);
  return destination.uri;
}

async function compressWebLabelPhoto(asset: ImagePicker.ImagePickerAsset) {
  const objectUrl = asset.file ? URL.createObjectURL(asset.file) : null;
  const source = objectUrl ?? asset.uri;
  try {
    const image = await loadWebImage(source);
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The label photo could not be prepared.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasToDataUrl(canvas, 0.88);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function loadWebImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('The selected photo could not be read.'));
    element.src = source;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('The selected photo could not be compressed.'));
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The selected photo could not be saved.'));
      reader.onerror = () => reject(new Error('The selected photo could not be saved.'));
      reader.readAsDataURL(blob);
    }, 'image/jpeg', quality);
  });
}

async function compressWebPhoto(asset: ImagePicker.ImagePickerAsset) {
  const objectUrl = asset.file ? URL.createObjectURL(asset.file) : null;
  const source = objectUrl ?? asset.uri;
  try {
    const image = await loadWebImage(source);
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const outputSize = Math.min(720, cropSize);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The selected photo could not be prepared.');
    context.drawImage(image, (image.naturalWidth - cropSize) / 2, (image.naturalHeight - cropSize) / 2, cropSize, cropSize, 0, 0, outputSize, outputSize);
    return await canvasToDataUrl(canvas, 0.78);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
