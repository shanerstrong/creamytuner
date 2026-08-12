import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, EmptyState, IconButton, Pill, RecipeCard, Screen, SearchField } from '@/src/components/ui';
import { useApp } from '@/src/providers/app-provider';
import { getRecipeEligibility } from '@/src/domain/dietary';
import { palette, radii, spacing } from '@/src/theme';

type Filter = 'all' | 'favorites' | 'protein' | 'low-cal';

export default function SavedRecipesScreen() {
  const { recipes, ingredients, settings, toggleFavorite } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => recipes.filter((recipe) => {
    const matchesQuery = recipe.name.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === 'favorites') return recipe.favorite;
    if (filter === 'protein') return recipe.nutrition.protein >= 25;
    if (filter === 'low-cal') return recipe.nutrition.calories <= 350;
    return true;
  }), [filter, query, recipes]);

  return (
    <Screen>
      <AppHeader title="Saved Recipes" right={<IconButton icon="plus" label="Build a new recipe" onPress={() => router.push('/builder')} />} />
      <SearchField value={query} onChangeText={setQuery} placeholder="Search saved recipes..." />
      <View style={styles.filters}>
        <Pill label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill label="Favorites" active={filter === 'favorites'} onPress={() => setFilter('favorites')} />
        <Pill label="High Protein" active={filter === 'protein'} onPress={() => setFilter('protein')} />
        <Pill label="Low Cal" active={filter === 'low-cal'} onPress={() => setFilter('low-cal')} />
      </View>
      {filtered.length ? <View style={styles.grid}>{filtered.map((recipe) => { const conflicts = getRecipeEligibility(recipe, ingredients, settings); return <View key={recipe.id} style={styles.recipeWrap}><RecipeCard recipe={recipe} wide onPress={() => router.push(`/recipe/${recipe.id}`)} onFavorite={() => toggleFavorite(recipe.id)} />{conflicts.length ? <View style={styles.warning}><Text style={styles.warningText}>ALLERGY CHECK</Text></View> : null}</View>; })}</View> : <EmptyState icon="ice-cream-off" title="No recipes found" message="Try a different filter or build a new pint." action="Build a Pint" onAction={() => router.push('/builder')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  recipeWrap: { width: '48%', position: 'relative' },
  warning: { position: 'absolute', left: 6, top: 6, borderRadius: radii.pill, backgroundColor: palette.danger, paddingHorizontal: 7, paddingVertical: 4 },
  warningText: { color: palette.white, fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 0.4 },
});
