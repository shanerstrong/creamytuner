import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/src/components/ui';
import { getPintFillState } from '@/src/domain/fill';
import { clampCreamyPosition } from '@/src/domain/tutorial';
import { palette, radii, shadows, spacing } from '@/src/theme';

type CreamyPosition = { x: number; y: number };
export type IngredientAddition = { kind: 'liquid' | 'fruit' | 'spoon'; nonce: number };

type MiniPintOverlayProps = {
  amountMl: number;
  capacityMl: number;
  visible: boolean;
  position: CreamyPosition;
  addition?: IngredientAddition;
  onToggle: () => void;
  onPositionChange: (position: CreamyPosition) => void;
};

export function MiniPintOverlay({ amountMl, capacityMl, visible, position, addition, onToggle, onPositionChange }: MiniPintOverlayProps) {
  const fill = getPintFillState(amountMl, capacityMl);
  const danger = fill.status === 'overflow';
  const mood = danger ? 'scared' : fill.status === 'empty' ? 'bored' : 'happy';
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const guideWidth = Math.min(width, 560);
  const fillHeight = useSharedValue(0);
  const reaction = useSharedValue(0);
  const faceScale = useSharedValue(1);
  const faceX = useSharedValue(0);
  const additionProgress = useSharedValue(1);
  const dragX = useSharedValue(position.x);
  const dragY = useSharedValue(position.y);
  const dragStart = useRef(position);

  useEffect(() => {
    const target = (fill.visualPercent / 100) * 112;
    fillHeight.value = reducedMotion ? target : withTiming(target, { duration: 650 });
    if (!reducedMotion) reaction.value = withSequence(withTiming(-7, { duration: 120 }), withSpring(0, { damping: 9, stiffness: 180 }));
  }, [fill.visualPercent, fillHeight, reaction, reducedMotion]);

  useEffect(() => {
    if (!addition?.nonce || reducedMotion) return;
    additionProgress.value = 0;
    additionProgress.value = withTiming(1, { duration: 760 });
    faceScale.value = withSequence(withSpring(1.28, { damping: 7 }), withSpring(1, { damping: 8 }));
  }, [addition?.nonce, additionProgress, faceScale, reducedMotion]);

  useEffect(() => {
    if (!danger || reducedMotion) return;
    faceX.value = withSequence(withTiming(-5, { duration: 70 }), withTiming(5, { duration: 70 }), withTiming(-3, { duration: 70 }), withTiming(3, { duration: 70 }), withSpring(0));
  }, [danger, faceX, reducedMotion]);

  useEffect(() => {
    const next = clampCreamyPosition(position, guideWidth, height);
    dragX.value = next.x;
    dragY.value = next.y;
  }, [dragX, dragY, guideWidth, height, position]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => { dragStart.current = { x: dragX.value, y: dragY.value }; },
    onPanResponderMove: (_, gesture) => {
      const next = clampCreamyPosition({ x: dragStart.current.x + gesture.dx, y: dragStart.current.y + gesture.dy }, guideWidth, height);
      dragX.value = next.x;
      dragY.value = next.y;
    },
    onPanResponderRelease: () => onPositionChange({ x: dragX.value, y: dragY.value }),
    onPanResponderTerminate: () => onPositionChange({ x: dragX.value, y: dragY.value }),
  }), [dragX, dragY, guideWidth, height, onPositionChange]);

  const positionStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }, { translateY: dragY.value + reaction.value }] }));
  const liquidStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateX: faceX.value }, { scale: faceScale.value }] }));
  const fallingStyle = useAnimatedStyle(() => ({ opacity: additionProgress.value < 0.96 ? 1 : 0, transform: [{ translateY: interpolate(additionProgress.value, [0, 0.76, 1], [-36, 24, 27]) }, { rotate: `${interpolate(additionProgress.value, [0, 1], [-20, 20])}deg` }, { scale: interpolate(additionProgress.value, [0, 0.8, 1], [0.8, 1, 0.25]) }] }));
  const splashStyle = useAnimatedStyle(() => ({ opacity: interpolate(additionProgress.value, [0, 0.7, 0.9, 1], [0, 0, 1, 0]), transform: [{ scale: interpolate(additionProgress.value, [0.7, 1], [0.4, 1.7]) }] }));

  if (!visible) {
    return (
      <View style={styles.showWrap}>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Show Creamy helper" style={styles.showButton}>
          <View style={styles.miniPint}><View style={styles.miniLiquid} /><View style={styles.miniEyes}><View style={styles.miniEye} /><View style={styles.miniEye} /></View><Text style={styles.miniMouth}>u</Text></View>
        </Pressable>
      </View>
    );
  }

  const moodCopy = mood === 'scared' ? 'Scared because the pint is too full.' : mood === 'bored' ? 'Bored because the pint is empty.' : 'Happy because ingredients were added.';
  return (
    <Animated.View style={[styles.overlay, danger && styles.overlayDanger, positionStyle]} accessibilityLabel={`Creamy, live pint helper. ${fill.amountMl} milliliters of ${fill.capacityMl}. ${fill.title}. ${moodCopy} Drag the pint to move Creamy.`} accessibilityLiveRegion="polite">
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Hide Creamy helper" style={styles.hideButton}><Icon name="eye-off-outline" size={22} color={palette.textMuted} /></Pressable>
      <View {...panResponder.panHandlers} style={styles.pintWrap} accessibilityRole="adjustable" accessibilityLabel="Drag Creamy pint">
        <AdditionAnimation kind={addition?.kind ?? 'liquid'} fallingStyle={fallingStyle} splashStyle={splashStyle} />
        {danger ? <View style={styles.spill} /> : null}
        <View style={[styles.pint, danger && styles.pintDanger]}>
          <Animated.View style={[styles.liquid, liquidStyle]}><LinearGradient colors={danger ? ['#FF6B83', '#C93B83'] : ['#FF9AC8', '#B545D6']} style={StyleSheet.absoluteFill} /><View style={styles.liquidTop} /></Animated.View>
          <Animated.View style={[styles.faceSticker, faceStyle]}><CreamyFace mood={mood} /></Animated.View>
          <View style={styles.maxLine}><Text style={styles.maxText}>MAX</Text></View><View style={styles.shine} /><View style={styles.rim} />
        </View>
      </View>
      <Text style={[styles.name, danger && styles.dangerText]}>Creamy</Text>
      <Text style={styles.label}>{danger ? 'TOO FULL!' : fill.status === 'empty' ? 'ADD SOMETHING' : `${fill.percent}% FULL`}</Text>
      <Text style={styles.dragHint}>Drag me anywhere</Text>
    </Animated.View>
  );
}

function AdditionAnimation({ kind, fallingStyle, splashStyle }: { kind: IngredientAddition['kind']; fallingStyle: object; splashStyle: object }) {
  return <View pointerEvents="none" style={styles.additionLayer}>
    <Animated.View style={[styles.fallingIngredient, fallingStyle]}>
      {kind === 'liquid' ? <><View style={styles.dropLarge} /><View style={styles.dropSmall} /></> : kind === 'fruit' ? <><View style={styles.berry}><View style={styles.berryLeaf} /></View><View style={styles.berrySmall} /></> : <Icon name="spoon-sugar" size={35} color={palette.white} />}
    </Animated.View>
    <Animated.View style={[styles.splash, splashStyle]}><View style={styles.splashLineLeft} /><View style={styles.splashRing} /><View style={styles.splashLineRight} /></Animated.View>
  </View>;
}

function CreamyFace({ mood }: { mood: 'bored' | 'happy' | 'scared' }) {
  return <View style={styles.face} pointerEvents="none">
    {mood === 'scared' ? <View style={styles.brows}><View style={styles.browLeft} /><View style={styles.browRight} /></View> : null}
    <View style={styles.eyes}><View style={[styles.eye, mood === 'bored' && styles.eyeBored, mood === 'scared' && styles.eyeScared]} /><View style={[styles.eye, mood === 'bored' && styles.eyeBored, mood === 'scared' && styles.eyeScared]} /></View>
    <Text style={[styles.mouth, mood === 'scared' && styles.mouthScared]}>{mood === 'happy' ? 'U' : mood === 'scared' ? 'O' : '-'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', zIndex: 50, right: 12, bottom: 180, width: 154, minHeight: 210, alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(78,217,232,0.45)', backgroundColor: 'rgba(10,16,38,0.96)', padding: spacing.xs, ...shadows.glow },
  overlayDanger: { borderColor: palette.danger, backgroundColor: 'rgba(69,18,43,0.97)' },
  hideButton: { position: 'absolute', zIndex: 20, top: 3, right: 2, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  pintWrap: { height: 132, width: 94, justifyContent: 'flex-end', alignItems: 'center', marginTop: 5, marginLeft: -28 },
  pint: { width: 82, height: 116, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(235,241,255,0.88)', borderRadius: 16, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: 'rgba(230,239,255,0.1)' },
  pintDanger: { borderColor: palette.white }, liquid: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' }, liquidTop: { position: 'absolute', top: -3, left: 0, right: 0, height: 8, borderRadius: 20, backgroundColor: 'rgba(255,224,240,0.86)' },
  faceSticker: { position: 'absolute', zIndex: 8, left: 11, top: 42, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,245,251,0.92)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)', ...shadows.glow },
  face: { alignItems: 'center' }, eyes: { flexDirection: 'row', gap: 14, alignItems: 'center', height: 15 }, eye: { width: 9, height: 12, borderRadius: 6, backgroundColor: '#15172C' }, eyeBored: { width: 12, height: 3, borderRadius: 2 }, eyeScared: { width: 12, height: 15, borderRadius: 8, backgroundColor: palette.white, borderWidth: 3, borderColor: '#15172C' },
  brows: { position: 'absolute', top: -9, flexDirection: 'row', gap: 14 }, browLeft: { width: 13, height: 3, backgroundColor: '#15172C', transform: [{ rotate: '18deg' }] }, browRight: { width: 13, height: 3, backgroundColor: '#15172C', transform: [{ rotate: '-18deg' }] }, mouth: { color: '#15172C', fontSize: 26, lineHeight: 27, fontWeight: '900', marginTop: -1 }, mouthScared: { fontSize: 22 },
  maxLine: { position: 'absolute', zIndex: 4, left: 4, right: 4, top: '8%', borderTopWidth: 1.5, borderTopColor: palette.danger }, maxText: { alignSelf: 'center', color: palette.danger, fontSize: 9, lineHeight: 12, fontWeight: '900', backgroundColor: 'rgba(8,12,31,0.9)', marginTop: -6, paddingHorizontal: 2 }, shine: { position: 'absolute', zIndex: 2, top: 17, bottom: 8, left: 8, width: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' }, rim: { position: 'absolute', zIndex: 9, top: -1, left: -2, right: -2, height: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 8 }, spill: { position: 'absolute', zIndex: 12, top: 13, width: 92, height: 14, borderRadius: 10, backgroundColor: palette.pink },
  additionLayer: { position: 'absolute', zIndex: 18, top: 0, width: 74, height: 68, alignItems: 'center' }, fallingIngredient: { position: 'absolute', top: 3, height: 42, alignItems: 'center', justifyContent: 'center' }, dropLarge: { width: 19, height: 28, borderRadius: 12, backgroundColor: '#7EE7F2', transform: [{ rotate: '10deg' }] }, dropSmall: { position: 'absolute', right: -12, top: 12, width: 8, height: 12, borderRadius: 6, backgroundColor: '#D4FAFF' }, berry: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4F7C' }, berrySmall: { position: 'absolute', right: -13, top: 18, width: 14, height: 14, borderRadius: 7, backgroundColor: '#B43BCE' }, berryLeaf: { position: 'absolute', top: -5, left: 9, width: 10, height: 8, borderRadius: 5, backgroundColor: '#65D39A' }, splash: { position: 'absolute', bottom: 2, width: 50, height: 22, alignItems: 'center' }, splashRing: { width: 34, height: 9, borderRadius: 18, borderWidth: 3, borderColor: palette.cyan }, splashLineLeft: { position: 'absolute', left: 3, top: 0, width: 3, height: 13, borderRadius: 2, backgroundColor: palette.pink, transform: [{ rotate: '-35deg' }] }, splashLineRight: { position: 'absolute', right: 3, top: 0, width: 3, height: 13, borderRadius: 2, backgroundColor: palette.pink, transform: [{ rotate: '35deg' }] },
  name: { color: palette.text, fontSize: 18, lineHeight: 22, fontWeight: '900' }, dangerText: { color: palette.danger }, label: { color: palette.cyan, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 0.45 }, dragHint: { color: palette.textFaint, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  showWrap: { position: 'absolute', zIndex: 50, right: 12, top: 112 }, showButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(78,217,232,0.55)', backgroundColor: 'rgba(10,16,38,0.97)', ...shadows.glow }, miniPint: { width: 31, height: 35, overflow: 'hidden', borderRadius: 7, borderWidth: 2, borderColor: palette.white, alignItems: 'center', justifyContent: 'center' }, miniLiquid: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, backgroundColor: palette.pink }, miniEyes: { zIndex: 2, flexDirection: 'row', gap: 6 }, miniEye: { width: 4, height: 5, borderRadius: 3, backgroundColor: '#15172C' }, miniMouth: { zIndex: 2, color: '#15172C', fontSize: 12, lineHeight: 12, fontWeight: '900' },
});
