import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdjustStep, GoalStep, PantryStep, RecommendationStep, ReviewStep } from '@/src/components/builder/steps';
import { AppHeader, GradientButton, Icon, IconButton, LoadingScreen, Screen, textStyles } from '@/src/components/ui';
import { calculateNutrition } from '@/src/domain/nutrition';
import { generateRecipe, recommendGuidedRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';
import type { BuilderPreferences, Recipe, RecipeIngredient } from '@/src/types';

type BuilderStep = 0 | 1 | 2 | 3 | 4;

export default function RecipeBuilderScreen() {
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { ready, ingredients, recipes, saveRecipe, settings, updateSettings } = useApp();
  const source = recipes.find((recipe) => recipe.id === params.recipeId);
  const initialized = useRef(false);
  const [step, setStep] = useState<BuilderStep>(0);
  const [name, setName] = useState('My Creamy Creation');
  const [preferences, setPreferences] = useState<BuilderPreferences>({ style: 'ice-cream', flavor: 'anything', craving: '' });
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [items, setItems] = useState<RecipeIngredient[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [adjustmentIssue, setAdjustmentIssue] = useState('');

  useEffect(() => {
    if (!ready || initialized.current) return;
    if (source) { setName(source.name); setPreferences((current) => ({ ...current, style: source.style })); setItems(source.ingredients); setStep(3); }
    initialized.current = true;
  }, [ready, source]);

  const recommendation = useMemo(() => recommendGuidedRecipe({ preferences, availableIngredientIds: availableIds, ingredients, machineId: settings.machineId }), [availableIds, ingredients, preferences, settings.machineId]);
  useEffect(() => { if (step === 2) setRecommendedIds(recommendation.suggestedItems.map((item) => item.ingredientId)); }, [recommendation, step]);
  const selectedIds = useMemo(() => new Set(items.map((item) => item.ingredientId)), [items]);
  const nutrition = useMemo(() => calculateNutrition(items, ingredients), [ingredients, items]);
  const validation = useMemo(() => validateRecipe(items, ingredients, settings.machineId), [ingredients, items, settings.machineId]);
  const program = useMemo(() => recommendProgram({ style: preferences.style, nutrition, ingredients: items }, settings.machineId), [items, nutrition, preferences.style, settings.machineId]);
  const highlightedIds = useMemo(() => {
    if (!adjustmentIssue) return new Set<string>();
    const relevant = items.filter((item) => {
      const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
      if (!ingredient) return false;
      if (/fill|capacity|volume|line/i.test(adjustmentIssue)) return ingredient.category === 'base' || item.amount >= 100;
      if (/sweet/i.test(adjustmentIssue)) return ingredient.category === 'sweetener';
      if (/stabil|gum|texture/i.test(adjustmentIssue)) return ingredient.category === 'stabilizer';
      return ingredient.category === 'base' || ingredient.category === 'protein';
    });
    return new Set(relevant.map((item) => item.ingredientId));
  }, [adjustmentIssue, ingredients, items]);

  const applyRecommendation = () => {
    const selected = new Set(recommendedIds);
    const optional = recommendation.optional.map((ingredient) => ({ ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }));
    setItems([...recommendation.suggestedItems, ...optional].filter((item) => selected.has(item.ingredientId)));
    setAdjustmentIssue(''); setStep(3);
  };
  const applyTemplate = () => { const template = recipes.find((recipe) => recipe.isTemplate); if (!template) return; setName(template.name); setPreferences((current) => ({ ...current, style: template.style })); setItems(template.ingredients); setAdjustmentIssue(''); setStep(3); };
  const submit = async () => {
    const imageKey: Recipe['imageKey'] = selectedIds.has('cocoa') ? 'chocolate' : selectedIds.has('peppermint') ? 'mint' : selectedIds.has('cookie-pieces') ? 'cookies' : 'strawberry';
    const recipe = generateRecipe({ name, style: preferences.style, items, ingredients, existingId: source?.id, imageKey: source?.imageKey ?? imageKey, favorite: source?.favorite });
    if (source) recipe.createdAt = source.createdAt;
    await saveRecipe(recipe); router.replace(`/recipe/${recipe.id}`);
  };
  if (!ready) return <LoadingScreen />;

  return (
    <Screen>
      <AppHeader title={source ? 'Edit recipe' : 'Build my pint'} subtitle={`Step ${step + 1} of 5`} left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / 5) * 100}%` }]} /></View>
      {step === 0 ? <GoalStep preferences={preferences} onPreferencesChange={setPreferences} onTemplate={applyTemplate} /> : null}
      {step === 1 ? <PantryStep ingredients={ingredients} availableIds={availableIds} onToggle={(id) => setAvailableIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} /> : null}
      {step === 2 ? <RecommendationStep recommendation={recommendation} selectedIds={recommendedIds} onToggle={(id) => setRecommendedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onApply={applyRecommendation} /> : null}
      {step === 3 ? <AdjustStep name={name} onNameChange={setName} items={items} ingredients={ingredients} settings={settings} issue={adjustmentIssue} highlightedIds={highlightedIds} onAmountChange={(id, amount) => setItems((current) => current.map((item) => item.ingredientId === id ? { ...item, amount } : item))} onMeasurementModeChange={(measurementMode) => { void updateSettings({ measurementMode }); }} onUnitSystemChange={(units) => { void updateSettings({ units }); }} /> : null}
      {step === 4 ? <ReviewStep nutrition={nutrition} validation={validation} program={program} items={items} ingredients={ingredients} settings={settings} onAdjustIssue={(issue) => { setAdjustmentIssue(issue); setStep(3); }} /> : null}
      <View style={styles.footer}>{step > 0 ? <Pressable onPress={() => { setAdjustmentIssue(''); setStep((current) => (current - 1) as BuilderStep); }} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Previous builder step"><Icon name="arrow-left" size={20} color={palette.textMuted} /><Text style={styles.backText}>Back</Text></Pressable> : <View />}{step < 4 ? <GradientButton title={step === 2 ? 'Use selected ingredients' : 'Continue'} icon="arrow-right" disabled={step === 2 && recommendedIds.length === 0} onPress={() => step === 2 ? applyRecommendation() : setStep((current) => (current + 1) as BuilderStep)} /> : <GradientButton title={source ? 'Save changes' : 'Save recipe'} icon="content-save" disabled={validation.errors.length > 0 || items.length === 0} onPress={() => { void submit(); }} />}</View>
      {step === 4 && validation.errors.length ? <Text style={styles.blocked}>Resolve the highlighted capacity error before saving.</Text> : null}
      <Text style={styles.legal}>Guidance uses ingredient roles and stored label data. It is not medical advice or generative AI.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: palette.panelRaised, overflow: 'hidden', marginBottom: spacing.lg }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: palette.pink }, footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xl }, backButton: { minHeight: 52, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, backText: { color: palette.textMuted, fontSize: 16, fontWeight: '800' }, blocked: { color: palette.danger, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm }, legal: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint, marginTop: spacing.md },
});
