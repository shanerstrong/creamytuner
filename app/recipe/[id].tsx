import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, View } from 'react-native';

import { recipeImages } from '@/src/assets';
import { AppHeader, EmptyState, GlassCard, GradientButton, IconButton, LoadingScreen, NutritionStrip, Pill, Screen, textStyles } from '@/src/components/ui';
import { displayAmount } from '@/src/domain/nutrition';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

type DetailTab = 'ingredients' | 'directions' | 'nutrition' | 'notes';

export default function RecipeDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { ready, recipes, ingredients, settings, toggleFavorite, deleteRecipe, duplicateRecipe } = useApp();
  const recipe = recipes.find((candidate) => candidate.id === params.id);
  const [tab, setTab] = useState<DetailTab>('ingredients');

  if (!ready) return <LoadingScreen />;
  if (!recipe) return <Screen><AppHeader title="Recipe" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><EmptyState icon="alert-circle-outline" title="Recipe not found" message="It may have been deleted from this device." action="Saved Recipes" onAction={() => router.replace('/(tabs)/recipes')} /></Screen>;

  const confirmDelete = () => Alert.alert('Delete recipe?', 'This removes the recipe from this device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRecipe(recipe.id); router.replace('/(tabs)/recipes'); } },
  ]);

  return (
    <Screen contentStyle={styles.screenContent}>
      <AppHeader title="Recipe Details" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} right={<IconButton icon={recipe.favorite ? 'heart' : 'heart-outline'} color={recipe.favorite ? palette.pink : palette.text} label="Toggle favorite" onPress={() => toggleFavorite(recipe.id)} />} />
      <ImageBackground source={recipeImages[recipe.imageKey]} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={['transparent', 'rgba(8,12,31,0.97)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}>{recipe.isTemplate ? <Text style={styles.template}>STARTER TEMPLATE</Text> : null}<Text style={styles.title}>{recipe.name}</Text><Text style={styles.style}>{recipe.style.replaceAll('-', ' ')}</Text></View>
      </ImageBackground>
      <NutritionStrip nutrition={recipe.nutrition} />
      <View style={styles.actions}>
        <Pill label="Edit" onPress={() => router.push(`/builder?recipeId=${recipe.id}`)} />
        <Pill label="Duplicate" onPress={async () => { const copy = await duplicateRecipe(recipe.id); if (copy) router.replace(`/recipe/${copy.id}`); }} />
        <Pill label="Delete" onPress={confirmDelete} />
      </View>
      <View style={styles.tabs}>
        {(['ingredients', 'directions', 'nutrition', 'notes'] as DetailTab[]).map((item) => <Pill key={item} label={item[0].toUpperCase() + item.slice(1)} active={tab === item} onPress={() => setTab(item)} />)}
      </View>
      <GlassCard style={styles.detailCard}>
        {tab === 'ingredients' ? recipe.ingredients.map((item) => {
          const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
          return <View key={item.ingredientId} style={styles.ingredientRow}><Text style={styles.ingredientName}>{ingredient?.name ?? 'Unknown ingredient'}</Text><Text style={styles.ingredientAmount}>{displayAmount(item.amount, item.unit, settings.units, settings.measurementMode)}</Text></View>;
        }) : null}
        {tab === 'directions' ? recipe.directions.map((direction, index) => <View key={direction} style={styles.direction}><View style={styles.directionNumber}><Text style={styles.directionNumberText}>{index + 1}</Text></View><Text style={styles.directionText}>{direction}</Text></View>) : null}
        {tab === 'nutrition' ? <View style={styles.nutritionDetails}><DetailMetric label="Calories" value={`${recipe.nutrition.calories}`} /><DetailMetric label="Protein" value={`${recipe.nutrition.protein} g`} /><DetailMetric label="Carbohydrates" value={`${recipe.nutrition.carbs} g`} /><DetailMetric label="Sugar" value={`${recipe.nutrition.sugar} g`} /><DetailMetric label="Fat" value={`${recipe.nutrition.fat} g`} /><DetailMetric label="Fiber" value={`${recipe.nutrition.fiber} g`} /></View> : null}
        {tab === 'notes' ? <Text style={styles.notes}>{recipe.notes || 'No notes yet.'}</Text> : null}
      </GlassCard>
      <View style={styles.bottomActions}>
        <GradientButton title="Choose Program" variant="secondary" onPress={() => router.push(`/program?recipeId=${recipe.id}`)} />
        <GradientButton title="Spin It Now" icon="record-circle-outline" onPress={() => router.push(`/(tabs)/spin?recipeId=${recipe.id}`)} />
      </View>
    </Screen>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailMetric}><Text style={styles.detailMetricLabel}>{label}</Text><Text style={styles.detailMetricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0 },
  hero: { height: 280, justifyContent: 'flex-end', marginBottom: spacing.md },
  heroImage: { borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  heroCopy: { padding: spacing.lg },
  title: { ...textStyles.title, fontSize: 27, lineHeight: 31, maxWidth: '90%' },
  template: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.xs },
  style: { color: palette.pink, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'flex-end', marginTop: spacing.sm, paddingHorizontal: spacing.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.md, paddingHorizontal: spacing.md },
  detailCard: { marginHorizontal: spacing.md, paddingHorizontal: spacing.md, minHeight: 170 },
  ingredientRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  ingredientName: { color: palette.text, fontSize: 16, lineHeight: 21, flex: 1 },
  ingredientAmount: { color: palette.textMuted, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  direction: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  directionNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(241,78,155,0.2)', alignItems: 'center', justifyContent: 'center' },
  directionNumberText: { color: palette.pink, fontWeight: '900' },
  directionText: { ...textStyles.body, flex: 1, fontSize: 16, lineHeight: 24 },
  nutritionDetails: { paddingVertical: spacing.xs },
  detailMetric: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  detailMetricLabel: { color: palette.textMuted, fontSize: 16 },
  detailMetricValue: { color: palette.text, fontSize: 16, fontWeight: '800' },
  notes: { ...textStyles.body, paddingVertical: spacing.md },
  bottomActions: { gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.md },
});
