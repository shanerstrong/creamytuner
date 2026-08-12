import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { CollapsedAdjustStep, CompactProgress, BuilderQuestionStep, OptionalPantry, RecommendationResult } from '@/src/components/builder/simple-steps';
import { ReviewStep } from '@/src/components/builder/steps';
import { AppHeader, GradientButton, Icon, IconButton, LoadingScreen, Screen } from '@/src/components/ui';
import { calculateNutrition } from '@/src/domain/nutrition';
import { filterIngredientsForPreferences, getIngredientEligibility } from '@/src/domain/dietary';
import { machineById } from '@/src/data/machines';
import { generateRecipe, getPantrySubstitutionProposals, getRecipeFixOptions, recommendBeginnerRecipe, recommendProgram, validateRecipe, type RecipeFixOption } from '@/src/domain/generator';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';
import type { BeginnerBuilderAnswers, BeginnerBuilderStage, GuidedBuilderDraft, Recipe, RecipeIngredient } from '@/src/types';

const stageOrder: BeginnerBuilderStage[] = ['question-texture', 'question-flavor', 'question-goal', 'recommendation', 'customize', 'review'];
const questionStages = new Set<BeginnerBuilderStage>(['question-texture', 'question-flavor', 'question-goal']);

export default function BuilderScreen() {
  const params = useLocalSearchParams<{ recipeId?: string; resume?: string; advanced?: string }>();
  const { ready, ingredients, recipes, settings, updateSettings, saveRecipe } = useApp();
  const source = recipes.find((recipe) => recipe.id === params.recipeId);
  const machine = machineById(settings.machineId);
  const initialized = useRef(false);
  const lastDraft = useRef('');
  const previousIndex = useRef(0);
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [stage, setStage] = useState<BeginnerBuilderStage>('question-texture');
  const [answers, setAnswers] = useState<BeginnerBuilderAnswers>({ texture: 'creamy', flavor: 'strawberry', goal: 'high-protein' });
  const [name, setName] = useState('My Creamy Creation');
  const [items, setItems] = useState<RecipeIngredient[]>([]);
  const [recommendedAmounts, setRecommendedAmounts] = useState<Record<string, number>>({});
  const [pantryIds, setPantryIds] = useState<string[]>([]);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [adjustmentIssue, setAdjustmentIssue] = useState('');
  const [appliedFix, setAppliedFix] = useState('');

  const eligibleIngredients = useMemo(() => filterIngredientsForPreferences(ingredients, settings.dietaryPreferences, settings.foodAllergies, settings.customAvoidFoods), [ingredients, settings.customAvoidFoods, settings.dietaryPreferences, settings.foodAllergies]);
  const eligibleIds = useMemo(() => new Set(eligibleIngredients.map((ingredient) => ingredient.id)), [eligibleIngredients]);
  const editorIngredients = useMemo(() => ingredients.filter((ingredient) => eligibleIds.has(ingredient.id) || items.some((item) => item.ingredientId === ingredient.id)), [eligibleIds, ingredients, items]);
  const ingredientConflicts = useMemo(() => items.map((item) => ingredients.find((ingredient) => ingredient.id === item.ingredientId)).filter((ingredient): ingredient is NonNullable<typeof ingredient> => Boolean(ingredient)).map((ingredient) => ({ ingredient, result: getIngredientEligibility(ingredient, settings.dietaryPreferences, settings.foodAllergies, settings.customAvoidFoods) })).filter((entry) => !entry.result.allowed), [ingredients, items, settings.customAvoidFoods, settings.dietaryPreferences, settings.foodAllergies]);

  const recommendation = useMemo(() => recommendBeginnerRecipe({ answers, ingredients: eligibleIngredients, machineId: settings.machineId }), [answers, eligibleIngredients, settings.machineId]);
  const nutrition = useMemo(() => calculateNutrition(items, ingredients), [ingredients, items]);
  const rawValidation = useMemo(() => validateRecipe(items, ingredients, settings.machineId), [ingredients, items, settings.machineId]);
  const validation = useMemo(() => ({
    ...rawValidation,
    errors: rawValidation.errors.map((error) => /safe fill target|capacity|exceed/i.test(error) ? 'This may exceed your container’s safe fill line.' : error),
    warnings: rawValidation.warnings.map((warning) => /low sugar|freeze hard/i.test(warning) ? 'This may freeze too hard without fruit or a softening sweetener.' : /stabilizer|iciness/i.test(warning) ? 'This may turn out icier without a small texture helper.' : warning),
  }), [rawValidation]);
  const recipeStyle = source?.style ?? recommendation.style;
  const program = useMemo(() => recommendProgram({ style: recipeStyle, nutrition, ingredients: items }, settings.machineId), [items, nutrition, recipeStyle, settings.machineId]);
  const fixOptions = useMemo(() => getRecipeFixOptions(items, eligibleIngredients, settings.machineId, rawValidation), [eligibleIngredients, items, rawValidation, settings.machineId]);
  const proposals = useMemo(() => getPantrySubstitutionProposals(items, pantryIds, eligibleIngredients), [eligibleIngredients, items, pantryIds]);
  const highlightedIds = useMemo(() => {
    if (!adjustmentIssue) return new Set<string>();
    return new Set(items.filter((item) => { const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId); if (!ingredient) return false; return /fill|container/i.test(adjustmentIssue) ? ingredient.category === 'base' || item.amount >= 100 : /hard|sweet/i.test(adjustmentIssue) ? ingredient.category === 'sweetener' : ingredient.category === 'stabilizer'; }).map((item) => item.ingredientId));
  }, [adjustmentIssue, ingredients, items]);

  useEffect(() => {
    if (!ready || initialized.current) return;
    if (source) {
      setStage('customize'); setName(source.name); setItems(source.ingredients);
      setRecommendedAmounts(Object.fromEntries(source.ingredients.map((item) => [item.ingredientId, item.amount])));
    } else if (params.resume === '1' && settings.guidedBuilderDraft) {
      const draft = settings.guidedBuilderDraft;
      setStage(draft.stage); setName(draft.name); setAnswers(draft.answers); setPantryIds(draft.pantryIds); setItems(draft.items); setRecommendedAmounts(draft.recommendedAmounts);
      lastDraft.current = JSON.stringify(draft);
    } else if (params.advanced === '1') {
      const template = recipes.find((recipe) => recipe.isTemplate);
      if (template) { setName(template.name); setItems(template.ingredients); setRecommendedAmounts(Object.fromEntries(template.ingredients.map((item) => [item.ingredientId, item.amount]))); }
      setStage('customize');
    }
    initialized.current = true;
  }, [params.advanced, params.resume, ready, recipes, settings.guidedBuilderDraft, source]);

  useEffect(() => {
    if (!ready || !initialized.current || source) return;
    const draft: GuidedBuilderDraft = { version: 2, stage, name, answers, pantryIds, items, recommendedAmounts };
    const serialized = JSON.stringify(draft);
    if (serialized === lastDraft.current) return;
    const timer = setTimeout(() => { lastDraft.current = serialized; void updateSettings({ guidedBuilderDraft: draft }); }, 300);
    return () => clearTimeout(timer);
  }, [answers, items, name, pantryIds, ready, recommendedAmounts, source, stage, updateSettings]);

  useEffect(() => {
    const index = stageOrder.indexOf(stage);
    const direction = index >= previousIndex.current ? 1 : -1;
    previousIndex.current = index;
    slide.setValue(direction * 28); fade.setValue(0.7);
    Animated.parallel([Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }), Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true })]).start();
  }, [fade, slide, stage]);

  const buildRecommendation = () => {
    setName(recommendation.name); setItems(recommendation.items); setRecommendedAmounts(Object.fromEntries(recommendation.items.map((item) => [item.ingredientId, item.amount]))); setStage('recommendation');
  };
  const applyProposals = () => {
    const replacements = new Map(proposals.map((proposal) => [proposal.original.ingredientId, proposal.replacement]));
    setItems((current) => current.map((item) => replacements.get(item.ingredientId) ?? item));
    setPantryOpen(false);
  };
  const applyFix = (option: RecipeFixOption) => { setItems(option.nextItems); setAppliedFix(`${option.label} applied. Review the updated recipe below.`); };
  const submit = async () => {
    if (ingredientConflicts.length) return;
    const selected = new Set(items.map((item) => item.ingredientId));
    const imageKey: Recipe['imageKey'] = selected.has('cocoa') ? 'chocolate' : selected.has('peppermint') ? 'mint' : selected.has('cookie-pieces') ? 'cookies' : 'strawberry';
    const recipe = generateRecipe({ name, style: recipeStyle, items, ingredients, existingId: source?.id, imageKey: source?.imageKey ?? imageKey, photoUri: source?.photoUri, favorite: source?.favorite });
    if (source) recipe.createdAt = source.createdAt;
    await saveRecipe(recipe);
    await updateSettings({ firstPintCompleted: true, guidedBuilderDraft: null });
    router.replace(source ? `/recipe/${recipe.id}` : `/freeze-timer?recipeId=${recipe.id}&justBuilt=1`);
  };
  const back = () => {
    if (stage === 'question-texture') return router.back();
    if (stage === 'question-flavor') return setStage('question-texture');
    if (stage === 'question-goal') return setStage('question-flavor');
    if (stage === 'recommendation') return setStage('question-goal');
    if (stage === 'customize' && (source || params.advanced === '1')) return router.back();
    if (stage === 'customize') return setStage('recommendation');
    setStage('customize');
  };
  const continueQuestion = () => stage === 'question-texture' ? setStage('question-flavor') : stage === 'question-flavor' ? setStage('question-goal') : buildRecommendation();
  if (!ready) return <LoadingScreen />;

  const footer = questionStages.has(stage) || stage === 'customize' || stage === 'review' ? <View style={styles.footer}><Pressable onPress={back} style={styles.backButton} accessibilityRole="button"><Icon name="arrow-left" color={palette.textMuted} /><Text style={styles.backText}>Back</Text></Pressable><GradientButton title={questionStages.has(stage) ? stage === 'question-goal' ? 'Build my recipe' : 'Continue' : stage === 'customize' ? 'Review my pint' : source ? 'Save changes' : 'Save recipe'} icon="arrow-right" disabled={((stage === 'customize' || stage === 'review') && items.length === 0) || ingredientConflicts.length > 0 || (stage === 'review' && validation.errors.length > 0)} onPress={() => questionStages.has(stage) ? continueQuestion() : stage === 'customize' ? setStage('review') : void submit()} /></View> : null;

  return <Screen resetKey={stage} footer={footer} contentStyle={styles.screenContent}>
    <AppHeader title={source ? 'Edit recipe' : stage === 'recommendation' ? 'Your recipe' : stage === 'customize' ? 'Customize' : stage === 'review' ? 'Review' : 'Build my pint'} left={<IconButton icon="chevron-left" label="Go back" onPress={back} />} />
    <CompactProgress stage={stage} />
    <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
      {questionStages.has(stage) ? <BuilderQuestionStep stage={stage} answers={answers} onChange={setAnswers} showGuidance={settings.tutorialMode} /> : null}
      {stage === 'recommendation' && recommendation.blockedReason ? <View style={styles.noSafeBase}><Icon name="shield-alert-outline" color={palette.danger} size={32} /><Text style={styles.noSafeBaseTitle}>A complete recipe cannot be built yet</Text><Text style={styles.noSafeBaseText}>{recommendation.blockedReason}</Text><GradientButton title="Review food settings" icon="arrow-right" onPress={() => router.push('/settings')} /></View> : null}
      {stage === 'recommendation' && !recommendation.blockedReason ? <RecommendationResult name={name} expectedTexture={recommendation.expectedTexture} rationale={recommendation.rationale} nutrition={nutrition} validation={validation} program={program} capacityMl={machine.capacityMl} tutorialMode={settings.tutorialMode} onUse={() => setStage('review')} onCustomize={() => setStage('customize')} pantryOpen={pantryOpen} onTogglePantry={() => setPantryOpen((current) => !current)}>{<OptionalPantry ingredients={eligibleIngredients} selectedIds={pantryIds} proposals={proposals} onToggle={(id) => setPantryIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onApply={applyProposals} />}</RecommendationResult> : null}
      {ingredientConflicts.length ? <View style={styles.allergyBlock}><Icon name="shield-alert-outline" color={palette.danger} /><View style={styles.conflictCopy}><Text style={styles.conflictTitle}>Adjust restricted ingredients</Text><Text style={styles.conflictText}>{ingredientConflicts.map((entry) => entry.ingredient.name).join(', ')} cannot be used with your current food settings.</Text></View></View> : null}
      {stage === 'customize' ? <CollapsedAdjustStep name={name} onNameChange={setName} items={items} ingredients={editorIngredients} eligibleIngredientIds={eligibleIds} settings={settings} issue={adjustmentIssue} highlightedIds={highlightedIds} recommendedAmounts={recommendedAmounts} estimatedVolumeMl={rawValidation.estimatedVolumeMl} capacityMl={machine.capacityMl} onItemsChange={(next) => { setItems(next); setAppliedFix(''); }} onMeasurementModeChange={(measurementMode) => void updateSettings({ measurementMode })} onUnitSystemChange={(units) => void updateSettings({ units })} /> : null}
      {stage === 'review' ? <ReviewStep nutrition={nutrition} validation={validation} program={program} items={items} ingredients={ingredients} settings={settings} capacityMl={machine.capacityMl} fixOptions={fixOptions} appliedFix={appliedFix} onAdjustIssue={(issue) => { setAdjustmentIssue(issue); setAppliedFix(''); setStage('customize'); }} onApplyFix={applyFix} /> : null}
    </Animated.View>
    {stage === 'review' && validation.errors.length ? <Text style={styles.blocked}>Choose “Fit this container” before saving.</Text> : null}
    <Text style={styles.legal}>Recommendations are estimates. Check your machine’s fill line and official instructions.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: spacing.xl },
  footer: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.ink },
  backButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  backText: { color: palette.textMuted, fontSize: 16, fontWeight: '900' },
  blocked: { color: palette.danger, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  legal: { color: palette.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.lg },
  allergyBlock: { minHeight: 64, borderWidth: 1, borderColor: palette.danger, borderRadius: 14, backgroundColor: 'rgba(255,107,131,0.09)', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.sm },
  noSafeBase: { alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: palette.danger, borderRadius: 18, backgroundColor: 'rgba(255,107,131,0.09)', padding: spacing.lg },
  noSafeBaseTitle: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center' },
  noSafeBaseText: { color: palette.textMuted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginBottom: spacing.xs },
  conflictCopy: { flex: 1 },
  conflictTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  conflictText: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
});
