import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, NutritionStrip, Pill, Screen, textStyles } from '@/src/components/ui';
import { ingredientCategoryLabels } from '@/src/data/ingredients';
import { calculateNutrition, displayAmount } from '@/src/domain/nutrition';
import { generateRecipe, recommendGuidedRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { BuilderPreferences, Ingredient, IngredientCategory, MeasurementMode, Recipe, RecipeIngredient, RecipeStyle, UserSettings, Nutrition, RecipeValidation } from '@/src/types';

const categoryOrder: IngredientCategory[] = ['protein', 'base', 'sweetener', 'stabilizer', 'fruit', 'flavoring', 'mix-in'];
const stylesList: { id: RecipeStyle; label: string; detail: string }[] = [
  { id: 'ice-cream', label: 'Ice cream', detail: 'Rich and scoopable' },
  { id: 'lite-ice-cream', label: 'Lite', detail: 'Lighter, still creamy' },
  { id: 'sorbet', label: 'Sorbet', detail: 'Fruit-forward' },
  { id: 'gelato', label: 'Gelato', detail: 'Dense and silky' },
  { id: 'milkshake', label: 'Milkshake', detail: 'Drinkable and thick' },
  { id: 'smoothie-bowl', label: 'Smoothie bowl', detail: 'Spoonable and cold' },
];

const flavorOptions = ['Anything', 'Strawberry', 'Chocolate', 'Mint', 'Berry'];

type BuilderStep = 0 | 1 | 2 | 3 | 4;

export default function RecipeBuilderScreen() {
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { ready, ingredients, recipes, saveRecipe, settings, updateSettings } = useApp();
  const source = recipes.find((recipe) => recipe.id === params.recipeId);
  const initialized = useRef(false);
  const [step, setStep] = useState<BuilderStep>(source ? 3 : 0);
  const [name, setName] = useState(source?.name ?? 'My Creamy Creation');
  const [preferences, setPreferences] = useState<BuilderPreferences>({ style: source?.style ?? 'ice-cream', flavor: 'anything', craving: '' });
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [items, setItems] = useState<RecipeIngredient[]>(source?.ingredients ?? []);

  useEffect(() => {
    if (!ready || initialized.current) return;
    if (source) {
      setName(source.name);
      setPreferences((current) => ({ ...current, style: source.style }));
      setItems(source.ingredients);
    }
    initialized.current = true;
  }, [ready, source]);

  const recommendation = useMemo(() => recommendGuidedRecipe({ preferences, availableIngredientIds: availableIds, ingredients, machineId: settings.machineId }), [availableIds, ingredients, preferences, settings.machineId]);
  const selectedIds = useMemo(() => new Set(items.map((item) => item.ingredientId)), [items]);
  const nutrition = useMemo(() => calculateNutrition(items, ingredients), [ingredients, items]);
  const validation = useMemo(() => validateRecipe(items, ingredients, settings.machineId), [ingredients, items, settings.machineId]);
  const program = useMemo(() => recommendProgram({ style: preferences.style, nutrition, ingredients: items }, settings.machineId), [items, nutrition, preferences.style, settings.machineId]);

  const applyRecommendation = () => {
    setItems(recommendation.suggestedItems);
    setStep(3);
  };

  const applyTemplate = () => {
    const template = recipes.find((recipe) => recipe.isTemplate);
    if (!template) return;
    setName(template.name);
    setPreferences((current) => ({ ...current, style: template.style }));
    setItems(template.ingredients);
    setStep(3);
  };

  const togglePantry = (id: string) => setAvailableIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const adjust = (ingredientId: string, direction: 1 | -1) => setItems((current) => current.map((item) => {
    if (item.ingredientId !== ingredientId) return item;
    const stepSize = item.unit === 'tsp' ? 0.25 : item.unit === 'ml' ? 10 : 5;
    return { ...item, amount: Math.max(stepSize, Number((item.amount + stepSize * direction).toFixed(2))) };
  }));

  const submit = async () => {
    const selectedImage: Recipe['imageKey'] = selectedIds.has('cocoa') ? 'chocolate' : selectedIds.has('peppermint') ? 'mint' : selectedIds.has('cookie-pieces') ? 'cookies' : 'strawberry';
    const recipe = generateRecipe({ name, style: preferences.style, items, ingredients, existingId: source?.id, imageKey: source?.imageKey ?? selectedImage, favorite: source?.favorite });
    if (source) recipe.createdAt = source.createdAt;
    await saveRecipe(recipe);
    router.replace(`/recipe/${recipe.id}`);
  };

  if (!ready) return <LoadingScreen />;

  return (
    <Screen>
      <AppHeader title={source ? 'Edit recipe' : 'Build my pint'} subtitle={`Step ${step + 1} of 5`} left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / 5) * 100}%` }]} /></View>
      {step === 0 ? <GoalStep preferences={preferences} onPreferencesChange={setPreferences} onTemplate={applyTemplate} /> : null}
      {step === 1 ? <PantryStep ingredients={ingredients} availableIds={availableIds} onToggle={togglePantry} /> : null}
      {step === 2 ? <RecommendationStep recommendation={recommendation} onApply={applyRecommendation} /> : null}
      {step === 3 ? <AdjustStep name={name} onNameChange={setName} items={items} ingredients={ingredients} selectedIds={selectedIds} settings={settings} onAdjust={adjust} onMeasurementModeChange={(measurementMode) => { void updateSettings({ measurementMode }); }} onUnitSystemChange={(units) => { void updateSettings({ units }); }} /> : null}
      {step === 4 ? <ReviewStep nutrition={nutrition} validation={validation} program={program} items={items} ingredients={ingredients} settings={settings} /> : null}

      <View style={styles.footer}>
        {step > 0 ? <Pressable onPress={() => setStep((current) => (current - 1) as BuilderStep)} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Previous builder step"><Icon name="arrow-left" size={20} color={palette.textMuted} /><Text style={styles.backText}>Back</Text></Pressable> : <View />}
        {step < 4 ? <GradientButton title={step === 2 ? 'Use this recommendation' : 'Continue'} icon="arrow-right" onPress={() => step === 2 ? applyRecommendation() : setStep((current) => (current + 1) as BuilderStep)} /> : <GradientButton title={source ? 'Save changes' : 'Save recipe'} icon="content-save" disabled={validation.errors.length > 0 || items.length === 0} onPress={() => { void submit(); }} />}
      </View>
      <Text style={styles.legal}>Guidance is based on ingredient roles and stored label data. It is not medical advice or generative AI.</Text>
    </Screen>
  );
}

function GoalStep({ preferences, onPreferencesChange, onTemplate }: { preferences: BuilderPreferences; onPreferencesChange: (value: BuilderPreferences) => void; onTemplate: () => void }) {
  return <View>
    <Text style={styles.stepHeading}>What are you making?</Text>
    <Text style={styles.stepIntro}>Start with a goal. You can change every amount later.</Text>
    <Text style={styles.label}>Style</Text>
    <View style={styles.choiceGrid}>{stylesList.map((item) => <Pressable key={item.id} onPress={() => onPreferencesChange({ ...preferences, style: item.id })} style={[styles.choiceCard, preferences.style === item.id && styles.choiceCardActive]} accessibilityRole="radio" accessibilityState={{ selected: preferences.style === item.id }}><Text style={styles.choiceTitle}>{item.label}</Text><Text style={styles.choiceDetail}>{item.detail}</Text></Pressable>)}</View>
    <Text style={styles.label}>Flavor direction</Text>
    <View style={styles.pillRow}>{flavorOptions.map((flavor) => <Pill key={flavor} label={flavor} active={preferences.flavor === flavor.toLowerCase()} onPress={() => onPreferencesChange({ ...preferences, flavor: flavor.toLowerCase() })} />)}</View>
    <Text style={styles.label}>Optional craving note</Text>
    <TextInput value={preferences.craving} onChangeText={(craving) => onPreferencesChange({ ...preferences, craving })} placeholder="e.g. thick chocolate with cookie pieces" placeholderTextColor={palette.textFaint} style={styles.textInput} accessibilityLabel="Optional craving note" />
    <GlassCard style={styles.templateCard} onPress={onTemplate} accessibilityLabel="Use the Ultra-Thick Base template"><View style={styles.templateIcon}><Icon name="flask-empty-outline" size={25} color={palette.pink} /></View><View style={styles.templateCopy}><Text style={styles.templateTitle}>Start from Ultra-Thick Base</Text><Text style={styles.templateDetail}>Milk, almond milk, whey, cottage cheese, cream cheese, salt, and xanthan.</Text></View><Icon name="chevron-right" color={palette.textMuted} /></GlassCard>
  </View>;
}

function PantryStep({ ingredients, availableIds, onToggle }: { ingredients: Ingredient[]; availableIds: string[]; onToggle: (id: string) => void }) {
  return <View><Text style={styles.stepHeading}>What do you have?</Text><Text style={styles.stepIntro}>Tap ingredients already in your kitchen. We’ll separate missing items and helpful extras next.</Text>{categoryOrder.map((category) => { const options = ingredients.filter((ingredient) => ingredient.category === category); if (!options.length) return null; return <View key={category} style={styles.pantrySection}><Text style={styles.categoryTitle}>{ingredientCategoryLabels[category]}</Text><View style={styles.pillRow}>{options.map((ingredient) => <Pill key={ingredient.id} label={ingredient.name} active={availableIds.includes(ingredient.id)} onPress={() => onToggle(ingredient.id)} />)}</View></View>; })}</View>;
}

function RecommendationStep({ recommendation, onApply }: { recommendation: ReturnType<typeof recommendGuidedRecipe>; onApply: () => void }) {
  return <View><Text style={styles.stepHeading}>Here’s a starting point</Text><Text style={styles.stepIntro}>{recommendation.rationale}</Text><RecommendationGroup title="You have" items={recommendation.available} tone="success" /><RecommendationGroup title="You may need" items={recommendation.missing} tone="warning" /><RecommendationGroup title="Optional upgrades" items={recommendation.optional} tone="neutral" />{recommendation.warnings.map((warning) => <Text key={warning} style={styles.warning}>ⓘ {warning}</Text>)}<Pressable onPress={onApply} style={styles.helperButton} accessibilityRole="button" accessibilityLabel="Use this recommendation"><Icon name="creation" color={palette.pink} size={20} /><Text style={styles.helperButtonText}>Use this as my starting recipe</Text></Pressable></View>;
}

function RecommendationGroup({ title, items, tone }: { title: string; items: Ingredient[]; tone: 'success' | 'warning' | 'neutral' }) {
  if (!items.length) return null;
  const color = tone === 'success' ? palette.success : tone === 'warning' ? palette.warning : palette.lavender;
  return <View style={styles.recommendGroup}><Text style={[styles.groupTitle, { color }]}>{title}</Text>{items.map((item) => <View key={item.id} style={styles.recommendRow}><Icon name={tone === 'success' ? 'check-circle-outline' : tone === 'warning' ? 'cart-outline' : 'plus-circle-outline'} size={20} color={color} /><Text style={styles.recommendName}>{item.name}</Text><Text style={styles.recommendMeta}>{item.subtitle}</Text></View>)}</View>;
}

function AdjustStep({ name, onNameChange, items, ingredients, selectedIds, settings, onAdjust, onMeasurementModeChange, onUnitSystemChange }: { name: string; onNameChange: (value: string) => void; items: RecipeIngredient[]; ingredients: Ingredient[]; selectedIds: Set<string>; settings: UserSettings; onAdjust: (id: string, direction: 1 | -1) => void; onMeasurementModeChange: (mode: MeasurementMode) => void; onUnitSystemChange: (units: 'metric' | 'us') => void }) {
  return <View><Text style={styles.stepHeading}>Make it yours</Text><Text style={styles.stepIntro}>Fine-tune the recipe, then review the fill and nutrition before saving.</Text><Text style={styles.label}>Recipe name</Text><TextInput value={name} onChangeText={onNameChange} style={styles.textInput} accessibilityLabel="Recipe name" /><Text style={styles.label}>Measurements</Text><View style={styles.controlRow}><Pill label="Kitchen-friendly" active={settings.measurementMode === 'kitchen'} onPress={() => onMeasurementModeChange('kitchen')} /><Pill label="Exact" active={settings.measurementMode === 'exact'} onPress={() => onMeasurementModeChange('exact')} /><Pill label={settings.units === 'us' ? 'US' : 'Metric'} active onPress={() => onUnitSystemChange(settings.units === 'us' ? 'metric' : 'us')} /></View>{items.map((item) => { const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId); if (!ingredient || !selectedIds.has(item.ingredientId)) return null; return <GlassCard key={item.ingredientId} style={styles.selectedRow}><View style={styles.selectedCopy}><Text style={styles.selectedName}>{ingredient.name}</Text><Text style={styles.selectedMeta}>{ingredient.subtitle}</Text></View><View style={styles.counter}><Pressable onPress={() => onAdjust(item.ingredientId, -1)} accessibilityRole="button" accessibilityLabel={`Decrease ${ingredient.name}`} style={styles.counterButton}><Icon name="minus" size={18} /></Pressable><Text style={styles.amount}>{displayAmount(item.amount, item.unit, settings.units, settings.measurementMode)}</Text><Pressable onPress={() => onAdjust(item.ingredientId, 1)} accessibilityRole="button" accessibilityLabel={`Increase ${ingredient.name}`} style={styles.counterButton}><Icon name="plus" size={18} /></Pressable></View></GlassCard>; })}</View>;
}

function ReviewStep({ nutrition, validation, program, items, ingredients, settings }: { nutrition: Nutrition; validation: RecipeValidation; program: ReturnType<typeof recommendProgram>; items: RecipeIngredient[]; ingredients: Ingredient[]; settings: UserSettings }) {
  return <View><Text style={styles.stepHeading}>Review your pint</Text><Text style={styles.stepIntro}>This is a recommendation, not a guarantee. Follow your machine’s official fill line and instructions.</Text><NutritionStrip nutrition={nutrition} /><GlassCard style={styles.reviewCard}><View style={styles.reviewLine}><Text style={styles.reviewLabel}>Estimated fill</Text><Text style={styles.reviewValue}>{validation.estimatedVolumeMl} ml</Text></View>{validation.errors.map((error) => <Text key={error} style={styles.error}>! {error}</Text>)}{validation.warnings.map((warning) => <Text key={warning} style={styles.warning}>ⓘ {warning}</Text>)}</GlassCard><GlassCard style={styles.programCard}><Text style={styles.groupTitle}>Suggested program</Text><Text style={styles.programName}>{program.program.name}</Text><Text style={styles.programReason}>{program.reason}</Text></GlassCard><View style={styles.reviewList}>{items.map((item) => { const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId); return ingredient ? <Text key={item.ingredientId} style={styles.reviewIngredient}>{ingredient.name} · {displayAmount(item.amount, item.unit, settings.units, settings.measurementMode)}</Text> : null; })}</View></View>;
}

const styles = StyleSheet.create({
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: palette.panelRaised, overflow: 'hidden', marginBottom: spacing.lg },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: palette.pink },
  stepHeading: { ...textStyles.heading, fontSize: 26, lineHeight: 32 },
  stepIntro: { ...textStyles.body, marginTop: spacing.xs, marginBottom: spacing.md },
  label: { color: palette.textMuted, fontSize: 16, lineHeight: 21, fontWeight: '800', marginBottom: spacing.xs, marginTop: spacing.md },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceCard: { width: '47.5%', minHeight: 86, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, padding: spacing.sm, justifyContent: 'center' },
  choiceCardActive: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.16)' },
  choiceTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  choiceDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 18, marginTop: 3 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  textInput: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.md, fontSize: 16 },
  templateCard: { minHeight: 88, padding: spacing.sm, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  templateIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(241,78,155,0.14)', alignItems: 'center', justifyContent: 'center' },
  templateCopy: { flex: 1 },
  templateTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  templateDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 3 },
  pantrySection: { marginBottom: spacing.md },
  categoryTitle: { color: palette.text, fontSize: 18, lineHeight: 24, fontWeight: '900', marginBottom: spacing.xs },
  recommendGroup: { marginBottom: spacing.md },
  groupTitle: { fontSize: 17, lineHeight: 22, fontWeight: '900', marginBottom: spacing.xs },
  recommendRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: palette.border },
  recommendName: { color: palette.text, fontSize: 16, fontWeight: '800' },
  recommendMeta: { color: palette.textMuted, fontSize: 14, flex: 1 },
  warning: { color: palette.warning, fontSize: 15, lineHeight: 21, marginVertical: 3 },
  helperButton: { minHeight: 52, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.pink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  helperButtonText: { color: palette.text, fontSize: 16, fontWeight: '900' },
  controlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  selectedRow: { padding: spacing.sm, flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  selectedCopy: { flex: 1 },
  selectedName: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  selectedMeta: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  counterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(174,134,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  amount: { color: palette.text, minWidth: 86, fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  reviewCard: { padding: spacing.md, gap: spacing.xs, marginVertical: spacing.md },
  reviewLine: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewLabel: { color: palette.textMuted, fontSize: 16 },
  reviewValue: { color: palette.text, fontSize: 16, fontWeight: '900' },
  error: { color: palette.danger, fontSize: 15, lineHeight: 21 },
  programCard: { padding: spacing.md, marginBottom: spacing.md },
  programName: { color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '900' },
  programReason: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginTop: 3 },
  reviewList: { gap: spacing.xs },
  reviewIngredient: { color: palette.textMuted, fontSize: 15, lineHeight: 21 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xl },
  backButton: { minHeight: 52, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { color: palette.textMuted, fontSize: 16, fontWeight: '800' },
  legal: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint, marginTop: spacing.md },
});
