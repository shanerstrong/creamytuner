import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { NutritionFactsPanel } from '@/src/components/nutrition';
import { AppHeader, EmptyState, GlassCard, GradientButton, IconButton, LoadingScreen, Screen } from '@/src/components/ui';
import { ingredientCategoryLabels } from '@/src/data/ingredients';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';

function BulletList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <GlassCard style={styles.card}><Text style={styles.sectionTitle}>{title}</Text>{items.length ? items.map((item) => <Text key={item} style={styles.bullet}>• {item}</Text>) : <Text style={styles.muted}>{empty}</Text>}</GlassCard>;
}

export default function IngredientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ingredients, ready } = useApp();
  if (!ready) return <LoadingScreen />;
  const ingredient = ingredients.find((item) => item.id === id);
  if (!ingredient) return <Screen><AppHeader title="Ingredient" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><EmptyState icon="flask-empty-off-outline" title="Ingredient not found" message="It may have been deleted or is no longer part of this offline library." action="Back to library" onAction={() => router.replace('/library')} /></Screen>;

  const uses = ingredient.typicalUses?.length ? ingredient.typicalUses : [ingredient.benefit || 'Use as part of a balanced frozen-dessert base.'];
  return (
    <Screen>
      <AppHeader title="Ingredient details" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <Text style={styles.name}>{ingredient.name}</Text>
      <Text style={styles.meta}>{ingredient.brand ? `${ingredient.brand} · ` : ''}{ingredientCategoryLabels[ingredient.category]}</Text>
      <Text style={styles.description}>{ingredient.description || ingredient.subtitle || 'Bundled offline ingredient reference.'}</Text>
      <NutritionFactsPanel nutrition={ingredient.nutrition} servingLabel={ingredient.referenceLabel || `${ingredient.referenceAmount} ${ingredient.defaultUnit}`} />
      <BulletList title="Texture role & typical uses" items={uses} empty="No uses recorded yet." />
      <BulletList title="Suggested substitutions" items={ingredient.substitutions ?? []} empty="No specific substitutions recorded. Browse the same category for alternatives." />
      <BulletList title="Cautions" items={ingredient.cautions ?? []} empty="No ingredient-specific cautions recorded. Always check your package for allergens." />
      <GlassCard style={styles.card}><Text style={styles.sectionTitle}>Reference source</Text>{ingredient.sourceUrl ? <><Text style={styles.source}>Checked {ingredient.sourceCheckedAt || 'date not recorded'}. Manufacturer formulations may change.</Text><GradientButton title="Open manufacturer source" icon="open-in-new" variant="secondary" onPress={() => Linking.openURL(ingredient.sourceUrl ?? '')} /></> : <Text style={styles.muted}>No manufacturer source is recorded for this general reference. Compare against your own label.</Text>}</GlassCard>
      <Text style={styles.disclaimer}>CreamyTuner is not affiliated with the manufacturers listed. Nutrition is informational, not medical advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: palette.text, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  meta: { color: palette.pink, fontSize: 15, lineHeight: 21, fontWeight: '800', marginTop: 3 },
  description: { color: palette.textMuted, fontSize: 16, lineHeight: 24, marginVertical: spacing.md },
  card: { padding: spacing.md, marginTop: spacing.md, gap: spacing.xs },
  sectionTitle: { color: palette.text, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  bullet: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
  muted: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
  source: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.xs },
  disclaimer: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.lg },
});
