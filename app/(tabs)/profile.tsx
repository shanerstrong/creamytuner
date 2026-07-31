import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, GlassCard, Icon, LogoMark, Screen } from '@/src/components/ui';
import { machineById } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';

const links = [
  { icon: 'cog-outline' as const, label: 'Settings', subtitle: 'Units, export, and local data', route: '/settings' as const },
  { icon: 'ice-cream' as const, label: 'Default Machine', subtitle: 'Choose your active model', route: '/machines' as const },
  { icon: 'help-circle-outline' as const, label: 'Texture Help', subtitle: 'Troubleshoot a pint', route: '/troubleshoot' as const },
];

export default function ProfileScreen() {
  const { recipes, settings } = useApp();
  const machine = machineById(settings.machineId);
  return (
    <Screen>
      <AppHeader title="Profile" />
      <View style={styles.hero}>
        <LogoMark size={72} />
        <Text style={styles.title}>Your Pint Lab</Text>
        <Text style={styles.subtitle}>Private, offline, and tuned to {machine.shortName}</Text>
      </View>
      <View style={styles.stats}>
        <GlassCard style={styles.stat}><Text style={styles.statValue}>{recipes.length}</Text><Text style={styles.statLabel}>Recipes</Text></GlassCard>
        <GlassCard style={styles.stat}><Text style={styles.statValue}>{recipes.filter((recipe) => recipe.favorite).length}</Text><Text style={styles.statLabel}>Favorites</Text></GlassCard>
        <GlassCard style={styles.stat}><Text style={styles.statValue}>{machine.capacityMl}</Text><Text style={styles.statLabel}>ml capacity</Text></GlassCard>
      </View>
      <View style={styles.links}>
        {links.map((link) => (
          <GlassCard key={link.label} onPress={() => router.push(link.route)} accessibilityLabel={link.label} style={styles.link}>
            <Icon name={link.icon} color={palette.lavender} />
            <View style={styles.linkCopy}><Text style={styles.linkTitle}>{link.label}</Text><Text style={styles.linkSubtitle}>{link.subtitle}</Text></View>
            <Icon name="chevron-right" color={palette.textFaint} />
          </GlassCard>
        ))}
      </View>
      <Text style={styles.version}>CreamyTuner Private Beta · v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  title: { color: palette.text, fontSize: 23, fontWeight: '900' },
  subtitle: { color: palette.textMuted, fontSize: 13, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.md },
  stat: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statValue: { color: palette.text, fontSize: 21, fontWeight: '900' },
  statLabel: { color: palette.textMuted, fontSize: 10, marginTop: 3 },
  links: { gap: spacing.xs, marginTop: spacing.sm },
  link: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  linkCopy: { flex: 1 },
  linkTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  linkSubtitle: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  version: { color: palette.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing.xl },
});
