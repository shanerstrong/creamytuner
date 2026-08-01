import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, GlassCard, Icon, IconButton, Pill, Screen, SearchField, type IconName } from '@/src/components/ui';
import { ingredientCategoryLabels } from '@/src/data/ingredients';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { IngredientCategory } from '@/src/types';

const categories: { id: 'all' | IngredientCategory; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'protein', label: 'Protein' }, { id: 'base', label: 'Milk' },
  { id: 'stabilizer', label: 'Gums' }, { id: 'sweetener', label: 'Sweeteners' }, { id: 'fruit', label: 'Fruit' },
];
const categoryIcons: Record<IngredientCategory, IconName> = { protein: 'arm-flex', base: 'cup-water', sweetener: 'spoon-sugar', stabilizer: 'blur', fruit: 'fruit-cherries', flavoring: 'shaker-outline', 'mix-in': 'cookie' };

export default function IngredientLibraryScreen() {
  const { ingredients } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | IngredientCategory>('all');
  const filtered = useMemo(() => ingredients.filter((ingredient) => {
    const matchesCategory = category === 'all' || ingredient.category === category;
    const needle = query.toLowerCase();
    return matchesCategory && `${ingredient.name} ${ingredient.subtitle}`.toLowerCase().includes(needle);
  }), [category, ingredients, query]);

  return (
    <Screen>
      <AppHeader title="Ingredient Library" right={<IconButton icon="plus" label="Add custom ingredient" onPress={() => router.push('/ingredient-new')} />} />
      <SearchField value={query} onChangeText={setQuery} />
      <View style={styles.filters}>{categories.map((item) => <Pill key={item.id} label={item.label} active={category === item.id} onPress={() => setCategory(item.id)} />)}</View>
      <View style={styles.list}>
        {filtered.map((ingredient) => (
          <GlassCard key={ingredient.id} style={styles.row}>
            <View style={styles.ingredientIcon}><Icon name={categoryIcons[ingredient.category]} color={ingredient.isCustom ? palette.cyan : palette.lavender} /></View>
            <View style={styles.copy}>
              <View style={styles.nameRow}><Text style={styles.name}>{ingredient.name}</Text>{ingredient.isCustom ? <Text style={styles.custom}>CUSTOM</Text> : null}</View>
              <Text style={styles.meta}>{ingredient.subtitle || ingredientCategoryLabels[ingredient.category]}</Text>
              <Text style={styles.benefit}>{ingredient.rating ? `★ ${ingredient.rating.toFixed(1)}  ·  ` : ''}{ingredient.benefit ?? `${Math.round(ingredient.nutrition.calories)} cal · ${Math.round(ingredient.nutrition.protein)}g protein per reference`}</Text>
            </View>
            <Icon name="chevron-right" color={palette.textFaint} />
          </GlassCard>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.md },
  list: { gap: spacing.xs },
  row: { padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ingredientIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.12)' },
  copy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  custom: { color: palette.cyan, fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  meta: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  benefit: { color: palette.warning, fontSize: 14, lineHeight: 19, marginTop: 4 },
});
