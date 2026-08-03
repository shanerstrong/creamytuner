import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, GradientButton, IconButton, Pill, Screen, textStyles } from '@/src/components/ui';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import type { IngredientCategory, Unit } from '@/src/types';

const categories: IngredientCategory[] = ['protein', 'base', 'sweetener', 'stabilizer', 'fruit', 'flavoring', 'mix-in'];
const units: Unit[] = ['g', 'ml', 'tsp'];

export default function NewIngredientScreen() {
  const { addCustomIngredient } = useApp();
  const params = useLocalSearchParams<{ tutorial?: string; category?: string }>();
  const requestedCategory = categories.includes(params.category as IngredientCategory) ? params.category as IngredientCategory : 'protein';
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>(requestedCategory);
  const [unit, setUnit] = useState<Unit>('g');
  const [reference, setReference] = useState('100');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [sugar, setSugar] = useState('');
  const [addedSugar, setAddedSugar] = useState('');
  const [fat, setFat] = useState('');

  const submit = async () => {
    const referenceAmount = Number(reference);
    if (!name.trim() || !Number.isFinite(referenceAmount) || referenceAmount <= 0) {
      Alert.alert('Check the label', 'Enter an ingredient name and a positive reference amount.');
      return;
    }
    await addCustomIngredient({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      subtitle: 'Custom label data',
      category,
      defaultUnit: unit,
      defaultAmount: referenceAmount,
      referenceAmount,
      nutrition: { calories: Number(calories) || 0, protein: Number(protein) || 0, carbs: Number(carbs) || 0, sugar: Number(sugar) || 0, addedSugar: Number(addedSugar) || 0, fat: Number(fat) || 0, fiber: 0 },
      isCustom: true,
    });
    if (params.tutorial === '1') {
      router.replace({ pathname: '/(tabs)/library', params: { tutorial: '1', category } });
    } else {
      router.back();
    }
  };

  return (
    <Screen>
      <AppHeader title="Custom Ingredient" subtitle="Enter values from the nutrition label" left={<IconButton icon="close" label="Close" onPress={() => router.back()} />} />
      <Field label="Ingredient name" value={name} onChangeText={setName} placeholder="e.g. My Protein Powder" />
      <Text style={styles.label}>Category</Text>
      <View style={styles.pills}>{categories.map((item) => <Pill key={item} label={item.replace('-', ' ')} active={category === item} onPress={() => setCategory(item)} />)}</View>
      <Text style={styles.label}>Reference unit</Text>
      <View style={styles.pills}>{units.map((item) => <Pill key={item} label={item} active={unit === item} onPress={() => setUnit(item)} />)}</View>
      <Field label={`Reference amount (${unit})`} value={reference} onChangeText={setReference} keyboardType="decimal-pad" />
      <View style={styles.row}>
        <View style={styles.half}><Field label="Calories" value={calories} onChangeText={setCalories} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Field label="Sugar (g)" value={sugar} onChangeText={setSugar} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Field label="Added sugars (g)" value={addedSugar} onChangeText={setAddedSugar} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" /></View>
      </View>
      <Text style={styles.note}>Creamy Tuner stores this data only on your device. Values are estimates based on what you enter.</Text>
      <GradientButton title="Save Ingredient" icon="content-save" onPress={submit} />
    </Screen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor={palette.textFaint} /></View>;
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { color: palette.textMuted, fontSize: 16, lineHeight: 21, fontWeight: '700', marginBottom: spacing.xs },
  input: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  half: { width: '48%' },
  note: { ...textStyles.caption, marginBottom: spacing.lg },
});
