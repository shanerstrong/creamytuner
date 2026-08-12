import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import { useApp } from '@/src/providers/app-provider';
import { chooseProfilePhoto } from '@/src/services/pint-photo';
import { userSettingsSchema } from '@/src/types';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, usePathname: () => '/profile' }));
jest.mock('@/src/providers/app-provider', () => ({ useApp: jest.fn() }));
jest.mock('@/src/services/pint-photo', () => ({
  PhotoPermissionError: class PhotoPermissionError extends Error {
    canOpenSettings = false;
  },
  chooseProfilePhoto: jest.fn(),
  openPhotoPermissionSettings: jest.fn(),
  recoverPendingPhoto: jest.fn().mockResolvedValue(null),
  removeLocalPhoto: jest.fn(),
}));

const mockedUseApp = useApp as jest.MockedFunction<typeof useApp>;
const mockedChooseProfilePhoto = chooseProfilePhoto as jest.MockedFunction<typeof chooseProfilePhoto>;

describe('editable local profile', () => {
  const updateSettings = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApp.mockReturnValue({
      recipes: [],
      customIngredients: [],
      ingredients: [],
      settings: userSettingsSchema.parse({ profileDisplayName: 'Alex' }),
      ready: true,
      saveRecipe: jest.fn(),
      deleteRecipe: jest.fn(),
      duplicateRecipe: jest.fn(),
      toggleFavorite: jest.fn(),
      addCustomIngredient: jest.fn(),
      updateSettings,
      startSpinSession: jest.fn(),
      exportData: jest.fn(),
      resetData: jest.fn(),
    });
  });

  test('edits and saves the local display name', async () => {
    const screen = await render(<ProfileScreen />);
    await fireEvent.press(screen.getByLabelText('Edit display name, currently Alex'));
    const input = await screen.findByLabelText('Profile display name');
    await fireEvent.changeText(input, '  Taylor  ');
    expect(screen.getByLabelText('Profile display name').props.value).toBe('  Taylor  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ profileDisplayName: 'Taylor' }));
    expect(screen.getByText(/Name and photo stay on this device/)).toBeTruthy();
  });

  test('chooses and stores a profile photo without uploading it', async () => {
    mockedChooseProfilePhoto.mockResolvedValue('file:///profile-new.jpg');
    const screen = await render(<ProfileScreen />);
    await fireEvent.press(screen.getByLabelText('Add profile photo'));
    const chooseButton = await screen.findByLabelText('Choose profile photo from library');
    await fireEvent.press(chooseButton);
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ profilePhotoUri: 'file:///profile-new.jpg' }));
    expect(mockedChooseProfilePhoto).toHaveBeenCalledWith('library');
  });
});
