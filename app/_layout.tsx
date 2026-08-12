import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';

import { PersistentBottomNav } from '@/src/components/persistent-bottom-nav';
import { PersistenceProvider } from '@/src/providers/persistence-provider';
import { palette } from '@/src/theme';
import { configureFreezeNotifications } from '@/src/services/freeze-reminder';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => { configureFreezeNotifications(); }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <PersistenceProvider>
        <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: palette.ink, card: palette.navy, primary: palette.pink, text: palette.text, border: palette.border } }}>
          <View style={styles.shell}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink }, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="tutorial" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
              <Stack.Screen name="machines" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="builder" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="freeze-timer" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="program" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="troubleshoot" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="preferences" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="ingredient-new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="ingredient/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="recipe/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
            <PersistentBottomNav />
            <StatusBar style="light" />
          </View>
        </ThemeProvider>
      </PersistenceProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, shell: { flex: 1, backgroundColor: palette.ink } });
