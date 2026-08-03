import { router } from 'expo-router';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader, GlassCard, Icon, IconButton, Screen, type IconName } from '@/src/components/ui';
import { machineById } from '@/src/data/machines';
import { isFreezeTimerReady } from '@/src/domain/freeze-timer';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';
import { cancelFreezeReminder, scheduleFreezeReminder } from '@/src/services/freeze-reminder';
import { tutorialDraftSchema } from '@/src/types';

export default function SettingsScreen() {
  const { settings, updateSettings, exportData, resetData } = useApp();
  const machine = machineById(settings.machineId);
  const confirmReset = () => Alert.alert('Reset Creamy Tuner?', 'Custom recipes, ingredients, and spin history will be removed. Starter content will be restored.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: async () => { await cancelFreezeReminder(settings.activeFreezeTimer?.notificationId); await resetData(); router.replace('/'); } },
  ]);
  const changeFreezeNotifications = async (notifications: boolean) => {
    if (!notifications && settings.activeFreezeTimer?.notificationId) {
      await cancelFreezeReminder(settings.activeFreezeTimer.notificationId);
      await updateSettings({ notifications, activeFreezeTimer: { ...settings.activeFreezeTimer, notificationId: undefined, notificationScheduled: false } });
      return;
    }
    if (notifications && settings.activeFreezeTimer && !isFreezeTimerReady(settings.activeFreezeTimer)) {
      try {
        const reminder = await scheduleFreezeReminder(settings.activeFreezeTimer);
        await updateSettings({
          notifications: reminder.scheduled,
          activeFreezeTimer: {
            ...settings.activeFreezeTimer,
            notificationId: reminder.notificationId,
            notificationScheduled: reminder.scheduled,
          },
        });
      } catch {
        await updateSettings({ notifications: false });
      }
      return;
    }
    await updateSettings({ notifications });
  };
  const replayTutorial = async () => {
    await updateSettings({
      onboarded: false,
      onboardingVersion: CURRENT_ONBOARDING_VERSION - 1,
      tutorialDraft: tutorialDraftSchema.parse({ machineId: settings.machineId, flowVersion: CURRENT_ONBOARDING_VERSION }),
    });
    router.replace('/');
  };
  return (
    <Screen>
      <AppHeader title="Settings" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <View style={styles.list}>
        <GlassCard style={styles.row}>
          <Icon name="school-outline" color={palette.cyan} />
          <View style={styles.copy}><Text style={styles.title}>Tutorial Mode</Text><Text style={styles.subtitle}>Show step-by-step help, fill guidance, and timer tips</Text></View>
          <Switch value={settings.tutorialMode} onValueChange={(tutorialMode) => updateSettings({ tutorialMode })} trackColor={{ false: palette.panelRaised, true: palette.cyan }} thumbColor={palette.white} accessibilityLabel="Toggle beginner guidance" />
        </GlassCard>
        <SettingRow icon="play-circle-outline" title="Replay first-pint tutorial" value="Walk through every step again" onPress={() => { void replayTutorial(); }} />
        <SettingRow icon="tune-vertical" title="Advanced builder" value="Start with full ingredient controls" onPress={() => router.push('/builder?advanced=1')} />
        <SettingRow icon="ruler-square" title="Unit system" value={settings.units === 'metric' ? 'Metric (g, ml)' : 'US (oz, fl oz)'} onPress={() => updateSettings({ units: settings.units === 'metric' ? 'us' : 'metric' })} />
        <SettingRow icon="format-list-numbered" title="Measurement style" value={settings.measurementMode === 'kitchen' ? 'Kitchen-friendly (cups, tbsp, tsp)' : 'Exact amounts'} onPress={() => updateSettings({ measurementMode: settings.measurementMode === 'kitchen' ? 'exact' : 'kitchen' })} />
        <SettingRow icon="ice-cream" title="Default Machine" value={machine.shortName} onPress={() => router.push('/machines')} />
        <SettingRow icon="weather-night" title="Dark Mode" value="Always on in beta" />
        <GlassCard style={styles.row}>
          <Icon name="bell-outline" color={palette.textMuted} />
          <View style={styles.copy}><Text style={styles.title}>Freeze notifications</Text><Text style={styles.subtitle}>Enabled after you approve a freeze timer notification</Text></View>
          <Switch value={settings.notifications} onValueChange={(value) => { void changeFreezeNotifications(value); }} trackColor={{ false: palette.panelRaised, true: palette.cyan }} thumbColor={palette.white} accessibilityLabel="Toggle freeze notifications" />
        </GlassCard>
        <SettingRow icon="export-variant" title="Export Local Data" value="JSON backup" onPress={exportData} />
      </View>
      <Text style={styles.section}>ABOUT</Text>
      <View style={styles.list}>
        <SettingRow icon="information-outline" title="About Creamy Tuner" value="Version 1.0.0 beta" />
        <SettingRow icon="shield-lock-outline" title="Privacy" value="No account · no cloud" />
        <SettingRow icon="alert-circle-outline" title="Nutrition" value="Informational estimates" />
      </View>
      <GlassCard onPress={confirmReset} accessibilityLabel="Reset local data" style={styles.reset}><Icon name="delete-outline" color={palette.danger} /><Text style={styles.resetText}>Reset Local Data</Text></GlassCard>
      <Text style={styles.disclaimer}>Creamy Tuner is independent and unaffiliated with SharkNinja. Always follow your machine’s official owner’s guide and ingredient labels.</Text>
    </Screen>
  );
}

function SettingRow({ icon, title, value, onPress }: { icon: IconName; title: string; value: string; onPress?: () => void | Promise<void> }) {
  return (
    <GlassCard style={styles.row} onPress={onPress ? () => { void onPress(); } : undefined} accessibilityLabel={onPress ? title : undefined}>
      <Icon name={icon} color={palette.textMuted} />
      <View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{value}</Text></View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: { minHeight: 62, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1 },
  title: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 3 },
  section: { color: palette.textFaint, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.xs },
  reset: { minHeight: 54, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderColor: 'rgba(255,107,131,0.5)', marginTop: spacing.lg },
  resetText: { color: palette.danger, fontSize: 16, fontWeight: '800' },
  disclaimer: { color: palette.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.lg },
});
