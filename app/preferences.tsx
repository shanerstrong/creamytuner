import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, GlassCard, Icon, IconButton, Screen } from '@/src/components/ui';
import { ALLERGY_SAFETY_NOTICE, foodAllergenLabels, getIngredientEligibility } from '@/src/domain/dietary';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { DietaryPreference, FoodAllergen, UserSettings } from '@/src/types';

const dietary: { id: DietaryPreference; label: string }[] = [
  { id: 'vegan', label: 'Vegan' }, { id: 'vegetarian', label: 'Vegetarian' }, { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'gluten-free', label: 'Gluten-free' }, { id: 'no-added-sugar', label: 'No added sugar' },
  { id: 'high-protein', label: 'High protein' }, { id: 'high-carb', label: 'High carb' }, { id: 'high-fiber', label: 'High fiber' },
];
const allergens = Object.entries(foodAllergenLabels) as [FoodAllergen, string][];

export default function PreferencesScreen() {
  const { ingredients, settings, updateSettings } = useApp();
  const [custom, setCustom] = useState('');

  const apply = async (dietaryPreferences: DietaryPreference[], foodAllergies: FoodAllergen[], customAvoidFoods: string[]) => {
    const allowed = (id: string) => {
      const ingredient = ingredients.find((item) => item.id === id);
      return ingredient ? getIngredientEligibility(ingredient, dietaryPreferences, foodAllergies, customAvoidFoods).allowed : false;
    };
    const draft = settings.tutorialDraft;
    const previousIds = [...draft.baseItems.map((item) => item.ingredientId), ...draft.selectedIngredientIds, ...draft.mixInIds];
    const baseItems = draft.baseItems.filter((item) => allowed(item.ingredientId));
    const selectedIngredientIds = draft.selectedIngredientIds.filter(allowed);
    const mixInIds = draft.mixInIds.filter(allowed);
    const retained = new Set([...baseItems.map((item) => item.ingredientId), ...selectedIngredientIds, ...mixInIds]);
    const removed = [...new Set(previousIds.filter((id) => !retained.has(id)))];
    const guidedBuilderDraft = settings.guidedBuilderDraft && 'items' in settings.guidedBuilderDraft
      ? { ...settings.guidedBuilderDraft, items: settings.guidedBuilderDraft.items.filter((item) => allowed(item.ingredientId)), pantryIds: settings.guidedBuilderDraft.pantryIds.filter(allowed) }
      : settings.guidedBuilderDraft;
    const patch: Partial<UserSettings> = {
      dietaryPreferences, foodAllergies, customAvoidFoods, guidedBuilderDraft,
      tutorialDraft: { ...draft, dietaryPreferences, foodAllergies, customAvoidFoods, baseItems, selectedIngredientIds, mixInIds, mixInId: mixInIds[0] ?? null, itemAmounts: Object.fromEntries(Object.entries(draft.itemAmounts).filter(([id]) => retained.has(id))), manualAmountIds: draft.manualAmountIds.filter((id) => retained.has(id)) },
    };
    await updateSettings(patch);
    if (removed.length) Alert.alert('Ingredients removed for your safety settings', removed.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', '));
  };

  const toggleDietary = (id: DietaryPreference) => void apply(settings.dietaryPreferences.includes(id) ? settings.dietaryPreferences.filter((item) => item !== id) : [...settings.dietaryPreferences, id], settings.foodAllergies, settings.customAvoidFoods);
  const toggleAllergy = (id: FoodAllergen) => void apply(settings.dietaryPreferences, settings.foodAllergies.includes(id) ? settings.foodAllergies.filter((item) => item !== id) : [...settings.foodAllergies, id], settings.customAvoidFoods);
  const addCustom = () => { const value = custom.trim(); if (!value) return; setCustom(''); void apply(settings.dietaryPreferences, settings.foodAllergies, [...new Set([...settings.customAvoidFoods, value])]); };

  return <Screen>
    <AppHeader title="Food preferences" subtitle="Used throughout CreamyTuner" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
    <Text style={styles.heading}>Dietary preferences</Text>
    <View style={styles.grid}>{dietary.map((item) => <Option key={item.id} label={item.label} active={settings.dietaryPreferences.includes(item.id)} onPress={() => toggleDietary(item.id)} />)}</View>
    <SafetyCard />
    <Text style={styles.heading}>Food allergies</Text>
    <Text style={styles.helper}>Select every allergy that applies. None are selected by default.</Text>
    <View style={styles.grid}>{allergens.map(([id, label]) => <Option key={id} label={label} active={settings.foodAllergies.includes(id)} onPress={() => toggleAllergy(id)} />)}</View>
    <View style={styles.customRow}><TextInput value={custom} onChangeText={setCustom} onSubmitEditing={addCustom} placeholder="Other food to avoid" placeholderTextColor={palette.textFaint} style={styles.input} accessibilityLabel="Other food to avoid" /><Pressable onPress={addCustom} disabled={!custom.trim()} style={[styles.add, !custom.trim() && styles.disabled]} accessibilityRole="button"><Text style={styles.addText}>Add</Text></Pressable></View>
    <View style={styles.chips}>{settings.customAvoidFoods.map((value) => <Pressable key={value} onPress={() => void apply(settings.dietaryPreferences, settings.foodAllergies, settings.customAvoidFoods.filter((item) => item !== value))} style={styles.chip} accessibilityLabel={`Remove ${value}`}><Text style={styles.chipText}>{value}</Text><Icon name="close" size={16} color={palette.textMuted} /></Pressable>)}</View>
    <SafetyCard />
  </Screen>;
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.option, active && styles.optionActive]} accessibilityRole="checkbox" accessibilityState={{ checked: active }}><Text style={styles.optionText}>{label}</Text>{active ? <Icon name="check-circle" color={palette.success} /> : null}</Pressable>;
}

function SafetyCard() {
  return <GlassCard style={styles.notice}><Icon name="shield-alert-outline" color={palette.warning} /><Text style={styles.noticeText}>{ALLERGY_SAFETY_NOTICE}</Text></GlassCard>;
}

const styles = StyleSheet.create({
  heading: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '900', marginTop: spacing.md, marginBottom: spacing.xs },
  helper: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: { width: '48.5%', minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  optionActive: { borderColor: palette.cyan, backgroundColor: 'rgba(78,217,232,0.11)' },
  optionText: { flex: 1, color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  notice: { marginTop: spacing.sm, padding: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, borderColor: 'rgba(246,197,106,0.42)' },
  noticeText: { flex: 1, color: palette.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  input: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, fontSize: 16, paddingHorizontal: spacing.sm },
  add: { minWidth: 64, minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.cyan },
  addText: { color: palette.ink, fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: { minHeight: 40, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipText: { color: palette.text, fontSize: 14, fontWeight: '800' },
});
