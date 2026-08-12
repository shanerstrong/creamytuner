import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/src/components/ui';
import { palette, radii } from '@/src/theme';
import type { Ingredient } from '@/src/types';

export function ingredientIconName(ingredient: Ingredient): IconName {
  const name = ingredient.name.toLowerCase();
  if (/whey|protein|collagen/.test(name)) return 'shaker-outline';
  if (/cream cheese|cottage cheese|ricotta/.test(name)) return 'cheese';
  if (/yogurt|pudding/.test(name)) return 'bowl-mix-outline';
  if (ingredient.category === 'base') return 'cup-water';
  if (ingredient.category === 'sweetener') return 'spoon-sugar';
  if (ingredient.category === 'stabilizer') return 'blur';
  if (ingredient.category === 'fruit') return 'fruit-cherries';
  if (ingredient.category === 'mix-in') return 'cookie';
  return 'shaker-outline';
}

export function IngredientVisual({ ingredient, highlighted = false }: { ingredient: Ingredient; highlighted?: boolean }) {
  return (
    <View style={[styles.tile, highlighted && styles.highlighted]} accessibilityElementsHidden>
      <Icon name={ingredientIconName(ingredient)} size={24} color={highlighted ? palette.warning : palette.lavender} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.14)' },
  highlighted: { backgroundColor: 'rgba(246,197,106,0.14)' },
});
