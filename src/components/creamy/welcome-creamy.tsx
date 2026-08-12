import { useEventListener } from 'expo';
import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CREAMY_DAD_JOKES } from '@/src/components/creamy/dad-jokes';
import {
  TUTORIAL_CREAMY_BLINK,
  TUTORIAL_CREAMY_FRAMES,
  WELCOME_CREAMY_ENTRANCE,
  WELCOME_CREAMY_IDLE,
  WELCOME_CREAMY_POSTER,
  preloadCreamyFrames,
} from '@/src/components/creamy/mascot-assets';
import { palette } from '@/src/theme';

const WELCOME_REACTION_FACES: ImageSource[] = [
  TUTORIAL_CREAMY_BLINK,
  TUTORIAL_CREAMY_FRAMES[9],
  TUTORIAL_CREAMY_FRAMES[11],
  TUTORIAL_CREAMY_FRAMES[13],
  TUTORIAL_CREAMY_FRAMES[14],
];

export function WelcomeCreamy({ compact = false, motionEnabled = true }: { compact?: boolean; motionEnabled?: boolean }) {
  const reducedMotion = useReducedMotion();
  const animate = motionEnabled && !reducedMotion;
  const reaction = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const dragActive = useSharedValue(0);
  const grabScale = useSharedValue(1);
  const lastFaceIndex = useRef(-1);
  const lastJokeIndex = useRef(-1);
  const suppressPress = useRef(false);
  const faceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jokeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<'entrance' | 'idle'>('entrance');
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reactionFace, setReactionFace] = useState<ImageSource | null>(null);
  const [joke, setJoke] = useState<string | null>(null);

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
    void preloadCreamyFrames(WELCOME_REACTION_FACES).catch(() => undefined);
  }, []);

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
    const startTimer = setTimeout(() => entrancePlayer.replay(), 0);

    return () => {
      clearTimeout(startTimer);
      entrancePlayer.pause();
      idlePlayer.pause();
    };
  }, [animate, entrancePlayer, idlePlayer]);

  useEffect(() => {
    if (!animate || phase !== 'idle') return;
    idlePlayer.currentTime = 0;
    idlePlayer.play();
  }, [animate, idlePlayer, phase]);

  const dismissJoke = useCallback(() => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current);
    jokeTimer.current = null;
    setJoke(null);
  }, []);

  const showRandomJoke = useCallback(() => {
    if (jokeTimer.current) clearTimeout(jokeTimer.current);
    let nextIndex = Math.floor(Math.random() * CREAMY_DAD_JOKES.length);
    if (nextIndex === lastJokeIndex.current) nextIndex = (nextIndex + 1) % CREAMY_DAD_JOKES.length;
    lastJokeIndex.current = nextIndex;
    setJoke(CREAMY_DAD_JOKES[nextIndex]);
    jokeTimer.current = setTimeout(dismissJoke, 5600);
  }, [dismissJoke]);

  const showFace = useCallback((face: ImageSource) => {
    if (faceTimer.current) clearTimeout(faceTimer.current);
    setReactionFace(face);
    faceTimer.current = setTimeout(() => setReactionFace(null), 1000);
  }, []);

  const nextFunnyFace = useCallback(() => {
    let nextIndex = Math.floor(Math.random() * WELCOME_REACTION_FACES.length);
    if (nextIndex === lastFaceIndex.current) nextIndex = (nextIndex + 1) % WELCOME_REACTION_FACES.length;
    lastFaceIndex.current = nextIndex;
    showFace(WELCOME_REACTION_FACES[nextIndex]);
  }, [showFace]);

  const triggerReaction = useCallback(() => {
    if (!animate) return;
    reaction.value = 0;
    reaction.value = withSequence(
      withTiming(1, { duration: 150 }),
      withSpring(0, { damping: 8, stiffness: 150 }),
    );
    nextFunnyFace();
    showRandomJoke();
    void Haptics.selectionAsync().catch(() => undefined);
  }, [animate, nextFunnyFace, reaction, showRandomJoke]);

  const beginDrag = useCallback(() => {
    dismissJoke();
    showFace(TUTORIAL_CREAMY_FRAMES[13]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [dismissJoke, showFace]);

  const markDragStarted = useCallback(() => {
    if (suppressResetTimer.current) clearTimeout(suppressResetTimer.current);
    suppressPress.current = true;
  }, []);

  const finishDrag = useCallback(() => {
    showFace(TUTORIAL_CREAMY_FRAMES[14]);
    void Haptics.selectionAsync().catch(() => undefined);
    suppressResetTimer.current = setTimeout(() => { suppressPress.current = false; }, 120);
  }, [showFace]);

  const mascotGesture = useMemo(() => {
    return Gesture.Pan()
      .activateAfterLongPress(300)
      .minDistance(1)
      .onStart(() => {
        dragActive.value = 1;
        dragStartX.value = dragX.value;
        dragStartY.value = dragY.value;
        grabScale.value = withSpring(1.055, { damping: 12, stiffness: 180 });
        runOnJS(markDragStarted)();
        runOnJS(beginDrag)();
      })
      .onUpdate((event) => {
        dragX.value = Math.max(-108, Math.min(108, dragStartX.value + event.translationX));
        dragY.value = Math.max(-76, Math.min(88, dragStartY.value + event.translationY));
      })
      .onFinalize(() => {
        if (!dragActive.value) return;
        dragActive.value = 0;
        dragX.value = withSpring(0, { damping: 11, stiffness: 125 });
        dragY.value = withSpring(0, { damping: 11, stiffness: 125 });
        grabScale.value = withSpring(1, { damping: 10, stiffness: 150 });
        runOnJS(finishDrag)();
      });
  }, [beginDrag, dragActive, dragStartX, dragStartY, dragX, dragY, finishDrag, grabScale, markDragStarted]);

  useEffect(() => () => {
    if (faceTimer.current) clearTimeout(faceTimer.current);
    if (jokeTimer.current) clearTimeout(jokeTimer.current);
    if (suppressResetTimer.current) clearTimeout(suppressResetTimer.current);
  }, []);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value + interpolate(reaction.value, [0, 1], [0, -8]) },
      { rotate: `${interpolate(dragX.value, [-108, 0, 108], [-9, 0, 9]) + interpolate(reaction.value, [0, 1], [0, 2.5])}deg` },
      { scale: grabScale.value * interpolate(reaction.value, [0, 1], [1, 1.025]) },
    ],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reaction.value, [0, 0.18, 0.76, 1], [0, 1, 0.65, 0]),
    transform: [{ scale: interpolate(reaction.value, [0, 1], [0.35, 1.25]) }],
  }));

  const stage = (
    <Animated.View
      testID="welcome-creamy-stage"
      style={[styles.stage, compact && styles.stageCompact, stageStyle]}
    >
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
      {reactionFace ? (
        <Animated.View testID="welcome-creamy-reaction-face" pointerEvents="none" style={styles.faceCover}>
          <Image source={reactionFace} contentFit="contain" cachePolicy="memory-disk" transition={120} accessible={false} style={styles.reactionImage} />
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleOne, sparkleStyle]} />
      <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleTwo, sparkleStyle]} />
      <Animated.View pointerEvents="none" style={[styles.sparkle, styles.sparkleThree, sparkleStyle]} />
    </Animated.View>
  );

  return (
    <View style={[styles.tapTarget, compact && styles.tapTargetCompact, joke && styles.tapTargetWithJoke, joke && compact && styles.tapTargetCompactWithJoke]}>
      {joke ? (
        <Animated.View testID="welcome-creamy-joke" style={[styles.jokeBubble, compact && styles.jokeBubbleCompact]} accessibilityRole="summary" accessibilityLiveRegion="polite">
          <View style={styles.jokeRow}>
            <View style={styles.jokeCopy}>
              <Text style={styles.jokeSource}>CREAMY.AI</Text>
              <Text style={[styles.jokeText, compact && styles.jokeTextCompact]}>{joke}</Text>
            </View>
            <Pressable onPress={dismissJoke} accessibilityRole="button" accessibilityLabel="Dismiss Creamy's joke" hitSlop={8} style={styles.jokeClose}>
              <Text style={styles.jokeCloseText}>{'\u00D7'}</Text>
            </Pressable>
          </View>
          <View style={styles.jokeTailBorder} />
          <View style={styles.jokeTail} />
        </Animated.View>
      ) : null}
      {animate ? (
        <GestureDetector gesture={mascotGesture}>
          <Pressable
            onPress={() => { if (!suppressPress.current) triggerReaction(); }}
            accessibilityRole="button"
            accessibilityLabel="Creamy mascot"
            accessibilityHint="Tap for a funny face and joke. Press and hold, then drag Creamy around."
            style={styles.activationSurface}
          >
            {stage}
          </Pressable>
        </GestureDetector>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel="Creamy mascot">{stage}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tapTarget: { position: 'relative', width: 320, height: 352, alignItems: 'center', justifyContent: 'flex-end' },
  tapTargetCompact: { width: 242, height: 266 },
  tapTargetWithJoke: { height: 482 },
  tapTargetCompactWithJoke: { height: 406 },
  activationSurface: { alignItems: 'center', justifyContent: 'center' },
  stage: { position: 'relative', zIndex: 1, width: 320, height: 352, backgroundColor: '#030C26', overflow: 'hidden' },
  stageCompact: { width: 242, height: 266 },
  media: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', backgroundColor: '#030C26' },
  videoLoading: { opacity: 0 },
  faceCover: { ...StyleSheet.absoluteFillObject, zIndex: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#030C26' },
  reactionImage: { position: 'absolute', left: '-12%', top: '-12%', width: '124%', height: '124%' },
  jokeBubble: { position: 'absolute', top: 0, zIndex: 20, width: 296, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(78,217,232,0.78)', backgroundColor: 'rgba(24,37,65,0.98)', padding: 12 },
  jokeBubbleCompact: { top: 0, width: 226, borderRadius: 15, padding: 9 },
  jokeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  jokeCopy: { flex: 1 },
  jokeSource: { color: palette.cyan, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  jokeText: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  jokeTextCompact: { fontSize: 13, lineHeight: 17 },
  jokeClose: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  jokeCloseText: { color: palette.textMuted, fontSize: 20, lineHeight: 22, fontWeight: '800' },
  jokeTailBorder: { position: 'absolute', left: '50%', marginLeft: -10, bottom: -10, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(78,217,232,0.78)' },
  jokeTail: { position: 'absolute', left: '50%', marginLeft: -8, bottom: -7, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(24,37,65,0.97)' },
  sparkle: { position: 'absolute', zIndex: 5, width: 11, height: 11, backgroundColor: '#FFF1A6', transform: [{ rotate: '45deg' }] },
  sparkleOne: { top: '18%', left: '18%' },
  sparkleTwo: { top: '23%', right: '16%', backgroundColor: '#FF78B7' },
  sparkleThree: { bottom: '17%', right: '20%', backgroundColor: '#5CE2EF' },
});
