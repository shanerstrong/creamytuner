import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/src/components/ui';
import { getPintFillState } from '@/src/domain/fill';
import { clampCreamyPosition } from '@/src/domain/tutorial';
import { palette, radii, shadows, spacing } from '@/src/theme';

type CreamyPosition = { x: number; y: number };

type MiniPintOverlayProps = {
  amountMl: number;
  capacityMl: number;
  visible: boolean;
  position: CreamyPosition;
  onToggle: () => void;
  onPositionChange: (position: CreamyPosition) => void;
};

export function MiniPintOverlay({ amountMl, capacityMl, visible, position, onToggle, onPositionChange }: MiniPintOverlayProps) {
  const fill = getPintFillState(amountMl, capacityMl);
  const danger = fill.status === 'overflow';
  const mood = danger ? 'scared' : fill.status === 'empty' ? 'bored' : 'happy';
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const guideWidth = Math.min(width, 560);
  const fillHeight = useSharedValue(0);
  const reaction = useSharedValue(0);
  const dragX = useSharedValue(position.x);
  const dragY = useSharedValue(position.y);
  const dragStart = useRef(position);

  useEffect(() => {
    const target = (fill.visualPercent / 100) * 98;
    fillHeight.value = reducedMotion ? target : withTiming(target, { duration: 650 });
    if (!reducedMotion) reaction.value = withSequence(withTiming(-7, { duration: 120 }), withSpring(0, { damping: 9, stiffness: 180 }));
  }, [fill.visualPercent, fillHeight, reaction, reducedMotion]);

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

  if (!visible) {
    return (
      <Animated.View style={[styles.showWrap, positionStyle]}>
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Show Creamy helper" style={styles.showButton}>
          <Icon name="emoticon-happy-outline" size={21} color={palette.cyan} />
          <Text style={styles.showText}>Show Creamy</Text>
        </Pressable>
      </Animated.View>
    );
  }

  const moodCopy = mood === 'scared' ? 'Scared because the pint is too full.' : mood === 'bored' ? 'Bored because the pint is empty.' : 'Happy because ingredients were added.';
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.overlay, danger && styles.overlayDanger, positionStyle]}
      accessibilityLabel={`Creamy, live pint helper. ${fill.amountMl} milliliters of ${fill.capacityMl}. ${fill.title}. ${moodCopy} Drag Creamy to move him.`}
      accessibilityLiveRegion="polite">
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Hide Creamy helper" style={styles.hideButton}>
        <Icon name="eye-off-outline" size={18} color={palette.textMuted} />
      </Pressable>
      <View style={styles.pintWrap}>
        {danger ? <View style={styles.spill} /> : null}
        <View style={[styles.pint, danger && styles.pintDanger]}>
          <Animated.View style={[styles.liquid, liquidStyle]}>
            <LinearGradient colors={danger ? ['#FF6B83', '#C93B83'] : ['#FF9AC8', '#B545D6']} style={StyleSheet.absoluteFill} />
            <View style={styles.liquidTop} />
          </Animated.View>
          <CreamyFace mood={mood} />
          <View style={styles.maxLine}><Text style={styles.maxText}>MAX</Text></View>
          <View style={styles.shine} />
          <View style={styles.rim} />
        </View>
      </View>
      <Text style={[styles.name, danger && styles.dangerText]}>Creamy</Text>
      <Text style={styles.label}>{danger ? 'TOO FULL!' : fill.status === 'empty' ? 'ADD SOMETHING' : `${fill.percent}% FULL`}</Text>
      <Text style={styles.dragHint}>Drag me</Text>
    </Animated.View>
  );
}

function CreamyFace({ mood }: { mood: 'bored' | 'happy' | 'scared' }) {
  return (
    <View style={styles.face} pointerEvents="none">
      {mood === 'scared' ? <View style={styles.brows}><View style={styles.browLeft} /><View style={styles.browRight} /></View> : null}
      <View style={styles.eyes}>
        <View style={[styles.eye, mood === 'bored' && styles.eyeBored, mood === 'scared' && styles.eyeScared]} />
        <View style={[styles.eye, mood === 'bored' && styles.eyeBored, mood === 'scared' && styles.eyeScared]} />
      </View>
      <Text style={[styles.mouth, mood === 'scared' && styles.mouthScared]}>{mood === 'happy' ? '‿' : mood === 'scared' ? 'O' : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', zIndex: 50, right: 12, bottom: 96, width: 122, minHeight: 186, alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(78,217,232,0.45)', backgroundColor: 'rgba(10,16,38,0.96)', padding: spacing.xs, ...shadows.glow },
  overlayDanger: { borderColor: palette.danger, backgroundColor: 'rgba(69,18,43,0.97)' },
  hideButton: { position: 'absolute', zIndex: 8, top: 4, right: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pintWrap: { height: 108, width: 78, justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  pint: { width: 66, height: 98, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(235,241,255,0.78)', borderRadius: 13, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: 'rgba(230,239,255,0.08)' },
  pintDanger: { borderColor: palette.white },
  liquid: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  liquidTop: { position: 'absolute', top: -3, left: 0, right: 0, height: 7, borderRadius: 20, backgroundColor: 'rgba(255,224,240,0.82)' },
  face: { position: 'absolute', zIndex: 6, left: 15, right: 15, top: 41, alignItems: 'center' },
  eyes: { flexDirection: 'row', gap: 13, alignItems: 'center', height: 12 },
  eye: { width: 7, height: 9, borderRadius: 5, backgroundColor: '#15172C' },
  eyeBored: { width: 10, height: 2, borderRadius: 1 },
  eyeScared: { width: 9, height: 12, borderRadius: 6, backgroundColor: palette.white, borderWidth: 3, borderColor: '#15172C' },
  brows: { position: 'absolute', top: -7, flexDirection: 'row', gap: 12 },
  browLeft: { width: 11, height: 2, backgroundColor: '#15172C', transform: [{ rotate: '18deg' }] },
  browRight: { width: 11, height: 2, backgroundColor: '#15172C', transform: [{ rotate: '-18deg' }] },
  mouth: { color: '#15172C', fontSize: 22, lineHeight: 22, fontWeight: '900', marginTop: 1 },
  mouthScared: { fontSize: 16, lineHeight: 20 },
  maxLine: { position: 'absolute', zIndex: 4, left: 4, right: 4, top: '8%', borderTopWidth: 1.5, borderTopColor: palette.danger },
  maxText: { alignSelf: 'center', color: palette.danger, fontSize: 9, lineHeight: 12, fontWeight: '900', backgroundColor: 'rgba(8,12,31,0.9)', marginTop: -6, paddingHorizontal: 2 },
  shine: { position: 'absolute', zIndex: 2, top: 17, bottom: 8, left: 7, width: 5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  rim: { position: 'absolute', zIndex: 7, top: -1, left: -2, right: -2, height: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.86)', borderRadius: 7 },
  spill: { position: 'absolute', zIndex: 5, top: 0, width: 78, height: 13, borderRadius: 10, backgroundColor: palette.pink },
  name: { color: palette.text, fontSize: 17, lineHeight: 21, fontWeight: '900' },
  dangerText: { color: palette.danger },
  label: { color: palette.cyan, fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.45 },
  dragHint: { color: palette.textFaint, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  showWrap: { position: 'absolute', zIndex: 50, right: 12, bottom: 102 },
  showButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(78,217,232,0.45)', backgroundColor: 'rgba(10,16,38,0.96)', paddingHorizontal: spacing.sm, ...shadows.glow },
  showText: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900' },
});
