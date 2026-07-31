import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionCard, BrandWordmark, GlassCard, IconButton, RecipeCard, Screen, SectionTitle, textStyles } from '@/src/components/ui';
import { machineById } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import { palette, spacing } from '@/src/theme';

export default function HomeScreen() {
  const { recipes, settings, toggleFavorite } = useApp();
  const machine = machineById(settings.machineId);
  const recent = recipes.slice(0, 2);
  return (
    <Screen>
      <View style={styles.topbar}>
        <BrandWordmark />
        <IconButton icon="cog-outline" label="Open settings" onPress={() => router.push('/settings')} />
      </View>
      <Text style={styles.welcome}>Welcome back, creator!</Text>
      <Text style={styles.question}>What would you like to do?</Text>
      <GlassCard style={styles.machineBanner} onPress={() => router.push('/machines')} accessibilityLabel="Change selected machine">
        <View><Text style={styles.machineLabel}>ACTIVE MACHINE</Text><Text style={styles.machineName}>{machine.name}</Text></View>
        <Text style={styles.change}>Change</Text>
      </GlassCard>
      <View style={styles.grid}>
        <View style={styles.cell}><ActionCard icon="ice-cream" title="Build a Pint" subtitle="Create a balanced frozen treat" tone="pink" onPress={() => router.push('/builder')} /></View>
        <View style={styles.cell}><ActionCard icon="tune-vertical" title="Which Program?" subtitle="Find the best machine setting" tone="purple" onPress={() => router.push('/program')} /></View>
        <View style={styles.cell}><ActionCard icon="snowflake-alert" title="Fix My Pint" subtitle="Troubleshoot texture issues" tone="blue" onPress={() => router.push('/troubleshoot')} /></View>
        <View style={styles.cell}><ActionCard icon="book-heart" title="Saved Recipes" subtitle="Browse your frozen creations" tone="purple" onPress={() => router.push('/(tabs)/recipes')} /></View>
        <View style={styles.cell}><ActionCard icon="bookshelf" title="Ingredient Library" subtitle="Explore ingredients and tips" tone="gold" onPress={() => router.push('/(tabs)/library')} /></View>
        <View style={styles.cell}><ActionCard icon="record-circle-outline" title="Live Spin" subtitle="Step-by-step spin guidance" tone="pink" onPress={() => router.push('/(tabs)/spin')} /></View>
      </View>
      <SectionTitle title="Recent recipes" action="View all" onAction={() => router.push('/(tabs)/recipes')} />
      <View style={styles.recipeRow}>
        {recent.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onPress={() => router.push(`/recipe/${recipe.id}`)} onFavorite={() => toggleFavorite(recipe.id)} />)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcome: { ...textStyles.heading, marginTop: spacing.sm },
  question: { ...textStyles.body, marginTop: 2, marginBottom: spacing.md },
  machineBanner: { padding: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  machineLabel: { color: palette.lavender, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  machineName: { color: palette.text, fontSize: 12, fontWeight: '700', marginTop: 2 },
  change: { color: palette.pink, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '48.2%' },
  recipeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
});
