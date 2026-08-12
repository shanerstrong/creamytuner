import { Image } from 'expo-image';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { radii } from '@/src/theme';

type PintHeroProps = {
  image: ImageSourcePropType;
  frames?: ImageSourcePropType[];
  label?: string;
  size?: number;
};

export function PintHero({ image, frames = [image], label = 'Creamy Tuner pint', size = 300 }: PintHeroProps) {
  const [angle, setAngle] = useState(0);
  const startAngle = useRef(0);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2,
    onPanResponderGrant: () => { startAngle.current = angle; },
    onPanResponderMove: (_, gesture) => setAngle(Math.max(-28, Math.min(28, startAngle.current - gesture.dx / 8))),
  }), [angle]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]} {...panResponder.panHandlers} accessible accessibilityLabel={`${label}. Drag horizontally to rotate.`}>
      <Animated.View style={[styles.imageFrame, { transform: [{ perspective: 900 }, { rotateY: `${angle}deg` }] }]}>
        <Image source={frames[angle > 0 && frames.length > 1 ? 1 : 0]} style={styles.image} contentFit="contain" cachePolicy="memory-disk" transition={120} accessibilityLabel={label} />
      </Animated.View>
      <View pointerEvents="none" style={styles.glow} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radii.xl },
  imageFrame: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  glow: { position: 'absolute', width: '70%', height: '26%', borderRadius: 999, backgroundColor: 'rgba(241,78,155,0.16)', bottom: '8%', transform: [{ scaleX: 1.4 }], zIndex: -1 },
});
