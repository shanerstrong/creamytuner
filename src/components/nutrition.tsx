import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing } from '@/src/theme';
import type { Nutrition } from '@/src/types';

const grams = (value: number) => `${Number(value.toFixed(1))} g`;

export function NutritionSummary({ nutrition, compact = false }: { nutrition: Nutrition; compact?: boolean }) {
  const metrics = [['Protein', grams(nutrition.protein)], ['Carbohydrates', grams(nutrition.carbs)], ['Fat', grams(nutrition.fat)], ['Fiber', grams(nutrition.fiber)]];
  return (
    <View style={[styles.summary, compact && styles.compact]} accessibilityLabel={`Estimated nutrition: ${Math.round(nutrition.calories)} calories, ${grams(nutrition.protein)} protein, ${grams(nutrition.carbs)} carbohydrates, ${grams(nutrition.fat)} fat, ${grams(nutrition.fiber)} fiber`}>
      <View style={styles.caloriesBlock}><Text style={styles.eyebrow}>Estimated per pint</Text><View style={styles.caloriesLine}><Text style={styles.caloriesLabel}>Calories</Text><Text style={styles.calories}>{Math.round(nutrition.calories)}</Text></View></View>
      <View style={styles.metricGrid}>{metrics.map(([label, value]) => <View key={label} style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>)}</View>
    </View>
  );
}

export function NutritionFactsPanel({ nutrition, servingLabel = '1 pint' }: { nutrition: Nutrition; servingLabel?: string }) {
  const rows: [string, number, number | null][] = [['Total Fat', nutrition.fat, 78], ['Total Carbohydrate', nutrition.carbs, 275], ['Dietary Fiber', nutrition.fiber, 28], ['Total Sugars', nutrition.sugar, null], ['Protein', nutrition.protein, 50]];
  return (
    <View style={styles.facts} accessibilityLabel="Expanded estimated nutrition">
      <Text style={styles.factsTitle}>Estimated nutrition</Text>
      <Text style={styles.factsDisclaimer}>Informational estimate based on saved ingredient labels</Text>
      <View style={styles.ruleHeavy} />
      <View style={styles.row}><Text style={styles.serving}>Serving size</Text><Text style={styles.serving}>{servingLabel}</Text></View>
      <View style={styles.ruleHeavy} />
      <Text style={styles.amountPer}>Amount per serving</Text>
      <View style={styles.row}><Text style={styles.caloriesFact}>Calories</Text><Text style={styles.caloriesNumber}>{Math.round(nutrition.calories)}</Text></View>
      <View style={styles.ruleMedium} />
      <Text style={styles.dvHeader}>% Daily Value*</Text>
      {rows.map(([label, value, daily]) => <View key={label} style={styles.factRow}><Text style={styles.factLabel}>{label}</Text><View style={styles.factRight}><Text style={styles.factValue}>{grams(value)}</Text>{daily ? <Text style={styles.dv}>{Math.round((value / daily) * 100)}%</Text> : null}</View></View>)}
      <View style={styles.ruleMedium} />
      <Text style={styles.footnote}>*Daily Values use general U.S. reference amounts. Individual needs vary.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: 'rgba(10,16,37,0.82)', overflow: 'hidden' },
  compact: { backgroundColor: 'rgba(10,16,37,0.9)' },
  caloriesBlock: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.border },
  eyebrow: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  caloriesLine: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  caloriesLabel: { color: palette.text, fontSize: 20, lineHeight: 27, fontWeight: '800' },
  calories: { color: palette.text, fontSize: 34, lineHeight: 39, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metric: { width: '50%', minHeight: 68, padding: spacing.sm, borderBottomWidth: 1, borderRightWidth: 1, borderColor: palette.border },
  metricLabel: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  metricValue: { color: palette.text, fontSize: 17, lineHeight: 23, fontWeight: '800', marginTop: 2 },
  facts: { borderRadius: radii.md, padding: spacing.md, backgroundColor: '#F7F4ED', borderWidth: 1, borderColor: '#C8C2B5' },
  factsTitle: { color: '#141414', fontSize: 28, lineHeight: 33, fontWeight: '900' },
  factsDisclaimer: { color: '#4A4A4A', fontSize: 13, lineHeight: 18 },
  ruleHeavy: { height: 7, backgroundColor: '#141414', marginVertical: spacing.xs },
  ruleMedium: { height: 3, backgroundColor: '#141414', marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  serving: { color: '#141414', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  amountPer: { color: '#141414', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  caloriesFact: { color: '#141414', fontSize: 24, lineHeight: 30, fontWeight: '900' },
  caloriesNumber: { color: '#141414', fontSize: 32, lineHeight: 37, fontWeight: '900' },
  dvHeader: { color: '#141414', fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'right' },
  factRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#777', gap: spacing.sm },
  factLabel: { color: '#141414', fontSize: 16, lineHeight: 22, fontWeight: '800', flex: 1 },
  factRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  factValue: { color: '#141414', fontSize: 15, lineHeight: 21 },
  dv: { color: '#141414', fontSize: 15, lineHeight: 21, fontWeight: '900', minWidth: 42, textAlign: 'right' },
  footnote: { color: '#353535', fontSize: 13, lineHeight: 18 },
});
