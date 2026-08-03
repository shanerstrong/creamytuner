import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard, Icon, Pill } from '@/src/components/ui';
import { TutorialAmountEditor } from '@/src/components/tutorial/tutorial-amount-editor';
import { getPintFillState } from '@/src/domain/fill';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { tutorialBaseTemplates } from '@/src/domain/tutorial';
import { palette, radii, spacing } from '@/src/theme';
import type { Ingredient, MeasurementMode, RecipeIngredient, UserSettings } from '@/src/types';

const BASE_IDS = ['milk-2', 'fairlife-2', 'almond-milk', 'soy-milk'];

export function TutorialBaseStep({ items, ingredients, capacityMl, settings, onItemsChange, onUnitSystemChange, onMeasurementModeChange, onIngredientAdded }: {
  items: RecipeIngredient[];
  ingredients: Ingredient[];
  capacityMl: number;
  settings: UserSettings;
  onItemsChange: (items: RecipeIngredient[], manualId?: string, resetManual?: boolean) => void;
  onUnitSystemChange: (units: 'metric' | 'us') => void;
  onMeasurementModeChange: (mode: MeasurementMode) => void;
  onIngredientAdded: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const templates = useMemo(() => tutorialBaseTemplates(capacityMl), [capacityMl]);
  const selectedIds = new Set(items.map((item) => item.ingredientId));
  const volume = estimateVolumeMl(items);
  const fill = getPintFillState(volume, capacityMl);

  const applyTemplate = (templateItems: RecipeIngredient[]) => {
    onItemsChange(templateItems.map((item) => ({ ...item })), undefined, true);
    onIngredientAdded();
  };
  const addBase = (ingredientId: string) => {
    if (selectedIds.has(ingredientId)) return;
    const amount = Math.max(30, Math.min(120, Math.round(capacityMl * 0.15)));
    onItemsChange([...items, { ingredientId, amount, unit: 'ml' }], ingredientId);
    onIngredientAdded();
  };

  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.recommendation}>
        <View style={styles.recommendationTitle}><Icon name="creation" color={palette.cyan} /><Text style={styles.recommendationHeading}>Start with a recommendation</Text></View>
        <Text style={styles.recommendationCopy}>Amounts automatically scale to leave room in your selected container.</Text>
      </GlassCard>
      <View style={styles.templates}>{templates.map((template, index) => <Pressable key={template.id} onPress={() => applyTemplate(template.items)} accessibilityRole="button" accessibilityLabel={`Use ${template.title} base recommendation`} style={({ pressed }) => [styles.template, index === 0 && styles.templateRecommended, pressed && styles.pressed]}><View style={styles.templateTop}><Text style={styles.templateTitle}>{template.title}</Text>{index === 0 ? <Text style={styles.badge}>EASIEST</Text> : null}</View><Text style={styles.templateDetail}>{template.detail}</Text><Text style={styles.templateAmounts}>{template.items.map((item) => `${ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name ?? item.ingredientId} ${Math.round(item.amount)} ml`).join(' + ')}</Text></Pressable>)}</View>

      <View style={styles.controls}><Pill label="Kitchen-friendly" active={settings.measurementMode === 'kitchen'} onPress={() => onMeasurementModeChange('kitchen')} /><Pill label="Exact" active={settings.measurementMode === 'exact'} onPress={() => onMeasurementModeChange('exact')} /><Pill label={settings.units === 'us' ? 'US' : 'Metric'} active onPress={() => onUnitSystemChange(settings.units === 'us' ? 'metric' : 'us')} /></View>

      <Text style={styles.sectionTitle}>Your base ingredients</Text>
      {items.length ? <View style={styles.editors}>{items.map((item) => {
        const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId);
        if (!ingredient) return null;
        const recommended = templates.find((template) => template.items.some((candidate) => candidate.ingredientId === item.ingredientId))?.items.find((candidate) => candidate.ingredientId === item.ingredientId)?.amount ?? ingredient.defaultAmount;
        return <TutorialAmountEditor key={item.ingredientId} item={item} ingredient={ingredient} settings={settings} recommendedAmount={recommended} onChange={(amount) => onItemsChange(items.map((candidate) => candidate.ingredientId === item.ingredientId ? { ...candidate, amount } : candidate), item.ingredientId)} onRemove={() => onItemsChange(items.filter((candidate) => candidate.ingredientId !== item.ingredientId), item.ingredientId)} />;
      })}</View> : <Text style={styles.empty}>Choose a recommended base or add your own combination.</Text>}

      <Pressable onPress={() => setShowPicker((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showPicker }} style={styles.addButton}><Icon name={showPicker ? 'minus' : 'plus'} color={palette.cyan} /><Text style={styles.addText}>{showPicker ? 'Close base picker' : 'Add another base'}</Text></Pressable>
      {showPicker ? <View style={styles.picker}>{BASE_IDS.map((id) => {
        const ingredient = ingredients.find((candidate) => candidate.id === id);
        if (!ingredient) return null;
        const selected = selectedIds.has(id);
        return <Pressable key={id} disabled={selected} onPress={() => addBase(id)} accessibilityRole="button" accessibilityLabel={selected ? `${ingredient.name} already added` : `Add ${ingredient.name}`} style={[styles.pickerRow, selected && styles.pickerSelected]}><View style={styles.pickerCopy}><Text style={styles.pickerName}>{ingredient.name}</Text><Text style={styles.pickerMeta}>{ingredient.subtitle}</Text></View><Icon name={selected ? 'check-circle' : 'plus-circle-outline'} color={selected ? palette.success : palette.cyan} /></Pressable>;
      })}</View> : null}

      {items.length ? <View style={[styles.fill, fill.status === 'overflow' && styles.fillDanger]}><Icon name={fill.status === 'overflow' ? 'alert-circle-outline' : 'cup-water'} color={fill.status === 'overflow' ? palette.danger : palette.cyan} /><View style={styles.fillCopy}><Text style={[styles.fillTitle, fill.status === 'overflow' && styles.dangerText]}>{fill.title}</Text><Text style={styles.fillText}>Base total: about {volume} ml · Container: {capacityMl} ml</Text></View></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm }, recommendation: { padding: spacing.sm, borderColor: 'rgba(78,217,232,0.4)' }, recommendationTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, recommendationHeading: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }, recommendationCopy: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  templates: { gap: spacing.xs }, template: { minHeight: 112, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft }, templateRecommended: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.08)' }, templateTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }, templateTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }, badge: { color: palette.ink, backgroundColor: palette.cyan, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, fontSize: 10, fontWeight: '900' }, templateDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 3 }, templateAmounts: { color: palette.cyan, fontSize: 13, lineHeight: 19, fontWeight: '800', marginTop: spacing.xs }, pressed: { opacity: 0.78 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }, sectionTitle: { color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '900', marginTop: spacing.xs }, editors: { gap: spacing.xs }, empty: { color: palette.textMuted, fontSize: 15, lineHeight: 22, paddingVertical: spacing.sm },
  addButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.4)', backgroundColor: 'rgba(78,217,232,0.08)' }, addText: { color: palette.cyan, fontSize: 15, fontWeight: '900' }, picker: { gap: 6 }, pickerRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft }, pickerSelected: { opacity: 0.62 }, pickerCopy: { flex: 1 }, pickerName: { color: palette.text, fontSize: 15, fontWeight: '900' }, pickerMeta: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  fill: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.35)', backgroundColor: 'rgba(78,217,232,0.07)' }, fillDanger: { borderColor: palette.danger, backgroundColor: 'rgba(255,107,131,0.08)' }, fillCopy: { flex: 1 }, fillTitle: { color: palette.text, fontSize: 15, fontWeight: '900' }, fillText: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 }, dangerText: { color: palette.danger },
});
