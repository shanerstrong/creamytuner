import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { getPintFillState } from '@/src/domain/fill';
import { palette, shadows } from '@/src/theme';

export type TutorialAddition = { kind: 'liquid' | 'fruit' | 'spoon' | 'mix-in'; nonce: number };

const ATLAS = require('../../../assets/images/mascot/creamy-fill-progress.png');
const CELL_WIDTH = 84;
const CELL_HEIGHT = 92;
// The source atlas is a numbered 8-up storyboard. Start inside each cell so
// the storyboard number and divider never leak into the live mascot crop.
const CROP_X = 0;
const CROP_Y = 18;
const CROP_WIDTH = 84;
const CROP_HEIGHT = 74;

export function FooterCreamy({ amountMl, capacityMl, addition }: { amountMl: number; capacityMl: number; addition: TutorialAddition }) {
  const fill = getPintFillState(amountMl, capacityMl);
  const frame = fill.status === 'empty' ? 0 : fill.percent <= 18 ? 1 : fill.percent <= 35 ? 2 : fill.percent <= 50 ? 3 : fill.percent <= 65 ? 4 : fill.percent <= 80 ? 5 : fill.percent <= 92 ? 6 : 7;
  const column = frame % 4;
  const row = Math.floor(frame / 4);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const taps = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [angry, setAngry] = useState(false);

  useEffect(() => {
    if (!addition.nonce || reducedMotion) return;
    scale.value = withSequence(withSpring(1.12, { damping: 7 }), withSpring(1, { damping: 9 }));
  }, [addition.nonce, reducedMotion, scale]);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const react = () => {
    if (angry) return;
    taps.current += 1;
    if (taps.current < 20) {
      if (!reducedMotion) scale.value = withSequence(withTiming(1.12, { duration: 180 }), withTiming(1, { duration: 320 }));
      return;
    }
    taps.current = 0;
    setAngry(true);
    if (!reducedMotion) {
      rotation.value = withSequence(withTiming(-8, { duration: 80 }), withTiming(8, { duration: 80 }), withTiming(0, { duration: 80 }));
      scale.value = withSequence(withSpring(1.18), withTiming(1.55, { duration: 180 }), withTiming(0.08, { duration: 150 }), withSpring(1));
    }
    resetTimer.current = setTimeout(() => setAngry(false), reducedMotion ? 700 : 900);
  };

  const reactionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }] }));
  return (
    <View style={styles.slot} accessibilityLabel={`Creamy fill guide. ${fill.amountMl} milliliters, ${fill.percent} percent full. ${fill.title}.`} accessibilityLiveRegion="polite">
      <Pressable onPress={react} accessibilityRole="button" accessibilityLabel="Tap Creamy mascot" accessibilityHint="Creamy reacts when tapped" style={styles.tapTarget}>
        <Animated.View style={[styles.crop, angry && styles.angryCrop, reactionStyle]}>
          <Image
            source={ATLAS}
            contentFit="fill"
            transition={reducedMotion ? 0 : 140}
            accessibilityLabel={`Creamy mascot frame ${frame + 1}`}
            style={[styles.atlas, { transform: [{ translateX: -(column * CELL_WIDTH + CROP_X) }, { translateY: -(row * CELL_HEIGHT + CROP_Y) }] }]}
          />
          {angry ? <><View style={styles.redFlash} /><Text style={styles.angryFace}>😡</Text><View style={[styles.spark, styles.sparkOne]} /><View style={[styles.spark, styles.sparkTwo]} /><View style={[styles.spark, styles.sparkThree]} /></> : null}
        </Animated.View>
      </Pressable>
      <Text style={[styles.percent, fill.status === 'overflow' && styles.danger]}>{fill.status === 'empty' ? 'EMPTY' : fill.status === 'overflow' ? 'TOO FULL' : `${fill.percent}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: 82, minHeight: 100, alignItems: 'center', justifyContent: 'flex-end' },
  tapTarget: { width: 84, height: 78, alignItems: 'center', justifyContent: 'center' },
  crop: { width: CROP_WIDTH, height: CROP_HEIGHT, overflow: 'hidden', backgroundColor: 'transparent', ...shadows.glow },
  angryCrop: { backgroundColor: 'rgba(255,35,55,0.42)' },
  atlas: { position: 'absolute', left: 0, top: 0, width: CELL_WIDTH * 4, height: CELL_HEIGHT * 2 },
  redFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,22,42,0.34)' },
  angryFace: { position: 'absolute', left: 22, top: 18, fontSize: 37, lineHeight: 42 },
  spark: { position: 'absolute', width: 9, height: 9, backgroundColor: '#FFCE57', transform: [{ rotate: '45deg' }] },
  sparkOne: { left: 5, top: 8 }, sparkTwo: { right: 4, top: 13 }, sparkThree: { right: 13, bottom: 5 },
  percent: { color: palette.cyan, fontSize: 10, lineHeight: 13, fontWeight: '900', marginTop: 2, letterSpacing: 0.3 },
  danger: { color: palette.danger },
});
