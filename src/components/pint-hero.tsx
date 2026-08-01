import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { Icon } from '@/src/components/ui';
import { palette, radii, spacing } from '@/src/theme';

type PintHeroProps = {
  image: ImageSourcePropType;
  frames?: ImageSourcePropType[];
  label?: string;
  size?: number;
};

export function PintHero({ image, frames = [image], label = 'CreamyTuner pint', size = 300 }: PintHeroProps) {
  const [angle, setAngle] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const startAngle = useRef(0);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) { setReducedMotion(value); setPlaying(!value); } });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReducedMotion(value);
      setPlaying(!value);
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    const timer = setInterval(() => setAngle((current) => current >= 16 ? -16 : current + 1), 80);
    return () => clearInterval(timer);
  }, [playing, reducedMotion]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { startAngle.current = angle; setPlaying(false); },
    onPanResponderMove: (_, gesture) => setAngle(Math.max(-28, Math.min(28, startAngle.current - gesture.dx / 8))),
    onPanResponderRelease: () => { if (!reducedMotion) setPlaying(true); },
  }), [angle, reducedMotion]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]} {...panResponder.panHandlers} accessible accessibilityLabel={`${label}. Drag horizontally to rotate.`}>
      <Animated.View style={[styles.imageFrame, { transform: [{ perspective: 900 }, { rotateY: `${angle}deg` }] }]}>
        <Image source={frames[angle > 0 && frames.length > 1 ? 1 : 0]} style={styles.image} contentFit="contain" cachePolicy="memory-disk" transition={120} accessibilityLabel={label} />
      </Animated.View>
      <View pointerEvents="none" style={styles.glow} />
      <Pressable onPress={() => setPlaying((value) => !value)} accessibilityRole="button" accessibilityLabel={playing ? 'Pause pint animation' : 'Play pint animation'} style={styles.control}>
        <Icon name={playing ? 'pause' : 'play'} size={16} color={palette.white} />
        <Text style={styles.controlText}>{reducedMotion ? 'Motion reduced' : playing ? 'Pause' : 'Spin'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radii.xl },
  imageFrame: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  glow: { position: 'absolute', width: '70%', height: '26%', borderRadius: 999, backgroundColor: 'rgba(241,78,155,0.16)', bottom: '8%', transform: [{ scaleX: 1.4 }], zIndex: -1 },
  control: { position: 'absolute', bottom: spacing.sm, alignSelf: 'center', minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(9,13,32,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  controlText: { color: palette.white, fontSize: 14, fontWeight: '800' },
});
