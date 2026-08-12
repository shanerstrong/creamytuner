import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  WELCOME_CREAMY_ENTRANCE,
  WELCOME_CREAMY_IDLE,
  WELCOME_CREAMY_POSTER,
} from '@/src/components/creamy/mascot-assets';

export function WelcomeCreamy({ compact = false, motionEnabled = true }: { compact?: boolean; motionEnabled?: boolean }) {
  const reducedMotion = useReducedMotion();
  const animate = motionEnabled && !reducedMotion;
  const reaction = useSharedValue(0);
  const [phase, setPhase] = useState<'entrance' | 'idle'>('entrance');
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const entrancePlayer = useVideoPlayer(WELCOME_CREAMY_ENTRANCE, (player) => {
    player.loop = false;
    player.muted = true;
  });
  const idlePlayer = useVideoPlayer(WELCOME_CREAMY_IDLE, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEventListener(entrancePlayer, 'playToEnd', () => {
    if (!animate) return;
    setFirstFrameRendered(false);
    setPhase('idle');
  });
  useEventListener(entrancePlayer, 'statusChange', ({ status }) => {
    if (status === 'error') setVideoFailed(true);
  });
  useEventListener(idlePlayer, 'statusChange', ({ status }) => {
    if (status === 'error') setVideoFailed(true);
  });

  useEffect(() => {
    if (!animate) {
      entrancePlayer.pause();
      idlePlayer.pause();
      return;
    }

    setPhase('entrance');
    setFirstFrameRendered(false);
    setVideoFailed(false);
    idlePlayer.pause();
    entrancePlayer.replay();
    entrancePlayer.play();

    return () => {
      entrancePlayer.pause();
      idlePlayer.pause();
    };
  }, [animate, entrancePlayer, idlePlayer]);

  useEffect(() => {
    if (!animate || phase !== 'idle') return;
    idlePlayer.currentTime = 0;
    idlePlayer.play();
  }, [animate, idlePlayer, phase]);

  const react = () => {
    if (!animate) return;
    reaction.value = 0;
    reaction.value = withSequence(
      withTiming(1, { duration: 160 }),
      withSpring(0, { damping: 8, stiffness: 150 }),
    );
  };

  const reactionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(reaction.value, [0, 1], [0, -7]) },
      { rotate: `${interpolate(reaction.value, [0, 1], [0, 2.5])}deg` },
      { scale: interpolate(reaction.value, [0, 1], [1, 1.025]) },
    ],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reaction.value, [0, 0.18, 0.76, 1], [0, 1, 0.65, 0]),
    transform: [{ scale: interpolate(reaction.value, [0, 1], [0.35, 1.25]) }],
  }));

  return (
    <Pressable
      onPress={animate ? react : undefined}
      accessibilityRole={animate ? 'button' : 'image'}
      accessibilityLabel="Creamy mascot"
      accessibilityHint={animate ? 'Creamy gives a happy reaction when tapped' : undefined}
      style={[styles.tapTarget, compact && styles.tapTargetCompact]}
    >
      <Animated.View testID="welcome-creamy-stage" style={[styles.stage, compact && styles.stageCompact, reactionStyle]}>
        <Image
          testID="welcome-creamy-hero"
          source={WELCOME_CREAMY_POSTER}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          transition={180}
          accessible={false}
          style={styles.media}
        />
        {animate && !videoFailed ? (
          <VideoView
            testID="welcome-creamy-video"
            player={phase === 'entrance' ? entrancePlayer : idlePlayer}
            nativeControls={false}
            contentFit="cover"
            fullscreenOptions={{ enable: false }}
            playsInline
            allowsVideoFrameAnalysis={false}
            onFirstFrameRender={() => setFirstFrameRendered(true)}
            accessible={false}
            style={[styles.media, !firstFrameRendered && styles.videoLoading]}
          />
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleOne, sparkleStyle]} />
        <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleTwo, sparkleStyle]} />
        <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleThree, sparkleStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tapTarget: { width: 320, height: 352, alignItems: 'center', justifyContent: 'center' },
  tapTargetCompact: { width: 242, height: 266 },
  stage: { position: 'relative', width: 320, height: 352, backgroundColor: '#030C26', overflow: 'hidden' },
  stageCompact: { width: 242, height: 266 },
  media: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', backgroundColor: '#030C26' },
  videoLoading: { opacity: 0 },
  sparkle: { position: 'absolute', width: 11, height: 11, backgroundColor: '#FFF1A6', transform: [{ rotate: '45deg' }] },
  sparkleOne: { top: '18%', left: '18%' },
  sparkleTwo: { top: '23%', right: '16%', backgroundColor: '#FF78B7' },
  sparkleThree: { bottom: '17%', right: '20%', backgroundColor: '#5CE2EF' },
});
