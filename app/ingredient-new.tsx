import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader, GlassCard, GradientButton, Icon, IconButton, Pill, Screen, textStyles } from '@/src/components/ui';
import { useApp } from '@/src/providers/app-provider';
import { ALLERGY_SAFETY_NOTICE, foodAllergenLabels } from '@/src/domain/dietary';
import { parseNutritionLabel } from '@/src/domain/nutrition-label';
import { labelOcrAvailable, recognizeLabelPhoto } from '../src/services/label-ocr';
import { chooseIngredientLabelPhoto, openPhotoPermissionSettings, PhotoPermissionError, type PintPhotoSource } from '@/src/services/pint-photo';
import { palette, radii, spacing } from '@/src/theme';
import type { FoodAllergen, IngredientCategory, Unit } from '@/src/types';

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
  const [fiber, setFiber] = useState('');
  const [allergens, setAllergens] = useState<FoodAllergen[]>([]);
  const [mayContainAllergens, setMayContainAllergens] = useState<FoodAllergen[]>([]);
  const [labelChecked, setLabelChecked] = useState(false);
  const [frontPhoto, setFrontPhoto] = useState('');
  const [nutritionPhoto, setNutritionPhoto] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const chooseLabelPhoto = async (target: 'front' | 'nutrition', source: PintPhotoSource) => {
    try {
      const uri = await chooseIngredientLabelPhoto(source);
      if (!uri) return;
      if (target === 'front') setFrontPhoto(uri);
      else setNutritionPhoto(uri);
      setScanMessage('Photo added. Review the image, then read the label.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The label photo could not be added.';
      if (error instanceof PhotoPermissionError && error.canOpenSettings) {
        Alert.alert('Photo access needed', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => { void openPhotoPermissionSettings(); } }]);
      } else if (!(error instanceof PhotoPermissionError && !error.canOpenSettings)) Alert.alert('Could not add photo', message);
    }
  };

  const scanLabel = async () => {
    if (!nutritionPhoto) {
      Alert.alert('Nutrition label needed', 'Add a clear photo of the Nutrition Facts panel first. The front photo is optional.');
      return;
    }
    if (!labelOcrAvailable) {
      setScanMessage('Photos are ready as a reference. Automatic on-device reading is available in the installed iOS and Android beta; enter or review the values below on web.');
      return;
    }
    setScanBusy(true);
    setScanMessage('Reading the selected photos on this device…');
    try {
      const [frontText, nutritionText] = await Promise.all([
        frontPhoto ? recognizeLabelPhoto(frontPhoto) : Promise.resolve(''),
        recognizeLabelPhoto(nutritionPhoto),
      ]);
      const result = parseNutritionLabel(frontText, nutritionText);
      if (result.name) setName(result.name);
      if (result.category) setCategory(result.category);
      if (result.unit) setUnit(result.unit);
      if (result.referenceAmount) setReference(String(result.referenceAmount));
      if (result.calories !== undefined) setCalories(String(result.calories));
      if (result.protein !== undefined) setProtein(String(result.protein));
      if (result.carbs !== undefined) setCarbs(String(result.carbs));
      if (result.sugar !== undefined) setSugar(String(result.sugar));
      if (result.addedSugar !== undefined) setAddedSugar(String(result.addedSugar));
      if (result.fat !== undefined) setFat(String(result.fat));
      if (result.fiber !== undefined) setFiber(String(result.fiber));
      setAllergens(result.allergens);
      setMayContainAllergens(result.mayContainAllergens);
      setLabelChecked(false);
      setScanMessage(result.warnings.length
        ? `We filled what we could. ${result.warnings.join(' ')} Compare every value with the package before saving.`
        : 'Label read successfully. Compare every populated value with the package, then confirm the label check below.');
    } catch (error) {
      setScanMessage('We could not read that label clearly. Retake it straight-on in bright, even light or enter the values below.');
      Alert.alert('Label could not be read', error instanceof Error ? error.message : 'Try another photo or enter the values manually.');
    } finally {
      setScanBusy(false);
    }
  };

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
      nutrition: { calories: Number(calories) || 0, protein: Number(protein) || 0, carbs: Number(carbs) || 0, sugar: Number(sugar) || 0, addedSugar: Number(addedSugar) || 0, fat: Number(fat) || 0, fiber: Number(fiber) || 0 },
      allergens,
      mayContainAllergens,
      allergenDataStatus: labelChecked ? 'user-confirmed' : 'incomplete',
      allergenStatement: labelChecked ? allergens.length ? `Contains ${allergens.map((item) => foodAllergenLabels[item]).join(', ')}.` : 'User reported no major allergens on the current label.' : 'Allergen information has not been confirmed.',
      allergenVerifiedAt: labelChecked ? new Date().toISOString().slice(0, 10) : '',
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
      <GlassCard style={styles.scanCard}>
        <View style={styles.scanHeading}><View style={styles.scanIcon}><Icon name="text-recognition" color={palette.pink} size={26} /></View><View style={styles.scanHeadingCopy}><Text style={styles.scanTitle}>Fill from label photos</Text><Text style={styles.scanIntro}>Add the package front if you want the name filled, plus a straight-on Nutrition Facts photo.</Text></View></View>
        <View style={styles.photoRow}>
          <LabelPhotoSlot title="Package front" optional uri={frontPhoto} onCamera={() => { void chooseLabelPhoto('front', 'camera'); }} onLibrary={() => { void chooseLabelPhoto('front', 'library'); }} />
          <LabelPhotoSlot title="Nutrition label" uri={nutritionPhoto} onCamera={() => { void chooseLabelPhoto('nutrition', 'camera'); }} onLibrary={() => { void chooseLabelPhoto('nutrition', 'library'); }} />
        </View>
        <GradientButton title={scanBusy ? 'Reading label…' : labelOcrAvailable ? 'Read label and fill form' : 'Use photos as reference'} icon="text-recognition" disabled={scanBusy || !nutritionPhoto} onPress={() => { void scanLabel(); }} />
        {scanBusy ? <ActivityIndicator color={palette.cyan} style={styles.scanSpinner} /> : null}
        {scanMessage ? <Text style={styles.scanMessage} accessibilityLiveRegion="polite">{scanMessage}</Text> : null}
        <Text style={styles.privacy}>On installed iOS and Android builds, text recognition happens on your device. Creamy Tuner does not upload these label photos. Always verify the filled values.</Text>
      </GlassCard>
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
        <View style={styles.half}><Field label="Fiber (g)" value={fiber} onChangeText={setFiber} keyboardType="decimal-pad" /></View>
      </View>
      <Text style={styles.label}>Allergens listed on the package</Text>
      <View style={styles.pills}>{(Object.entries(foodAllergenLabels) as [FoodAllergen, string][]).map(([id, label]) => <Pill key={id} label={label} active={allergens.includes(id)} onPress={() => setAllergens((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />)}</View>
      <Text style={styles.label}>“May contain” allergens</Text>
      <View style={styles.pills}>{(Object.entries(foodAllergenLabels) as [FoodAllergen, string][]).map(([id, label]) => <Pill key={id} label={label} active={mayContainAllergens.includes(id)} onPress={() => setMayContainAllergens((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />)}</View>
      <Pill label="I checked the current package label" active={labelChecked} onPress={() => setLabelChecked((current) => !current)} />
      <Text style={styles.safety}>{ALLERGY_SAFETY_NOTICE}</Text>
      <Text style={styles.note}>Creamy Tuner stores this data only on your device. Values are estimates based on what you enter.</Text>
      <GradientButton title="Save Ingredient" icon="content-save" onPress={submit} />
    </Screen>
  );
}

function LabelPhotoSlot({ title, optional, uri, onCamera, onLibrary }: { title: string; optional?: boolean; uri: string; onCamera: () => void; onLibrary: () => void }) {
  return <View style={styles.photoSlot}>
    <Text style={styles.photoTitle}>{title}</Text>
    <Text style={styles.photoOptional}>{optional ? 'Optional' : 'Required'}</Text>
    {uri ? <Image source={{ uri }} style={styles.labelPreview} contentFit="cover" accessibilityLabel={`${title} selected`} /> : <View style={styles.photoPlaceholder}><Icon name="image-outline" color={palette.textMuted} size={32} /><Text style={styles.photoPlaceholderText}>No photo</Text></View>}
    <View style={styles.photoButtons}>
      <Pressable onPress={onCamera} style={styles.photoButton} accessibilityRole="button" accessibilityLabel={`Take ${title} photo`}><Icon name="camera-outline" color={palette.cyan} size={19} /><Text style={styles.photoButtonText}>Take</Text></Pressable>
      <Pressable onPress={onLibrary} style={styles.photoButton} accessibilityRole="button" accessibilityLabel={`Choose ${title} photo`}><Icon name="image-outline" color={palette.lavender} size={19} /><Text style={styles.photoButtonText}>Choose</Text></Pressable>
    </View>
  </View>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor={palette.textFaint} /></View>;
}

const styles = StyleSheet.create({
  scanCard: { marginBottom: spacing.lg, padding: spacing.md },
  scanHeading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md },
  scanIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(241,78,155,0.14)' },
  scanHeadingCopy: { flex: 1 },
  scanTitle: { color: palette.text, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  scanIntro: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  photoSlot: { flex: 1, minWidth: 0, padding: spacing.xs, borderRadius: radii.md, backgroundColor: palette.panelSoft, borderWidth: 1, borderColor: palette.border },
  photoTitle: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  photoOptional: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginBottom: spacing.xs },
  labelPreview: { width: '100%', height: 112, borderRadius: radii.sm, backgroundColor: palette.panelRaised },
  photoPlaceholder: { height: 112, borderRadius: radii.sm, backgroundColor: palette.panelRaised, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoPlaceholderText: { color: palette.textMuted, fontSize: 13 },
  photoButtons: { gap: 6, marginTop: spacing.xs },
  photoButton: { minHeight: 44, borderRadius: radii.sm, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  photoButtonText: { color: palette.text, fontSize: 14, fontWeight: '800' },
  scanSpinner: { marginTop: spacing.sm },
  scanMessage: { color: palette.cyan, fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: spacing.sm },
  privacy: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  field: { marginBottom: spacing.md },
  label: { color: palette.textMuted, fontSize: 16, lineHeight: 21, fontWeight: '700', marginBottom: spacing.xs },
  input: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  half: { width: '48%' },
  note: { ...textStyles.caption, marginBottom: spacing.lg },
  safety: { color: palette.warning, fontSize: 13, lineHeight: 19, marginVertical: spacing.md },
});
