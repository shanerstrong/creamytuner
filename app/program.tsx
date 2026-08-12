import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, EmptyState, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, Pill, Screen, type IconName } from '@/src/components/ui';
import { machineById } from '@/src/data/machines';
import { recommendProgram } from '@/src/domain/generator';
import { getRecipeEligibility } from '@/src/domain/dietary';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

export default function ProgramSelectionScreen() {
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { ready, recipes, ingredients, settings } = useApp();
  const [recipeId, setRecipeId] = useState(params.recipeId);
  const recipe = recipes.find((candidate) => candidate.id === recipeId);
  const machine = machineById(settings.machineId);
  const eligibleRecipes = useMemo(() => recipes.filter((candidate) => getRecipeEligibility(candidate, ingredients, settings).length === 0), [ingredients, recipes, settings]);
  const conflicts = recipe ? getRecipeEligibility(recipe, ingredients, settings) : [];
  const recommendation = useMemo(() => recipe ? recommendProgram(recipe, machine.id) : undefined, [machine.id, recipe]);
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined);
  const selected = selectedProgram ?? recommendation?.program.id;

  useEffect(() => {
    if (!ready || recipe) return;
    const requested = recipes.find((candidate) => candidate.id === params.recipeId);
    setRecipeId(requested?.id ?? eligibleRecipes[0]?.id);
  }, [eligibleRecipes, params.recipeId, ready, recipe, recipes]);

  if (!ready) return <LoadingScreen />;
  if (!recipe) return <Screen><AppHeader title="Which Program?" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><EmptyState icon="ice-cream-off" title="Build a recipe first" message="Program guidance is based on your recipe ingredients." action="Build a Pint" onAction={() => router.replace('/builder')} /></Screen>;
  if (conflicts.length) return <Screen><AppHeader title="Which Program?" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><EmptyState icon="shield-alert-outline" title="Adjust this recipe first" message={`${conflicts.map((entry) => entry.ingredient.name).join(', ')} conflicts with your food settings. Program guidance is blocked until the ingredients are changed.`} action="Edit ingredients" onAction={() => router.replace(`/builder?recipeId=${recipe.id}`)} /></Screen>;

  return (
    <Screen>
      <AppHeader title="Which Program?" subtitle={`For ${machine.shortName}`} left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <Text style={styles.label}>Choose a saved recipe</Text>
      <View style={styles.recipePills}>{eligibleRecipes.slice(0, 6).map((item) => <Pill key={item.id} label={item.name} active={item.id === recipeId} onPress={() => { setRecipeId(item.id); setSelectedProgram(undefined); }} />)}</View>
      <View style={styles.grid}>
        {machine.programs.filter((program) => program.id !== 'mix-in').map((program) => {
          const active = selected === program.id;
          const recommended = recommendation?.program.id === program.id;
          return (
            <GlassCard key={program.id} onPress={() => setSelectedProgram(program.id)} accessibilityLabel={`Select ${program.name}`} style={[styles.program, active && styles.programActive]}>
              {recommended ? <Text style={styles.recommended}>RECOMMENDED</Text> : null}
              <View style={styles.programIcon}><Icon name={program.icon as IconName} size={28} color={active ? palette.pink : palette.lavender} /></View>
              <Text style={styles.programName}>{program.name}</Text>
              <Text style={styles.programDescription}>{program.description}</Text>
            </GlassCard>
          );
        })}
      </View>
      {recommendation ? <GlassCard style={styles.reason}><Icon name="creation" color={palette.pink} /><View style={styles.reasonCopy}><Text style={styles.reasonTitle}>Why {recommendation.program.name}?</Text><Text style={styles.reasonText}>{recommendation.reason}</Text></View></GlassCard> : null}
      <Text style={styles.safety}>Compare this guidance with your machine’s official inspiration guide. Ingredient composition matters more than the texture name alone.</Text>
      <GradientButton title="Start Spin Assistant" icon="arrow-right" onPress={() => router.push(`/(tabs)/spin?recipeId=${recipe.id}&programId=${selected}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: palette.textMuted, fontSize: 16, lineHeight: 21, fontWeight: '700', marginBottom: spacing.xs },
  recipePills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  program: { width: '48.2%', minHeight: 154, padding: spacing.md },
  programActive: { borderColor: palette.pink, borderWidth: 2 },
  programIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: 'rgba(174,134,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  programName: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  programDescription: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 4 },
  recommended: { color: palette.pink, fontSize: 13, fontWeight: '900', letterSpacing: 0.7, position: 'absolute', top: spacing.xs, right: spacing.xs },
  reason: { padding: spacing.md, flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  reasonCopy: { flex: 1 },
  reasonTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  reasonText: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginTop: 3 },
  safety: { color: palette.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: spacing.md },
});
