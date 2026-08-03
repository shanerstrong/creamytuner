import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/src/components/ui';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';

const destinations: { id: string; label: string; href: string; icon: IconName; activeIcon: IconName }[] = [
  { id: 'home', label: 'Home', href: '/(tabs)/home', icon: 'home-variant-outline', activeIcon: 'home-variant' },
  { id: 'recipes', label: 'Recipes', href: '/(tabs)/recipes', icon: 'silverware-fork-knife', activeIcon: 'silverware-fork-knife' },
  { id: 'library', label: 'Library', href: '/(tabs)/library', icon: 'bookshelf', activeIcon: 'bookshelf' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: 'cog-outline', activeIcon: 'cog' },
  { id: 'profile', label: 'Profile', href: '/(tabs)/profile', icon: 'account-outline', activeIcon: 'account' },
];

function activeDestination(pathname: string) {
  if (/^\/recipe(?:s|\/)/.test(pathname)) return 'recipes';
  if (/^\/ingredient(?:-new|\/)|^\/library/.test(pathname)) return 'library';
  if (/^\/(?:settings|machines)/.test(pathname)) return 'settings';
  if (/^\/profile/.test(pathname)) return 'profile';
  return 'home';
}

export function PersistentBottomNav() {
  const pathname = usePathname();
  const { ready, settings } = useApp();
  if (!ready || !settings.onboarded || settings.onboardingVersion < CURRENT_ONBOARDING_VERSION) return null;
  const active = activeDestination(pathname);
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.bar} accessibilityRole="tablist">
        {destinations.map((destination) => {
          const selected = active === destination.id;
          return (
            <Pressable key={destination.id} onPress={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync(); router.replace(destination.href as never); }} style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={destination.label}>
              <Icon name={selected ? destination.activeIcon : destination.icon} size={23} color={selected ? palette.pink : palette.textFaint} />
              <Text style={[styles.label, selected && styles.labelSelected]}>{destination.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#0C132A', borderTopWidth: 1, borderTopColor: palette.border },
  bar: { minHeight: 70, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: spacing.xxs, paddingTop: spacing.xxs },
  tab: { flex: 1, minHeight: 60, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12 },
  tabSelected: { backgroundColor: 'rgba(241,78,155,0.08)' },
  pressed: { opacity: 0.7 },
  label: { color: palette.textFaint, fontSize: 13, lineHeight: 17, fontWeight: '800', textAlign: 'center' },
  labelSelected: { color: palette.pink },
});
