import type { ImageSourcePropType } from 'react-native';
import type { Recipe } from '@/src/types';

const strawberry = require('@/assets/images/pints/smooth-strawberry.png');
const strawberryAngle = require('@/assets/images/pints/smooth-strawberry-angle.png');
const chocolate = require('@/assets/images/pints/smooth-chocolate.png');
const mint = require('@/assets/images/pints/smooth-mint.png');
const cookies = require('@/assets/images/pints/smooth-cookies.png');

export const recipeImages: Record<Recipe['imageKey'], ImageSourcePropType> = {
  strawberry,
  chocolate,
  mint,
  cookies,
};

export const pintSpinFrames: ImageSourcePropType[] = [strawberry, strawberryAngle];
