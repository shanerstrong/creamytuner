import type { ImageSourcePropType } from 'react-native';
import type { Recipe } from '@/src/types';

const strawberry = require('@/assets/images/recipes/strawberry-cheesecake.png');
const chocolate = require('@/assets/images/recipes/chocolate-brownie.png');
const mint = require('@/assets/images/recipes/mint-chip.png');
const cookies = require('@/assets/images/recipes/cookies-cream.png');

export const recipeImages: Record<Recipe['imageKey'], ImageSourcePropType> = {
  strawberry,
  chocolate,
  mint,
  cookies,
};
