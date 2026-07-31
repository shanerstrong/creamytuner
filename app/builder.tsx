import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, NutritionStrip, Pill, Screen, textStyles, type IconName } from '@/src/components/ui';
import { ingredientCategoryLabels } from '@/src/data/ingredients';
import { calculateNutrition, displayAmount } from '@/src/domain/nutrition';
import { generateRecipe, validateRecipe } from '@/src/domain/generator';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { IngredientCategory, Recipe, RecipeIngredient, RecipeStyle } from '@/src/types';

const categoryOrder: IngredientCategory[] = ['protein', 'base', 'sweetener', 'stabilizer', 'fruit', 'flavoring', 'mix-in'];
const categoryIcons: Record<IngredientCategory, IconName> = { protein: 'arm-flex', base: 'cup-water', sweetener: 'spoon-sugar', stabilizer: 'blur', fruit: 'fruit-cherries', flavoring: 'shaker-outline', 'mix-in': 'cookie' };
const stylesList: { id: RecipeStyle; label: string }[] = [
  { id: 'ice-cream', label: 'Ice Cream' }, { id: 'lite-ice-cream', label: 'Lite' }, { id: 'sorbet', label: 'Sorbet' }, { id: 'gelato', label: 'Gelato' }, { id: 'milkshake', label: 'Milkshake' }, { id: 'smoothie-bowl', label: 'Smoothie Bowl' },
];

const defaultItems: RecipeIngredient[] = [
  { ingredientId: 'whey-vanilla', amount: 25, unit: 'g' },
  { ingredientId: 'milk-2', amount: 300, unit: 'ml' },
  { ingredientId: 'allulose', amount: 15, unit: 'g' },
  { ingredientId: 'guar-gum', amount: 0.25, unit: 'tsp' },
  { ingredientId: 'vanilla', amount: 1, unit: 'tsp' },
];

export default function RecipeBuilderScreen() {
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { ready, ingredients, recipes, saveRecipe, settings } = useApp();
  const source = recipes.find((recipe) => recipe.id === params.recipeId);
  const initialized = useRef(false);
  const [name, setName] = useState(source?.name ?? 'My Creamy Creation');
  const [style, setStyle] = useState<RecipeStyle>(source?.style ?? 'lite-ice-cream');
  const [items, setItems] = useState<RecipeIngredient[]>(source?.ingredients ?? defaultItems);
  const nutrition = useMemo(() => calculateNutrition(items, ingredients), [ingredients, items]);
  const validation = useMemo(() => validateRecipe(items, ingredients, settings.machineId), [ingredients, items, settings.machineId]);

  useEffect(() => {
    if (!ready || initialized.current) return;
    if (source) {
      setName(source.name);
      setStyle(source.style);
      setItems(source.ingredients);
    }
    initialized.current = true;
  }, [ready, source]);

  const selectedIds = useMemo(() => new Set(items.map((item) => item.ingredientId)), [items]);
  const choose = (ingredientId: string) => {
    const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);
    if (!ingredient) return;
    if (selectedIds.has(ingredientId)) setItems((current) => current.filter((item) => item.ingredientId !== ingredientId));
    else setItems((current) => [...current, { ingredientId, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }]);
  };
  const adjust = (ingredientId: string, direction: 1 | -1) => setItems((current) => current.map((item) => {
    if (item.ingredientId !== ingredientId) return item;
    const step = item.unit === 'tsp' ? 0.25 : item.unit === 'ml' ? 10 : 5;
    return { ...item, amount: Math.max(step, Number((item.amount + step * direction).toFixed(2))) };
  }));

  const submit = async () => {
    const selectedImage: Recipe['imageKey'] = selectedIds.has('cocoa') ? 'chocolate' : selectedIds.has('peppermint') ? 'mint' : selectedIds.has('cookie-pieces') ? 'cookies' : 'strawberry';
    const recipe = generateRecipe({ name, style, items, ingredients, existingId: source?.id, imageKey: source?.imageKey ?? selectedImage, favorite: source?.favorite });
    if (source) recipe.createdAt = source.createdAt;
    await saveRecipe(recipe);
    router.replace(`/recipe/${recipe.id}`);
  };

  if (!ready) return <LoadingScreen />;

  return (
    <Screen>
      <AppHeader title={source ? 'Edit Recipe' : 'Build a Pint'} subtitle="Add your ingredients" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <Text style={styles.label}>Recipe name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.nameInput} placeholderTextColor={palette.textFaint} accessibilityLabel="Recipe name" />
      <Text style={styles.label}>Recipe style</Text>
      <View style={styles.styleRow}>{stylesList.map((item) => <Pill key={item.id} label={item.label} active={style === item.id} onPress={() => setStyle(item.id)} />)}</View>
      {categoryOrder.map((category) => {
        const options = ingredients.filter((ingredient) => ingredient.category === category);
        if (!options.length) return null;
        return (
          <View key={category} style={styles.category}>
            <View style={styles.categoryHeader}><View style={styles.categoryIcon}><Icon name={categoryIcons[category]} size={20} color={palette.lavender} /></View><Text style={styles.categoryTitle}>{ingredientCategoryLabels[category]}</Text><Text style={styles.optional}>{category === 'base' ? 'REQUIRED' : 'OPTIONAL'}</Text></View>
            <View style={styles.optionRow}>{options.map((ingredient) => <Pill key={ingredient.id} label={ingredient.name} active={selectedIds.has(ingredient.id)} onPress={() => choose(ingredient.id)} />)}</View>
            {items.filter((item) => options.some((option) => option.id === item.ingredientId)).map((item) => {
              const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId)!;
              return (
                <GlassCard key={item.ingredientId} style={styles.selectedRow}>
                  <View style={styles.selectedCopy}><Text style={styles.selectedName}>{ingredient.name}</Text><Text style={styles.selectedMeta}>{ingredient.subtitle}</Text></View>
                  <View style={styles.counter}>
                    <Pressable onPress={() => adjust(item.ingredientId, -1)} accessibilityLabel={`Decrease ${ingredient.name}`} style={styles.counterButton}><Icon name="minus" size={17} /></Pressable>
                    <Text style={styles.amount}>{displayAmount(item.amount, item.unit, settings.units)}</Text>
                    <Pressable onPress={() => adjust(item.ingredientId, 1)} accessibilityLabel={`Increase ${ingredient.name}`} style={styles.counterButton}><Icon name="plus" size={17} /></Pressable>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        );
      })}
      <NutritionStrip nutrition={nutrition} />
      <GlassCard style={styles.validation}>
        <View style={styles.fillRow}><Text style={styles.fillLabel}>Estimated fill</Text><Text style={styles.fillValue}>{validation.estimatedVolumeMl} ml</Text></View>
        {validation.errors.map((error) => <Text key={error} style={styles.error}>• {error}</Text>)}
        {validation.warnings.map((warning) => <Text key={warning} style={styles.warning}>• {warning}</Text>)}
      </GlassCard>
      <GradientButton title={source ? 'Save Changes' : 'Generate Recipe'} icon="creation" disabled={validation.errors.length > 0 || items.length === 0} onPress={submit} />
      <Text style={styles.legal}>Guidance is based on ingredient roles and stored label data, not generative AI.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: palette.textMuted, fontSize: 12, fontWeight: '700', marginBottom: spacing.xs, marginTop: spacing.sm },
  nameInput: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 16, fontWeight: '700' },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  category: { marginVertical: spacing.sm },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  categoryIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.12)' },
  categoryTitle: { color: palette.text, fontSize: 14, fontWeight: '800', flex: 1 },
  optional: { color: palette.textFaint, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
  selectedRow: { padding: spacing.xs, paddingLeft: spacing.sm, flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  selectedCopy: { flex: 1 },
  selectedName: { color: palette.text, fontSize: 12, fontWeight: '800' },
  selectedMeta: { color: palette.textMuted, fontSize: 10, marginTop: 1 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterButton: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(174,134,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  amount: { color: palette.text, minWidth: 58, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  validation: { padding: spacing.sm, gap: 5, marginVertical: spacing.md },
  fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fillLabel: { color: palette.textMuted, fontSize: 12 },
  fillValue: { color: palette.text, fontSize: 12, fontWeight: '800' },
  error: { color: palette.danger, fontSize: 11, lineHeight: 16 },
  warning: { color: palette.warning, fontSize: 11, lineHeight: 16 },
  legal: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint, marginTop: spacing.sm },
});
