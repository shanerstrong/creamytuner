import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, Screen, textStyles } from '@/src/components/ui';
import { machines } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

export default function MachineSelectionScreen() {
  const params = useLocalSearchParams<{ first?: string }>();
  const { ready, settings, updateSettings } = useApp();
  const [selected, setSelected] = useState(settings.machineId);
  const firstRun = params.first === '1';

  useEffect(() => {
    if (ready) setSelected(settings.machineId);
  }, [ready, settings.machineId]);

  const continueFlow = async () => {
    await updateSettings({ machineId: selected, onboarded: true });
    router.replace('/(tabs)/home');
  };

  if (!ready) return <LoadingScreen />;

  return (
    <Screen>
      <AppHeader title="Select Your Machine" subtitle="Choose your Ninja CREAMi model" left={!firstRun ? <IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} /> : undefined} />
      <View style={styles.grid}>
        {machines.map((machine) => {
          const active = machine.id === selected;
          return (
            <GlassCard key={machine.id} onPress={() => setSelected(machine.id)} accessibilityLabel={`Select ${machine.name}`} style={[styles.machine, active && styles.machineActive]}>
              {active ? <View style={styles.selected}><Icon name="check" size={15} /></View> : null}
              <View style={[styles.machineArt, active && styles.machineArtActive]}>
                <Icon name={machine.familyId === 'nc700' ? 'ice-cream' : 'cup'} size={42} color={active ? palette.pink : palette.textMuted} />
              </View>
              <Text style={styles.machineName}>{machine.shortName}</Text>
              <Text style={styles.machineSubtitle}>{machine.subtitle}</Text>
              {machine.isLegacy ? <Text style={styles.legacy}>Legacy</Text> : null}
            </GlassCard>
          );
        })}
      </View>
      <Text style={styles.note}>Model names are used descriptively. CreamyTuner is independent and is not affiliated with or endorsed by SharkNinja.</Text>
      <GradientButton title="Continue" icon="arrow-right" onPress={continueFlow} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  machine: { width: '48.2%', minHeight: 178, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  machineActive: { borderColor: palette.pink, borderWidth: 2 },
  machineArt: { width: 72, height: 72, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.08)', marginBottom: spacing.sm },
  machineArtActive: { backgroundColor: 'rgba(241,78,155,0.13)' },
  machineName: { color: palette.text, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  machineSubtitle: { ...textStyles.caption, textAlign: 'center', marginTop: 4 },
  selected: { position: 'absolute', top: spacing.xs, right: spacing.xs, width: 24, height: 24, borderRadius: 12, backgroundColor: palette.pink, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  legacy: { color: palette.warning, fontSize: 10, fontWeight: '700', marginTop: 5 },
  note: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint, marginBottom: spacing.lg },
});
