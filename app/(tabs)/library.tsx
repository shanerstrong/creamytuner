import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, EmptyState, GlassCard, Icon, IconButton, Pill, Screen, SearchField, type IconName } from '@/src/components/ui';
import { ingredientCategoryLabels } from '@/src/data/ingredients';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { Ingredient, IngredientCategory } from '@/src/types';

const categories: { id: 'all' | IngredientCategory; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'protein', label: 'Protein' }, { id: 'base', label: 'Milk & bases' },
  { id: 'sweetener', label: 'Sweeteners' }, { id: 'stabilizer', label: 'Stabilizers' }, { id: 'fruit', label: 'Fruit' },
  { id: 'flavoring', label: 'Flavorings' }, { id: 'mix-in', label: 'Mix-ins' },
];
const sorts = [{ id: 'popular', label: 'Popular' }, { id: 'az', label: 'A–Z' }, { id: 'protein', label: 'Highest protein' }, { id: 'calories', label: 'Lowest calories' }] as const;
type SortId = typeof sorts[number]['id'];
const categoryIcons: Record<IngredientCategory, IconName> = { protein: 'arm-flex', base: 'cup-water', sweetener: 'spoon-sugar', stabilizer: 'blur', fruit: 'fruit-cherries', flavoring: 'shaker-outline', 'mix-in': 'cookie' };

function IngredientItem({ ingredient, grid }: { ingredient: Ingredient; grid: boolean }) {
  const card = (
    <GlassCard onPress={() => router.push(`/ingredient/${ingredient.id}` as never)} accessibilityLabel={`View ${ingredient.name} details`} style={[styles.item, grid && styles.gridItemInner]}>
      <View style={[styles.itemContent, grid && styles.gridItemContent]}>
        <View style={[styles.ingredientIcon, grid && styles.gridIcon]}><Icon name={categoryIcons[ingredient.category]} color={ingredient.isCustom ? palette.cyan : palette.lavender} /></View>
        <View style={styles.copy}>
          <View style={styles.nameRow}><Text style={styles.name}>{ingredient.name}</Text>{ingredient.isCustom ? <Text style={styles.custom}>MY ITEM</Text> : null}</View>
          <Text style={styles.meta}>{ingredient.brand || ingredient.subtitle || ingredientCategoryLabels[ingredient.category]}</Text>
          <Text style={styles.benefit}>{Math.round(ingredient.nutrition.calories)} cal · {Number(ingredient.nutrition.protein.toFixed(1))} g protein</Text>
        </View>
        {!grid ? <Icon name="chevron-right" color={palette.textFaint} /> : null}
      </View>
    </GlassCard>
  );
  return grid ? <View style={styles.gridCell}>{card}</View> : card;
}

export default function IngredientLibraryScreen() {
  const { ingredients, settings, updateSettings } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | IngredientCategory>('all');
  const [sort, setSort] = useState<SortId>('popular');
  const filtered = useMemo(() => ingredients.filter((ingredient) => {
    const needle = query.trim().toLowerCase();
    return (category === 'all' || ingredient.category === category) && (!needle || `${ingredient.name} ${ingredient.subtitle} ${ingredient.brand ?? ''} ${(ingredient.tags ?? []).join(' ')}`.toLowerCase().includes(needle));
  }).sort((a, b) => {
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    if (sort === 'az') return a.name.localeCompare(b.name);
    if (sort === 'protein') return (b.nutrition.protein / b.referenceAmount) - (a.nutrition.protein / a.referenceAmount);
    if (sort === 'calories') return (a.nutrition.calories / a.referenceAmount) - (b.nutrition.calories / b.referenceAmount);
    return (a.popularityRank ?? 999) - (b.popularityRank ?? 999);
  }), [category, ingredients, query, sort]);
  const custom = filtered.filter((item) => item.isCustom);
  const bundled = filtered.filter((item) => !item.isCustom);
  const grid = settings.ingredientLibraryView === 'grid';

  return (
    <Screen>
      <AppHeader title="Ingredient Library" subtitle={`${ingredients.length} offline references`} right={<IconButton icon="plus" label="Add custom ingredient" onPress={() => router.push('/ingredient-new')} />} />
      <SearchField value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{categories.map((item) => <Pill key={item.id} label={item.label} active={category === item.id} onPress={() => setCategory(item.id)} />)}</ScrollView>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroller} contentContainerStyle={styles.sortRow}>{sorts.map((item) => <Pill key={item.id} label={item.label} active={sort === item.id} onPress={() => setSort(item.id)} />)}</ScrollView>
        <View style={styles.viewToggle} accessibilityRole="radiogroup">
          <Pressable onPress={() => updateSettings({ ingredientLibraryView: 'list' })} style={[styles.viewButton, !grid && styles.viewButtonActive]} accessibilityRole="radio" accessibilityState={{ selected: !grid }} accessibilityLabel="List view"><Icon name="view-list" size={21} color={!grid ? palette.text : palette.textMuted} /></Pressable>
          <Pressable onPress={() => updateSettings({ ingredientLibraryView: 'grid' })} style={[styles.viewButton, grid && styles.viewButtonActive]} accessibilityRole="radio" accessibilityState={{ selected: grid }} accessibilityLabel="Grid view"><Icon name="view-grid" size={21} color={grid ? palette.text : palette.textMuted} /></Pressable>
        </View>
      </View>
      {!filtered.length ? <EmptyState icon="magnify-close" title="No ingredients found" message="Try another search or clear a category filter." action="Clear filters" onAction={() => { setQuery(''); setCategory('all'); }} /> : null}
      {custom.length ? <><Text style={styles.groupTitle}>My ingredients</Text><View style={[styles.list, grid && styles.grid]}>{custom.map((item) => <IngredientItem key={item.id} ingredient={item} grid={grid} />)}</View></> : null}
      {bundled.length ? <><Text style={styles.groupTitle}>{custom.length ? 'Creamy Tuner library' : 'Ingredients'}</Text><View style={[styles.list, grid && styles.grid]}>{bundled.map((item) => <IngredientItem key={item.id} ingredient={item} grid={grid} />)}</View></> : null}
      <Text style={styles.disclaimer}>Nutrition is informational and may change. For branded foods, compare the saved reference with the current package label.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { gap: spacing.xs, paddingVertical: spacing.md, paddingRight: spacing.md },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  sortScroller: { flex: 1 },
  sortRow: { gap: spacing.xs, paddingRight: spacing.sm },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, overflow: 'hidden' },
  viewButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelSoft },
  viewButtonActive: { backgroundColor: palette.panelRaised },
  groupTitle: { color: palette.text, fontSize: 21, lineHeight: 27, fontWeight: '800', marginTop: spacing.sm, marginBottom: spacing.xs },
  list: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'stretch' },
  item: { padding: spacing.sm },
  itemContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gridCell: { width: '48.5%' },
  gridItemInner: { minHeight: 190 },
  gridItemContent: { flex: 1, flexDirection: 'column', alignItems: 'flex-start' },
  ingredientIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.12)' },
  gridIcon: { width: 44, height: 44 },
  copy: { flex: 1, width: '100%' },
  nameRow: { gap: spacing.xs },
  name: { color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  custom: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.4 },
  meta: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  benefit: { color: palette.warning, fontSize: 13, lineHeight: 19, marginTop: 4 },
  disclaimer: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.lg },
});
