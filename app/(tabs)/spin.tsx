import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, GlassCard, GradientButton, Icon, LoadingScreen, Pill, Screen } from '@/src/components/ui';
import { machineById } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';

const steps = [
  ['Mix', 'Make sure everything is well combined.', 'blender-outline'],
  ['Freeze', 'Freeze flat for at least 24 hours.', 'snowflake'],
  ['Select Program', 'Use the recommended program.', 'tune-vertical'],
  ['Spin', 'Lock the bowl and start the machine.', 'record-circle-outline'],
  ['Evaluate', 'Check the texture before adding liquid.', 'eye-outline'],
  ['Re-spin?', 'Use Re-Spin only if the texture needs it.', 'refresh'],
] as const;

export default function SpinAssistantScreen() {
  const params = useLocalSearchParams<{ recipeId?: string; programId?: string }>();
  const { ready, recipes, settings, startSpinSession } = useApp();
  const recipe = recipes.find((candidate) => candidate.id === params.recipeId) ?? recipes[0];
  const machine = machineById(settings.machineId);
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const title = recipe ? recipe.name : 'Your pint';
  const selectedProgram = machine.programs.find((program) => program.id === params.programId);

  const next = async () => {
    if (!started) {
      setStarted(true);
      await startSpinSession({ id: `spin-${Date.now()}`, recipeId: recipe?.id, machineId: machine.id, programId: params.programId, step: 1, startedAt: new Date().toISOString() });
    }
    setActive((current) => Math.min(current + 1, steps.length - 1));
  };

  if (!ready) return <LoadingScreen />;

  return (
    <Screen>
      <AppHeader title="Spin Assistant" subtitle={`${machine.shortName}${selectedProgram ? ` · ${selectedProgram.name}` : ''}`} />
      <Text style={styles.recipe} numberOfLines={2}>{title}</Text>
      <Text style={styles.intro}>We’ll guide you step by step.</Text>
      <View style={styles.timeline}>
        <View style={styles.line} />
        {steps.map(([name, description, icon], index) => {
          const complete = index < active;
          const current = index === active;
          return (
            <GlassCard key={name} onPress={() => setActive(index)} style={[styles.step, current && styles.stepCurrent]} accessibilityLabel={`Step ${index + 1}: ${name}`}>
              <View style={[styles.stepNumber, complete && styles.stepComplete, current && styles.stepActive]}>{complete ? <Icon name="check" size={18} /> : <Text style={styles.stepNumberText}>{index + 1}</Text>}</View>
              <View style={styles.stepCopy}><Text style={styles.stepName}>{name}</Text><Text style={styles.stepDescription}>{description}</Text></View>
              <Icon name={icon} color={current ? palette.pink : palette.textFaint} />
            </GlassCard>
          );
        })}
      </View>
      {active === steps.length - 1 ? (
        <GlassCard style={styles.evaluate}>
          <Text style={styles.evaluateTitle}>How did it turn out?</Text>
          <View style={styles.textureRow}><Pill label="Perfect" onPress={() => setActive(0)} /><Pill label="Powdery" onPress={() => router.push('/troubleshoot?issue=powdery')} /><Pill label="Icy" onPress={() => router.push('/troubleshoot?issue=icy')} /></View>
        </GlassCard>
      ) : <GradientButton title={active === 2 ? 'Ready to Spin' : 'Next Step'} icon="arrow-right" onPress={next} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  recipe: { color: palette.text, fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  intro: { color: palette.textMuted, textAlign: 'center', fontSize: 13, marginBottom: spacing.lg },
  timeline: { gap: spacing.xs, marginBottom: spacing.lg, position: 'relative' },
  line: { position: 'absolute', left: 24, top: 30, bottom: 30, width: 2, backgroundColor: palette.border },
  step: { minHeight: 72, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepCurrent: { borderColor: palette.lavender },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: palette.border, zIndex: 2 },
  stepComplete: { backgroundColor: palette.success },
  stepActive: { backgroundColor: palette.lavender },
  stepNumberText: { color: palette.text, fontWeight: '800' },
  stepCopy: { flex: 1 },
  stepName: { color: palette.text, fontSize: 14, fontWeight: '800' },
  stepDescription: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  evaluate: { padding: spacing.md, gap: spacing.sm },
  evaluateTitle: { color: palette.text, fontWeight: '800', textAlign: 'center' },
  textureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
});
