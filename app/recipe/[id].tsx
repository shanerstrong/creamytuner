import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { recipeImages } from '@/src/assets';
import { NutritionFactsPanel, NutritionSummary } from '@/src/components/nutrition';
import { FreezeTimerCard } from '@/src/components/freeze-timer-card';
import { AppHeader, EmptyState, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, Screen, textStyles } from '@/src/components/ui';
import { displayAmount } from '@/src/domain/nutrition';
import { useApp } from '@/src/providers/app-provider';
import { cancelFreezeReminder } from '@/src/services/freeze-reminder';
import { palette, radii, spacing } from '@/src/theme';

type DetailTab = 'ingredients' | 'directions' | 'nutrition' | 'notes';

export default function RecipeDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { ready, recipes, ingredients, settings, updateSettings, toggleFavorite, deleteRecipe, duplicateRecipe } = useApp();
  const recipe = recipes.find((candidate) => candidate.id === params.id);
  const [tab, setTab] = useState<DetailTab>('ingredients');
  if (!ready) return <LoadingScreen />;
  if (!recipe) return <Screen><AppHeader title="Recipe" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><EmptyState icon="alert-circle-outline" title="Recipe not found" message="It may have been deleted from this device." action="Saved Recipes" onAction={() => router.replace('/(tabs)/recipes')} /></Screen>;

  const confirmDelete = () => Alert.alert('Delete recipe?', 'This removes the recipe from this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
    if (settings.activeFreezeTimer?.recipeId === recipe.id) {
      await cancelFreezeReminder(settings.activeFreezeTimer.notificationId);
      await updateSettings({ activeFreezeTimer: null });
    }
    await deleteRecipe(recipe.id);
    router.replace('/(tabs)/recipes');
  } }]);
  return (
    <Screen contentStyle={styles.screenContent}>
      <AppHeader title="Recipe Details" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} right={<IconButton icon={recipe.favorite ? 'heart' : 'heart-outline'} color={recipe.favorite ? palette.pink : palette.text} label="Toggle favorite" onPress={() => toggleFavorite(recipe.id)} />} />
      <ImageBackground source={recipe.photoUri ? { uri: recipe.photoUri } : recipeImages[recipe.imageKey]} style={styles.hero} imageStyle={styles.heroImage}><LinearGradient colors={['transparent', 'rgba(8,12,31,0.97)']} style={StyleSheet.absoluteFill} /><View style={styles.heroCopy}>{recipe.isTemplate ? <Text style={styles.template}>STARTER TEMPLATE</Text> : null}<Text style={styles.title}>{recipe.name}</Text><Text style={styles.recipeStyle}>{recipe.style.replaceAll('-', ' ')}</Text></View></ImageBackground>
      <View style={styles.padded}><NutritionSummary nutrition={recipe.nutrition} /></View>
      <View style={styles.timerWrap}>{settings.activeFreezeTimer?.recipeId === recipe.id ? <FreezeTimerCard timer={settings.activeFreezeTimer} onPress={() => router.push(`/freeze-timer?recipeId=${recipe.id}`)} /> : <GradientButton title="Set a 24-hour freeze timer" icon="timer-outline" variant="secondary" onPress={() => router.push(`/freeze-timer?recipeId=${recipe.id}`)} />}</View>
      <View style={styles.actions} accessibilityLabel="Recipe actions">
        <Action label="Edit" icon="pencil-outline" onPress={() => router.push(`/builder?recipeId=${recipe.id}`)} />
        <Action label="Duplicate" icon="content-copy" onPress={async () => { const copy = await duplicateRecipe(recipe.id); if (copy) router.replace(`/recipe/${copy.id}`); }} />
        <Action label="Delete" icon="trash-can-outline" danger onPress={confirmDelete} />
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">{(['ingredients', 'directions', 'nutrition', 'notes'] as DetailTab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === item }}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
      <GlassCard style={styles.detailCard}>
        {tab === 'ingredients' ? recipe.ingredients.map((item) => { const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId); return <View key={item.ingredientId} style={styles.ingredientRow}><Text style={styles.ingredientName}>{ingredient?.name ?? 'Unknown ingredient'}</Text><Text style={styles.ingredientAmount}>{displayAmount(item.amount, item.unit, settings.units, settings.measurementMode)}</Text></View>; }) : null}
        {tab === 'directions' ? recipe.directions.map((direction, index) => <View key={`${index}-${direction}`} style={styles.direction}><View style={styles.directionNumber}><Text style={styles.directionNumberText}>{index + 1}</Text></View><Text style={styles.directionText}>{direction}</Text></View>) : null}
        {tab === 'nutrition' ? <View style={styles.nutritionDetails}><NutritionFactsPanel nutrition={recipe.nutrition} /><Text style={styles.guidance}>Protein needs vary by body size, activity, health, and overall diet. A common general range for adults is 0.8–1.5 g per kilogram of body weight; personalized advice belongs with a qualified clinician or dietitian.</Text></View> : null}
        {tab === 'notes' ? <Text style={styles.notes}>{recipe.notes || 'No notes yet.'}</Text> : null}
      </GlassCard>
      <View style={styles.bottomActions}><GradientButton title="Choose Program" variant="secondary" onPress={() => router.push(`/program?recipeId=${recipe.id}`)} /><GradientButton title="Spin It Now" icon="record-circle-outline" onPress={() => router.push(`/(tabs)/spin?recipeId=${recipe.id}`)} /></View>
    </Screen>
  );
}

function Action({ label, icon, onPress, danger = false }: { label: string; icon: 'pencil-outline' | 'content-copy' | 'trash-can-outline'; onPress: () => void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.action, danger && styles.actionDanger]} accessibilityRole="button" accessibilityLabel={`${label} recipe`}><Icon name={icon} size={19} color={danger ? palette.danger : palette.text} /><Text style={[styles.actionText, danger && styles.actionDangerText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0 }, hero: { height: 280, justifyContent: 'flex-end', marginBottom: spacing.md }, heroImage: { borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl }, heroCopy: { padding: spacing.lg },
  title: { ...textStyles.title, fontSize: 27, lineHeight: 31, maxWidth: '90%' }, template: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.xs }, recipeStyle: { color: palette.pink, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: spacing.xs },
  padded: { paddingHorizontal: spacing.md }, timerWrap: { marginHorizontal: spacing.md, marginTop: spacing.sm }, actions: { flexDirection: 'row', marginTop: spacing.sm, marginHorizontal: spacing.md, borderWidth: 1, borderColor: palette.border, borderRadius: radii.md, overflow: 'hidden' },
  action: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: palette.border, backgroundColor: palette.panelSoft }, actionDanger: { backgroundColor: 'rgba(255,107,131,0.1)', borderRightWidth: 0 }, actionText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '800' }, actionDangerText: { color: palette.danger },
  tabs: { flexDirection: 'row', marginVertical: spacing.md, marginHorizontal: spacing.md, padding: 3, borderRadius: radii.md, backgroundColor: palette.panelSoft, borderWidth: 1, borderColor: palette.border }, tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, paddingHorizontal: 4 }, tabActive: { backgroundColor: palette.panelRaised }, tabText: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' }, tabTextActive: { color: palette.text, fontWeight: '900' },
  detailCard: { marginHorizontal: spacing.md, paddingHorizontal: spacing.md, minHeight: 170, overflow: 'visible' }, ingredientRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border, gap: spacing.sm }, ingredientName: { color: palette.text, fontSize: 16, lineHeight: 22, flex: 1 }, ingredientAmount: { color: palette.textMuted, fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'right' },
  direction: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }, directionNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(241,78,155,0.2)', alignItems: 'center', justifyContent: 'center' }, directionNumberText: { color: palette.pink, fontWeight: '900' }, directionText: { ...textStyles.body, flex: 1 }, nutritionDetails: { paddingVertical: spacing.md, gap: spacing.md }, guidance: { color: palette.textMuted, fontSize: 14, lineHeight: 21 }, notes: { ...textStyles.body, paddingVertical: spacing.md }, bottomActions: { gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.md },
});
