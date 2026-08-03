import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Icon } from '@/src/components/ui';
import { getPintFillState } from '@/src/domain/fill';
import { palette, shadows } from '@/src/theme';

export type TutorialAddition = { kind: 'liquid' | 'fruit' | 'spoon' | 'mix-in'; nonce: number };

const ATLAS = require('../../../assets/images/mascot/creamy-fill-progress.png');
const CELL_WIDTH = 84;
const CELL_HEIGHT = 92;
const CROP_X = 4;
const CROP_Y = 4;

export function FooterCreamy({ amountMl, capacityMl, addition, onHide }: { amountMl: number; capacityMl: number; addition: TutorialAddition; onHide?: () => void }) {
  const fill = getPintFillState(amountMl, capacityMl);
  const frame = fill.status === 'empty' ? 0 : fill.percent <= 18 ? 1 : fill.percent <= 35 ? 2 : fill.percent <= 50 ? 3 : fill.percent <= 65 ? 4 : fill.percent <= 80 ? 5 : fill.percent <= 92 ? 6 : 7;
  const column = frame % 4;
  const row = Math.floor(frame / 4);
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!addition.nonce || reducedMotion) return;
    scale.value = withSequence(withSpring(1.12, { damping: 7 }), withSpring(1, { damping: 9 }));
  }, [addition.nonce, reducedMotion, scale]);

  const reactionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const actionIcon = addition.kind === 'fruit' ? 'fruit-cherries' : addition.kind === 'spoon' ? 'spoon-sugar' : addition.kind === 'mix-in' ? 'candy-outline' : 'water';

  return (
    <Pressable onPress={onHide} disabled={!onHide} style={styles.slot} accessibilityRole={onHide ? 'button' : undefined} accessibilityLabel={`Creamy fill guide. ${fill.amountMl} milliliters, ${fill.percent} percent full. ${fill.title}. Tap to hide Creamy.`} accessibilityLiveRegion="polite">
      {addition.nonce ? <Animated.View key={addition.nonce} style={[styles.action, reactionStyle]}><Icon name={actionIcon} size={15} color={palette.white} /></Animated.View> : null}
      <Animated.View style={[styles.crop, reactionStyle]}>
        <Image
          source={ATLAS}
          contentFit="fill"
          transition={reducedMotion ? 0 : 140}
          accessibilityLabel={`Creamy mascot frame ${frame + 1}`}
          style={[styles.atlas, { transform: [{ translateX: -(column * CELL_WIDTH + CROP_X) }, { translateY: -(row * CELL_HEIGHT + CROP_Y) }] }]}
        />
      </Animated.View>
      <Text style={[styles.percent, fill.status === 'overflow' && styles.danger]}>{fill.status === 'empty' ? 'EMPTY' : fill.status === 'overflow' ? 'TOO FULL' : `${fill.percent}%`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { width: 82, minHeight: 100, alignItems: 'center', justifyContent: 'flex-end' },
  crop: { width: 76, height: 86, overflow: 'hidden', borderRadius: 17, borderWidth: 1, borderColor: 'rgba(78,217,232,0.5)', backgroundColor: palette.ink, ...shadows.glow },
  atlas: { position: 'absolute', left: 0, top: 0, width: CELL_WIDTH * 4, height: CELL_HEIGHT * 2 },
  action: { position: 'absolute', zIndex: 5, top: -5, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.pink, borderWidth: 2, borderColor: palette.white },
  percent: { color: palette.cyan, fontSize: 10, lineHeight: 13, fontWeight: '900', marginTop: 2, letterSpacing: 0.3 },
  danger: { color: palette.danger },
});
