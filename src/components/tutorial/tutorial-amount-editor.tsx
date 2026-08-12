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
  const [precise, setPrecise] = useState(converted < displayAmountStep(activeUnit));
  const [dirty, setDirty] = useState(false);
  const shownValue = (value: number, unit: DisplayUnit, usePrecise: boolean) => {
    if (usePrecise) return Number(value.toFixed(2));
    const step = displayAmountStep(unit);
    const snapped = Math.round(value / step) * step;
    // Keep an existing canonical amount authoritative. Only clean up tiny
    // conversion noise instead of changing 1.67 cups into 1.75 cups.
    return Number((Math.abs(snapped - value) < 0.02 ? snapped : value).toFixed(2));
  };
  const [raw, setRaw] = useState(String(shownValue(converted, activeUnit, precise)));

  useEffect(() => {
    const value = editableAmount(item.amount, item.unit, activeUnit);
    const needsPrecision = value < displayAmountStep(activeUnit);
    if (needsPrecision) setPrecise(true);
    setRaw(String(shownValue(value, activeUnit, precise || needsPrecision)));
    setDirty(false);
  }, [activeUnit, item.amount, item.unit, precise]);

  const commit = (value = raw) => {
    const numeric = Number(value.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric < 0) {
      setRaw(String(Number(converted.toFixed(2))));
      return;
    }
    if (numeric === 0) {
      if (onRemove) onRemove();
      else setRaw(String(Number(converted.toFixed(2))));
      setDirty(false);
      return;
    }
    onChange(Number(parseDisplayAmount(numeric, activeUnit, item.unit).amount.toFixed(2)), true);
    setDirty(false);
  };
  const nudge = (direction: -1 | 1) => {
    const step = displayAmountStep(activeUnit, precise);
    const parsed = Number(raw.replace(',', '.'));
    const current = Number.isFinite(parsed) ? parsed : converted;
    const next = Math.max(0, current + direction * step);
    setRaw(String(Number(next.toFixed(2))));
    commit(String(next));
  };

  return (
    <View style={styles.editor}>
      <View style={styles.header}>
        <View style={styles.copy}><Text style={styles.name}>{ingredient.name}</Text><Text style={styles.meta}>{ingredient.subtitle}</Text></View>
        <Pressable onPress={() => onChange(recommendedAmount, false)} accessibilityRole="button" accessibilityLabel={`Use recommended amount for ${ingredient.name}`} style={styles.recommended}><Icon name="creation" size={16} color={palette.cyan} /><Text style={styles.recommendedText}>Recommended</Text></Pressable>
        {onRemove ? <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${ingredient.name}`} style={styles.remove}><Icon name="close" size={19} color={palette.danger} /></Pressable> : null}
      </View>
      <View style={styles.entryHeader}>
        <View><Text style={styles.entryLabel}>AMOUNT</Text><Text style={styles.entryHint}>Tap the number to type any amount</Text></View>
        <View style={styles.precisionToggle} accessibilityRole="radiogroup">
          <Pressable onPress={() => setPrecise(false)} accessibilityRole="radio" accessibilityState={{ selected: !precise }} style={[styles.precisionOption, !precise && styles.precisionOptionActive]}><Text style={[styles.precisionText, !precise && styles.precisionTextActive]}>Easy</Text></Pressable>
          <Pressable onPress={() => setPrecise(true)} accessibilityRole="radio" accessibilityState={{ selected: precise }} style={[styles.precisionOption, precise && styles.precisionOptionActive]}><Text style={[styles.precisionText, precise && styles.precisionTextActive]}>Precise</Text></Pressable>
        </View>
      </View>
      <View style={styles.stepper}>
        <Pressable onPress={() => nudge(-1)} accessibilityRole="button" accessibilityLabel={`Decrease ${ingredient.name}`} style={styles.stepButton}><Icon name="minus" size={22} /></Pressable>
        <TextInput value={raw} onChangeText={(value) => { setRaw(value); setDirty(true); }} onEndEditing={({ nativeEvent }) => commit(nativeEvent.text)} onSubmitEditing={({ nativeEvent }) => commit(nativeEvent.text)} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`${ingredient.name} amount in ${unitLabel[activeUnit]}`} style={styles.input} />
        <Pressable onPress={() => nudge(1)} accessibilityRole="button" accessibilityLabel={`Increase ${ingredient.name}`} style={styles.stepButton}><Icon name="plus" size={22} /></Pressable>
      </View>
      <View style={styles.units} accessibilityRole="radiogroup">{options.map((option) => <Pressable key={option} onPress={() => { if (dirty) commit(); setDisplayUnit(option); }} accessibilityRole="radio" accessibilityState={{ selected: activeUnit === option }} accessibilityLabel={`${ingredient.name} in ${unitLabel[option]}`} style={[styles.unit, activeUnit === option && styles.unitActive]}><Text style={[styles.unitText, activeUnit === option && styles.unitTextActive]}>{option}</Text></Pressable>)}</View>
      <Text style={styles.kitchen}>{displayAmount(item.amount, item.unit, settings.units, settings.measurementMode)}</Text>
      {ingredient.referenceLabel ? <View style={styles.portionNote}><Icon name="information-outline" size={17} color={palette.lavender} /><Text style={styles.portionText}>{ingredient.referenceLabel}</Text></View> : null}
      {caution ? <Text style={styles.caution}>{caution}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { width: '100%', maxWidth: '100%', overflow: 'hidden', padding: spacing.xs, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 }, copy: { flex: 1, minWidth: 0 }, name: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' }, meta: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 1 },
  recommended: { width: 112, minHeight: 44, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radii.sm, borderWidth: 1, borderColor: 'rgba(78,217,232,0.4)', backgroundColor: 'rgba(78,217,232,0.08)' }, recommendedText: { color: palette.cyan, fontSize: 13, lineHeight: 17, fontWeight: '900' }, remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  entryHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: spacing.xs }, entryLabel: { color: palette.text, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.8 }, entryHint: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  precisionToggle: { flexDirection: 'row', borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' }, precisionOption: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, precisionOptionActive: { backgroundColor: 'rgba(174,134,255,0.2)' }, precisionText: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800' }, precisionTextActive: { color: palette.white },
  stepper: { width: '100%', flexDirection: 'row', gap: 6, marginTop: spacing.xs }, stepButton: { width: 44, minWidth: 44, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised }, input: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 5, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.pink, backgroundColor: palette.ink, color: palette.text, fontSize: 20, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs }, unit: { minHeight: 44, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border }, unitActive: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.16)' }, unitText: { color: palette.textMuted, fontSize: 13, fontWeight: '800' }, unitTextActive: { color: palette.text },
  kitchen: { color: palette.cyan, fontSize: 14, lineHeight: 20, fontWeight: '900', marginTop: spacing.xs }, portionNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs, padding: spacing.xs, borderRadius: radii.sm, backgroundColor: 'rgba(174,134,255,0.09)' }, portionText: { flex: 1, color: palette.lavender, fontSize: 13, lineHeight: 18, fontWeight: '700' }, caution: { color: palette.warning, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
});
