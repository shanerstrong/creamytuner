import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PersistenceProvider } from '@/src/providers/persistence-provider';
import { palette } from '@/src/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <PersistenceProvider>
        <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: palette.ink, card: palette.navy, primary: palette.pink, text: palette.text, border: palette.border } }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink }, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="machines" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="builder" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="program" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="troubleshoot" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ingredient-new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ingredient/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="recipe/[id]" options={{ animation: 'slide_from_right' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
    </PersistenceProvider>
  );
}
