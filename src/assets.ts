import type { ImageSourcePropType } from 'react-native';
import type { Recipe } from '@/src/types';

const strawberry = require('@/assets/images/pints/strawberry.png');
const strawberryAngle = require('@/assets/images/pints/strawberry-angle.png');
const chocolate = require('@/assets/images/pints/chocolate.png');
const mint = require('@/assets/images/pints/mint.png');
const cookies = require('@/assets/images/pints/cookies.png');

export const recipeImages: Record<Recipe['imageKey'], ImageSourcePropType> = {
  strawberry,
  chocolate,
  mint,
  cookies,
};

export const pintSpinFrames: ImageSourcePropType[] = [strawberry, strawberryAngle];
