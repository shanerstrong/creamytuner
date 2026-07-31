import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, EmptyState, IconButton, Pill, RecipeCard, Screen, SearchField } from '@/src/components/ui';
import { useApp } from '@/src/providers/app-provider';
import { spacing } from '@/src/theme';

type Filter = 'all' | 'favorites' | 'protein' | 'low-cal';

export default function SavedRecipesScreen() {
  const { recipes, toggleFavorite } = useApp();
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
      {filtered.length ? <View style={styles.grid}>{filtered.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onPress={() => router.push(`/recipe/${recipe.id}`)} onFavorite={() => toggleFavorite(recipe.id)} />)}</View> : <EmptyState icon="ice-cream-off" title="No recipes found" message="Try a different filter or build a new pint." action="Build a Pint" onAction={() => router.push('/builder')} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
});
