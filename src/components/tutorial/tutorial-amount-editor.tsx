import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/src/components/ui';
import { displayAmount, displayAmountStep, displayUnitOptions, editableAmount, parseDisplayAmount } from '@/src/domain/nutrition';
import { palette, radii, spacing } from '@/src/theme';
import type { DisplayUnit, Ingredient, RecipeIngredient, UserSettings } from '@/src/types';

const unitLabel: Record<DisplayUnit, string> = { g: 'grams', ml: 'milliliters', tsp: 'teaspoons', tbsp: 'tablespoons', cup: 'cups', oz: 'ounces', 'fl-oz': 'fluid ounces' };

export function TutorialAmountEditor({ item, ingredient, settings, recommendedAmount, caution, onChange, onRemove }: {
  item: RecipeIngredient;
  ingredient: Ingredient;
  settings: UserSettings;
  recommendedAmount: number;
  caution?: string;
  onChange: (amount: number, manual: boolean) => void;
  onRemove?: () => void;
}) {
  const options = useMemo(() => displayUnitOptions(item.unit, settings.units, settings.measurementMode), [item.unit, settings.measurementMode, settings.units]);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>(options[0]);
  const activeUnit = options.includes(displayUnit) ? displayUnit : options[0];
  const converted = editableAmount(item.amount, item.unit, activeUnit);
  const [raw, setRaw] = useState(String(Number(converted.toFixed(2))));

  useEffect(() => { setRaw(String(Number(editableAmount(item.amount, item.unit, activeUnit).toFixed(2)))); }, [activeUnit, item.amount, item.unit]);

  const commit = (value = raw) => {
    const numeric = Number(value.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setRaw(String(Number(converted.toFixed(2))));
      return;
    }
    onChange(Number(parseDisplayAmount(numeric, activeUnit, item.unit).amount.toFixed(2)), true);
  };
  const nudge = (direction: -1 | 1) => {
    const step = displayAmountStep(activeUnit);
    const current = Number(raw.replace(',', '.')) || converted;
    const next = Math.max(step, current + direction * step);
    setRaw(String(Number(next.toFixed(2))));
    commit(String(next));
  };

  return (
    <View style={styles.editor}>
      <View style={styles.header}>
        <View style={styles.copy}><Text style={styles.name}>{ingredient.name}</Text><Text style={styles.meta}>{ingredient.subtitle}</Text></View>
        <Pressable onPress={() => onChange(recommendedAmount, false)} accessibilityRole="button" accessibilityLabel={`Use recommended amount for ${ingredient.name}`} style={styles.recommended}><Icon name="creation" size={14} color={palette.cyan} /><Text style={styles.recommendedText}>Recommended</Text></Pressable>
        {onRemove ? <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${ingredient.name}`} style={styles.remove}><Icon name="close" size={19} color={palette.danger} /></Pressable> : null}
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={() => nudge(-1)} accessibilityRole="button" accessibilityLabel={`Decrease ${ingredient.name}`} style={styles.stepButton}><Icon name="minus" size={22} /></Pressable>
        <TextInput value={raw} onChangeText={setRaw} onBlur={() => commit()} onSubmitEditing={() => commit()} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`${ingredient.name} amount in ${unitLabel[activeUnit]}`} style={styles.input} />
        <Pressable onPress={() => nudge(1)} accessibilityRole="button" accessibilityLabel={`Increase ${ingredient.name}`} style={styles.stepButton}><Icon name="plus" size={22} /></Pressable>
      </View>
      <View style={styles.units} accessibilityRole="radiogroup">{options.map((option) => <Pressable key={option} onPress={() => { commit(); setDisplayUnit(option); }} accessibilityRole="radio" accessibilityState={{ selected: activeUnit === option }} accessibilityLabel={`${ingredient.name} in ${unitLabel[option]}`} style={[styles.unit, activeUnit === option && styles.unitActive]}><Text style={[styles.unitText, activeUnit === option && styles.unitTextActive]}>{option}</Text></Pressable>)}</View>
      <Text style={styles.kitchen}>{displayAmount(item.amount, item.unit, settings.units, settings.measurementMode)}</Text>
      {caution ? <Text style={styles.caution}>{caution}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, copy: { flex: 1 }, name: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' }, meta: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 1 },
  recommended: { minHeight: 44, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(78,217,232,0.4)', backgroundColor: 'rgba(78,217,232,0.08)' }, recommendedText: { color: palette.cyan, fontSize: 12, fontWeight: '900' }, remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }, stepButton: { width: 50, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised }, input: { flex: 1, minHeight: 52, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.pink, backgroundColor: palette.ink, color: palette.text, fontSize: 21, lineHeight: 26, fontWeight: '900', textAlign: 'center' },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs }, unit: { minHeight: 40, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border }, unitActive: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.16)' }, unitText: { color: palette.textMuted, fontSize: 13, fontWeight: '800' }, unitTextActive: { color: palette.text },
  kitchen: { color: palette.cyan, fontSize: 14, lineHeight: 20, fontWeight: '900', marginTop: spacing.xs }, caution: { color: palette.warning, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
