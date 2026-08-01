import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdjustStep, GoalStep, PantryStep, RecommendationStep, ReviewStep } from '@/src/components/builder/steps';
import { GuidedGoalStep, StartingPointStep, TutorialExplainer, TutorialIntroStep } from '@/src/components/builder/tutorial-steps';
import { AppHeader, GradientButton, Icon, IconButton, LoadingScreen, Screen, textStyles } from '@/src/components/ui';
import { getRecipeFixOptions, generateRecipe, recommendGuidedRecipe, recommendProgram, validateRecipe, type RecipeFixOption } from '@/src/domain/generator';
import { calculateNutrition } from '@/src/domain/nutrition';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { BuilderMode, BuilderPreferences, GuidedBuilderDraft, Recipe, RecipeIngredient } from '@/src/types';

type BuilderPage = 'intro' | 'goal' | 'starting' | 'pantry' | 'recommendation' | 'adjust' | 'review';

const guidedFlow: BuilderPage[] = ['intro', 'goal', 'starting', 'pantry', 'recommendation', 'adjust', 'review'];
const quickFlow: BuilderPage[] = ['goal', 'pantry', 'recommendation', 'adjust', 'review'];
const pageLabels: Record<BuilderPage, string> = {
  intro: 'How it works', goal: 'Your goal', starting: 'Starting point', pantry: 'Your kitchen', recommendation: 'Base recipe', adjust: 'Fine-tune', review: 'Review',
};

export default function RecipeBuilderScreen() {
  const params = useLocalSearchParams<{ recipeId?: string; mode?: string; resume?: string }>();
  const { ready, ingredients, recipes, saveRecipe, settings, updateSettings } = useApp();
  const source = recipes.find((recipe) => recipe.id === params.recipeId);
  const initialized = useRef(false);
  const lastSavedDraft = useRef('');
  const previousStep = useRef(0);
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [mode, setMode] = useState<BuilderMode>('guided');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('My Creamy Creation');
  const [preferences, setPreferences] = useState<BuilderPreferences>({ style: 'ice-cream', flavor: 'anything', craving: '' });
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [items, setItems] = useState<RecipeIngredient[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [recommendedAmounts, setRecommendedAmounts] = useState<Record<string, number>>({});
  const [adjustmentIssue, setAdjustmentIssue] = useState('');
  const [appliedFix, setAppliedFix] = useState('');

  const flow = mode === 'guided' ? guidedFlow : quickFlow;
  const safeStep = Math.min(step, flow.length - 1);
  const page = flow[safeStep];

  useEffect(() => {
    if (!ready || initialized.current) return;
    if (source) {
      setMode('quick');
      setName(source.name);
      setPreferences((current) => ({ ...current, style: source.style }));
      setItems(source.ingredients);
      setRecommendedAmounts(Object.fromEntries(source.ingredients.map((item) => [item.ingredientId, ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.defaultAmount ?? item.amount])));
      setStep(quickFlow.indexOf('adjust'));
    } else if (params.resume === '1' && settings.guidedBuilderDraft) {
      const draft = settings.guidedBuilderDraft;
      setMode(draft.mode);
      setStep(Math.min(draft.step, (draft.mode === 'guided' ? guidedFlow : quickFlow).length - 1));
      setName(draft.name);
      setPreferences(draft.preferences);
      setAvailableIds(draft.availableIds);
      setItems(draft.items);
      setRecommendedIds(draft.recommendedIds);
      setRecommendedAmounts(draft.recommendedAmounts);
      lastSavedDraft.current = JSON.stringify(draft);
    } else {
      const initialMode: BuilderMode = params.mode === 'quick' ? 'quick' : params.mode === 'guided' ? 'guided' : settings.tutorialMode ? 'guided' : 'quick';
      setMode(initialMode);
    }
    initialized.current = true;
  }, [ingredients, params.mode, params.resume, ready, settings.guidedBuilderDraft, settings.tutorialMode, source]);

  useEffect(() => {
    if (!ready || !initialized.current || source) return;
    const draft: GuidedBuilderDraft = { step: safeStep, mode, name, preferences, availableIds, items, recommendedIds, recommendedAmounts };
    const serialized = JSON.stringify(draft);
    if (serialized === lastSavedDraft.current) return;
    const timer = setTimeout(() => {
      lastSavedDraft.current = serialized;
      void updateSettings({ guidedBuilderDraft: draft });
    }, 350);
    return () => clearTimeout(timer);
  }, [availableIds, items, mode, name, preferences, ready, recommendedAmounts, recommendedIds, safeStep, source, updateSettings]);

  useEffect(() => {
    const direction = safeStep >= previousStep.current ? 1 : -1;
    previousStep.current = safeStep;
    slide.setValue(direction * 32);
    fade.setValue(0.65);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [fade, safeStep, slide]);

  const recommendation = useMemo(() => recommendGuidedRecipe({ preferences, availableIngredientIds: availableIds, ingredients, machineId: settings.machineId }), [availableIds, ingredients, preferences, settings.machineId]);
  useEffect(() => {
    if (page !== 'recommendation') return;
    setRecommendedIds(items.length ? items.map((item) => item.ingredientId) : recommendation.suggestedItems.map((item) => item.ingredientId));
  }, [items, page, recommendation.suggestedItems]);
  const selectedIds = useMemo(() => new Set(items.map((item) => item.ingredientId)), [items]);
  const nutrition = useMemo(() => calculateNutrition(items, ingredients), [ingredients, items]);
  const validation = useMemo(() => validateRecipe(items, ingredients, settings.machineId), [ingredients, items, settings.machineId]);
  const program = useMemo(() => recommendProgram({ style: preferences.style, nutrition, ingredients: items }, settings.machineId), [items, nutrition, preferences.style, settings.machineId]);
  const fixOptions = useMemo(() => getRecipeFixOptions(items, ingredients, settings.machineId, validation), [ingredients, items, settings.machineId, validation]);
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

  const goToPage = (target: BuilderPage) => {
    const next = flow.indexOf(target);
    if (next >= 0) setStep(next);
  };
  const move = (direction: -1 | 1) => setStep((current) => Math.max(0, Math.min(flow.length - 1, current + direction)));
  const switchMode = (nextMode: BuilderMode) => {
    const currentPage = page;
    const nextFlow = nextMode === 'guided' ? guidedFlow : quickFlow;
    setMode(nextMode);
    setStep(Math.max(0, nextFlow.indexOf(currentPage)));
    void updateSettings({ tutorialMode: nextMode === 'guided' });
  };
  const chooseGuidedStart = () => {
    setItems([]);
    setRecommendedAmounts({});
    goToPage('pantry');
  };
  const applyTemplate = (continueThroughGuide = false) => {
    const template = recipes.find((recipe) => recipe.isTemplate);
    if (!template) return;
    setName(template.name);
    setPreferences((current) => ({ ...current, style: template.style }));
    setItems(template.ingredients);
    setRecommendedAmounts(Object.fromEntries(template.ingredients.map((item) => [item.ingredientId, item.amount])));
    setAdjustmentIssue('');
    setAppliedFix('');
    goToPage(continueThroughGuide ? 'pantry' : 'adjust');
  };
  const applyRecommendation = () => {
    const selected = new Set(recommendedIds);
    const candidates = [...items, ...recommendation.suggestedItems, ...recommendation.optional.map((ingredient) => ({ ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }))];
    const unique = new Map(candidates.map((item) => [item.ingredientId, item]));
    const nextItems = [...unique.values()].filter((item) => selected.has(item.ingredientId));
    setItems(nextItems);
    setRecommendedAmounts((current) => ({ ...current, ...Object.fromEntries(nextItems.map((item) => [item.ingredientId, current[item.ingredientId] ?? item.amount])) }));
    setAdjustmentIssue('');
    setAppliedFix('');
    goToPage('adjust');
  };
  const applyFix = (option: RecipeFixOption) => {
    setItems(option.nextItems);
    setRecommendedAmounts((current) => ({ ...current, ...Object.fromEntries(option.nextItems.filter((item) => !current[item.ingredientId]).map((item) => [item.ingredientId, item.amount])) }));
    setAppliedFix(`${option.label} applied. Review the updated amounts below.`);
  };
  const submit = async () => {
    const imageKey: Recipe['imageKey'] = selectedIds.has('cocoa') ? 'chocolate' : selectedIds.has('peppermint') ? 'mint' : selectedIds.has('cookie-pieces') ? 'cookies' : 'strawberry';
    const recipe = generateRecipe({ name, style: preferences.style, items, ingredients, existingId: source?.id, imageKey: source?.imageKey ?? imageKey, favorite: source?.favorite });
    if (source) recipe.createdAt = source.createdAt;
    await saveRecipe(recipe);
    await updateSettings({ firstPintCompleted: true, guidedBuilderDraft: null });
    router.replace(`/recipe/${recipe.id}`);
  };
  if (!ready) return <LoadingScreen />;

  const continueAction = () => {
    if (page === 'recommendation') applyRecommendation();
    else if (page === 'review') void submit();
    else move(1);
  };
  const continueTitle = page === 'intro' ? 'Start the tutorial' : page === 'recommendation' ? 'Use selected ingredients' : page === 'adjust' ? 'Review my pint' : page === 'review' ? source ? 'Save changes' : 'Save recipe' : 'Continue';
  const continueDisabled = (page === 'recommendation' && recommendedIds.length === 0) || (page === 'adjust' && items.length === 0) || (page === 'review' && (validation.errors.length > 0 || items.length === 0));

  return (
    <Screen resetKey={page}>
      <AppHeader title={source ? 'Edit recipe' : mode === 'guided' ? 'Guided pint' : 'Quick build'} subtitle={`${safeStep + 1} of ${flow.length} · ${pageLabels[page]}`} left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} right={!source ? <Pressable onPress={() => switchMode(mode === 'guided' ? 'quick' : 'guided')} style={styles.modeButton} accessibilityRole="button" accessibilityLabel={`${mode === 'guided' ? 'Turn off' : 'Turn on'} tutorial mode`}><Icon name={mode === 'guided' ? 'school' : 'lightning-bolt'} size={17} color={mode === 'guided' ? palette.cyan : palette.warning} /><Text style={styles.modeButtonText}>{mode === 'guided' ? 'Tutorial on' : 'Quick mode'}</Text></Pressable> : null} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.journey} accessibilityRole="tablist">
        {flow.map((item, index) => <Pressable key={item} disabled={index > safeStep} onPress={() => setStep(index)} style={[styles.journeyStep, index === safeStep && styles.journeyStepActive, index < safeStep && styles.journeyStepDone]} accessibilityRole="tab" accessibilityState={{ selected: index === safeStep, disabled: index > safeStep }} accessibilityLabel={`${index + 1}. ${pageLabels[item]}`}><View style={styles.journeyNumber}>{index < safeStep ? <Icon name="check" size={14} color={palette.ink} /> : <Text style={[styles.journeyNumberText, index === safeStep && styles.journeyNumberTextActive]}>{index + 1}</Text>}</View><Text style={[styles.journeyLabel, index === safeStep && styles.journeyLabelActive]}>{pageLabels[item]}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((safeStep + 1) / flow.length) * 100}%` }]} /></View>
      <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
        {page === 'intro' ? <TutorialIntroStep /> : null}
        {page === 'goal' ? mode === 'guided' ? <GuidedGoalStep preferences={preferences} onPreferencesChange={setPreferences} /> : <GoalStep preferences={preferences} onPreferencesChange={setPreferences} onTemplate={() => applyTemplate(false)} /> : null}
        {page === 'starting' ? <StartingPointStep hasTemplate={items.length > 0} onGuided={chooseGuidedStart} onTemplate={() => applyTemplate(true)} /> : null}
        {page === 'pantry' ? <>{mode === 'guided' ? <TutorialExplainer title="What this step does">Mark what you would actually use today. Missing building blocks are shown before anything is added.</TutorialExplainer> : null}<PantryStep ingredients={ingredients} availableIds={availableIds} onToggle={(id) => setAvailableIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} /></> : null}
        {page === 'recommendation' ? <>{mode === 'guided' ? <TutorialExplainer title="You choose the final list">Checked ingredients move forward. Optional upgrades stay optional, and nothing is inserted after this page without your action.</TutorialExplainer> : null}<RecommendationStep recommendation={recommendation} selectedIds={recommendedIds} onToggle={(id) => setRecommendedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onApply={applyRecommendation} /></> : null}
        {page === 'adjust' ? <>{mode === 'guided' ? <TutorialExplainer title="Now the details">Type amounts, use the − and + controls, or tap Recommended. The kitchen view translates the exact stored amount.</TutorialExplainer> : null}<AdjustStep name={name} onNameChange={setName} items={items} ingredients={ingredients} settings={settings} issue={adjustmentIssue} highlightedIds={highlightedIds} recommendedAmounts={recommendedAmounts} onAmountChange={(id, amount) => { setItems((current) => current.map((item) => item.ingredientId === id ? { ...item, amount } : item)); setAppliedFix(''); }} onMeasurementModeChange={(measurementMode) => { void updateSettings({ measurementMode }); }} onUnitSystemChange={(units) => { void updateSettings({ units }); }} /></> : null}
        {page === 'review' ? <>{mode === 'guided' ? <TutorialExplainer title="Final safety check">Review fill level, nutrition, and the suggested program. Warning fixes only apply after you choose one.</TutorialExplainer> : null}<ReviewStep nutrition={nutrition} validation={validation} program={program} items={items} ingredients={ingredients} settings={settings} fixOptions={fixOptions} appliedFix={appliedFix} onAdjustIssue={(issue) => { setAdjustmentIssue(issue); setAppliedFix(''); goToPage('adjust'); }} onApplyFix={applyFix} /></> : null}
      </Animated.View>
      <View style={styles.footer}>{safeStep > 0 ? <Pressable onPress={() => { setAdjustmentIssue(''); move(-1); }} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Previous builder page"><Icon name="arrow-left" size={20} color={palette.textMuted} /><Text style={styles.backText}>Back</Text></Pressable> : <View />}{page !== 'starting' ? <GradientButton title={continueTitle} icon="arrow-right" disabled={continueDisabled} onPress={continueAction} /> : null}</View>
      {page === 'starting' ? <Text style={styles.choosePrompt}>Choose a starting point above to continue.</Text> : null}
      {page === 'review' && validation.errors.length ? <Text style={styles.blocked}>Resolve the highlighted capacity error before saving.</Text> : null}
      <Text style={styles.legal}>Guidance uses ingredient roles and stored label data. It is not medical advice or generative AI.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeButton: { minHeight: 44, minWidth: 84, borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(78,217,232,0.35)', backgroundColor: 'rgba(78,217,232,0.08)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  modeButtonText: { color: palette.text, fontSize: 12, lineHeight: 16, fontWeight: '900', marginTop: 1 },
  journey: { gap: spacing.xs, paddingBottom: spacing.sm },
  journeyStep: { minHeight: 48, minWidth: 116, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  journeyStepActive: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.14)' },
  journeyStepDone: { borderColor: 'rgba(78,217,232,0.35)' },
  journeyNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelRaised },
  journeyNumberText: { color: palette.textMuted, fontSize: 13, fontWeight: '900' },
  journeyNumberTextActive: { color: palette.pink },
  journeyLabel: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  journeyLabelActive: { color: palette.text },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: palette.panelRaised, overflow: 'hidden', marginBottom: spacing.lg },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: palette.pink },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xl },
  backButton: { minHeight: 52, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { color: palette.textMuted, fontSize: 16, fontWeight: '800' },
  choosePrompt: { ...textStyles.caption, color: palette.cyan, textAlign: 'center', marginTop: spacing.sm },
  blocked: { color: palette.danger, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  legal: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint, marginTop: spacing.md },
});
