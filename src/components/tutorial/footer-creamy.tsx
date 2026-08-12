import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CREAMY_DAD_JOKES } from '@/src/components/creamy/dad-jokes';
import { TUTORIAL_CREAMY_BLINK, TUTORIAL_CREAMY_FRAMES, preloadCreamyFrames } from '@/src/components/creamy/mascot-assets';
import { getPintFillState } from '@/src/domain/fill';
import { palette } from '@/src/theme';

export type TutorialAddition = { kind: 'liquid' | 'fruit' | 'spoon' | 'mix-in'; nonce: number };
export type CreamyTipProvenance = 'manufacturer' | 'community' | 'creamytuner';
export type CreamyTip = {
  id: string;
  text: string;
  detail: string;
  provenance?: CreamyTipProvenance;
};

const provenanceLabels: Record<CreamyTipProvenance, string> = {
  manufacturer: 'Manufacturer guidance',
  community: 'Community tip',
  creamytuner: 'CreamyTuner suggestion',
};

const TUTORIAL_REACTION_FRAMES = [1, 3, 5, 7, 9, 11, 13, 14] as const;

function estimatedFillLabel(fill: ReturnType<typeof getPintFillState>) {
  if (fill.status === 'empty') return 'Empty';
  if (fill.status === 'overflow') return 'Too full';
  if (fill.percent <= 82) return 'Room left';
  return 'Near max';
}

export function FooterCreamy({
  amountMl,
  capacityMl,
  addition,
  tip,
  tipEnabled = false,
  tipDismissed = false,
  tipLifted = false,
  motionEnabled = true,
  celebrate = false,
  wide = false,
  onDismissTip,
}: {
  amountMl: number;
  capacityMl: number;
  addition: TutorialAddition;
  tip?: CreamyTip;
  tipEnabled?: boolean;
  tipDismissed?: boolean;
  tipLifted?: boolean;
  motionEnabled?: boolean;
  celebrate?: boolean;
  wide?: boolean;
  onDismissTip?: (id: string) => void;
}) {
  const fill = getPintFillState(amountMl, capacityMl);
  const fillLabel = estimatedFillLabel(fill);
  const framePair = fill.status === 'empty' ? 0 : fill.status === 'overflow' ? 12 : fill.percent <= 30 ? 2 : fill.percent <= 60 ? 4 : fill.percent <= 82 ? 6 : fill.percent <= 88 ? 8 : 10;
  const systemReducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const animate = motionEnabled && !systemReducedMotion;
  const compact = tipLifted || width < 370 || height < 720;
  const tipWidth = Math.min(compact ? 224 : 246, Math.max(200, width - 32));
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const idleY = useSharedValue(0);
  const depth = useSharedValue(1);
  const particle = useSharedValue(0);
  const bubble = useSharedValue(0);
  const mouthBlend = useSharedValue(0);
  const taps = useRef(0);
  const faceCursor = useRef(-1);
  const lastJokeIndex = useRef(-1);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [angry, setAngry] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [reactionFrame, setReactionFrame] = useState<number | null>(null);
  const [effectKind, setEffectKind] = useState<TutorialAddition['kind']>('liquid');
  const [tipRendered, setTipRendered] = useState(Boolean(tipEnabled && tip && !tipDismissed));
  const [detailOpen, setDetailOpen] = useState(false);
  const [dadJoke, setDadJoke] = useState<string | null>(null);
  const restingFrame = angry ? 15 : celebrate ? 14 : reactionFrame ?? framePair;

  useEffect(() => {
    void preloadCreamyFrames([...TUTORIAL_CREAMY_FRAMES, TUTORIAL_CREAMY_BLINK]).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (blinkTimer.current) clearInterval(blinkTimer.current);
    if (blinkResetTimer.current) clearTimeout(blinkResetTimer.current);
    setBlinking(false);
    if (!animate || framePair !== 10 || angry || celebrate) return;
    blinkTimer.current = setInterval(() => {
      setBlinking(true);
      blinkResetTimer.current = setTimeout(() => setBlinking(false), 150);
    }, 4200);
    return () => {
      if (blinkTimer.current) clearInterval(blinkTimer.current);
      if (blinkResetTimer.current) clearTimeout(blinkResetTimer.current);
    };
  }, [angry, animate, celebrate, framePair]);

  const stopTalking = useCallback(() => {
    if (talkingStopTimer.current) clearTimeout(talkingStopTimer.current);
    talkingStopTimer.current = null;
    cancelAnimation(mouthBlend);
    mouthBlend.value = withTiming(0, { duration: animate ? 90 : 0 });
  }, [animate, mouthBlend]);

  const startTalking = useCallback(() => {
    stopTalking();
    if (!animate) return;
    mouthBlend.value = 0;
    mouthBlend.value = withRepeat(
      withSequence(withTiming(1, { duration: 130 }), withTiming(0, { duration: 130 })),
      5,
      false,
    );
    talkingStopTimer.current = setTimeout(stopTalking, 1320);
  }, [animate, mouthBlend, stopTalking]);

  const openTip = useCallback(() => {
    if (!tipEnabled || !tip) return;
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setTipRendered(true);
    bubble.value = animate ? 0 : 1;
    bubble.value = withTiming(1, { duration: animate ? 210 : 0 });
    startTalking();
  }, [animate, bubble, startTalking, tip, tipEnabled]);

  const closeTip = useCallback((remember: boolean) => {
    stopTalking();
    setDetailOpen(false);
    bubble.value = withTiming(0, { duration: animate ? 170 : 0 });
    if (remember && tip) onDismissTip?.(tip.id);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setTipRendered(false), animate ? 180 : 0);
  }, [animate, bubble, onDismissTip, stopTalking, tip]);

  useEffect(() => {
    if (tipEnabled && tip && !tipDismissed) openTip();
    else closeTip(false);
  }, [closeTip, openTip, tip, tipDismissed, tipEnabled]);

  useEffect(() => {
    cancelAnimation(idleY);
    cancelAnimation(rotation);
    cancelAnimation(depth);
    if (!animate || angry) {
      idleY.value = withTiming(0, { duration: 0 });
      rotation.value = withTiming(0, { duration: 0 });
      depth.value = withTiming(1, { duration: 0 });
      return;
    }
    idleY.value = withRepeat(withSequence(withTiming(-2, { duration: 1300 }), withTiming(0, { duration: 1300 }), withTiming(0, { duration: 2200 })), -1, false);
    rotation.value = withRepeat(withSequence(withTiming(-1.4, { duration: 1500 }), withTiming(1.4, { duration: 1500 }), withTiming(0, { duration: 900 })), -1, false);
    depth.value = withRepeat(withSequence(withTiming(0.985, { duration: 1500 }), withTiming(1.015, { duration: 1500 }), withTiming(1, { duration: 900 })), -1, false);
    return () => {
      cancelAnimation(idleY);
      cancelAnimation(rotation);
      cancelAnimation(depth);
    };
  }, [angry, animate, depth, idleY, rotation]);

  useEffect(() => {
    if (!addition.nonce) return;
    setEffectKind(addition.kind);
    if (!animate) return;
    particle.value = 0;
    particle.value = withTiming(1, { duration: 760 });
    scale.value = withSequence(withSpring(1.12, { damping: 7 }), withSpring(1, { damping: 9 }));
  }, [addition.kind, addition.nonce, animate, particle, scale]);

  useEffect(() => {
    if (!celebrate || !animate) return;
    rotation.value = withSequence(withTiming(-5, { duration: 150 }), withTiming(5, { duration: 180 }), withSpring(0));
    scale.value = withSequence(withSpring(1.16), withSpring(1));
  }, [animate, celebrate, rotation, scale]);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (reactionResetTimer.current) clearTimeout(reactionResetTimer.current);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    if (blinkTimer.current) clearInterval(blinkTimer.current);
    if (blinkResetTimer.current) clearTimeout(blinkResetTimer.current);
    stopTalking();
  }, [stopTalking]);

  const react = () => {
    if (angry) return;
    if (animate) scale.value = withSequence(withTiming(1.12, { duration: 160 }), withTiming(1, { duration: 300 }));
    if (tipEnabled && tip) openTip();
    taps.current += 1;
    if (taps.current < 20) {
      faceCursor.current = (faceCursor.current + 1) % TUTORIAL_REACTION_FRAMES.length;
      setReactionFrame(TUTORIAL_REACTION_FRAMES[faceCursor.current]);
      if (reactionResetTimer.current) clearTimeout(reactionResetTimer.current);
      reactionResetTimer.current = setTimeout(() => setReactionFrame(null), animate ? 760 : 420);
      return;
    }
    taps.current = 0;
    setReactionFrame(null);
    closeTip(false);
    setDadJoke(null);
    stopTalking();
    setAngry(true);
    if (animate) {
      rotation.value = withSequence(withTiming(-9, { duration: 75 }), withTiming(9, { duration: 75 }), withTiming(-7, { duration: 75 }), withTiming(7, { duration: 75 }), withTiming(0, { duration: 70 }));
      scale.value = withSequence(withSpring(1.18), withTiming(1.55, { duration: 180 }), withTiming(0.08, { duration: 150 }), withSpring(1));
    }
    resetTimer.current = setTimeout(() => {
      setAngry(false);
      let nextIndex = Math.floor(Math.random() * CREAMY_DAD_JOKES.length);
      if (nextIndex === lastJokeIndex.current) nextIndex = (nextIndex + 1) % CREAMY_DAD_JOKES.length;
      lastJokeIndex.current = nextIndex;
      setDadJoke(CREAMY_DAD_JOKES[nextIndex]);
      startTalking();
    }, animate ? 950 : 700);
  };

  const reactionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: idleY.value },
      { scaleX: depth.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  const effectStyle = useAnimatedStyle(() => ({
    opacity: interpolate(particle.value, [0, 0.12, 0.76, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(particle.value, [0, 1], [-30, 34]) },
      { rotate: `${interpolate(particle.value, [0, 1], [-18, 28])}deg` },
      { scale: interpolate(particle.value, [0, 0.35, 1], [0.75, 1.1, 0.82]) },
    ],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubble.value,
    transform: [{ translateY: interpolate(bubble.value, [0, 1], [8, 0]) }, { scale: interpolate(bubble.value, [0, 1], [0.96, 1]) }],
  }));
  const talkingStyle = useAnimatedStyle(() => ({ opacity: mouthBlend.value }));
  const mascotHint = tipEnabled && tip ? 'Replays the current tip and tries a different face when tapped' : 'Creamy tries a different face when tapped';
  const tipAccessibilityLabel = tip
    ? `${provenanceLabels[tip.provenance ?? 'creamytuner']}. ${tip.text}${detailOpen ? ` ${tip.detail}` : ''}`
    : undefined;

  return (
    <View style={[styles.slot, compact && styles.slotCompact, wide && styles.slotWide]}>
      {dadJoke ? (
        <View testID="creamy-dad-joke" style={[styles.tip, compact && styles.tipCompact, { width: tipWidth }]} accessibilityRole="summary" accessibilityLiveRegion="polite">
          <View style={styles.tipTop}>
            <View style={styles.tipCopy}>
              <Text style={styles.tipSource}>{"CREAMY'S DAD JOKE"}</Text>
              <Text style={styles.tipText}>{dadJoke}</Text>
            </View>
            <Pressable onPress={() => { stopTalking(); setDadJoke(null); }} style={styles.tipClose} accessibilityRole="button" accessibilityLabel="Dismiss Creamy's dad joke">
              <Text style={styles.tipCloseText}>{'\u00D7'}</Text>
            </Pressable>
          </View>
          <View style={styles.tailBorder} />
          <View style={styles.tail} />
        </View>
      ) : tipRendered && tip ? (
        <Animated.View testID="creamy-tip" style={[styles.tip, compact && styles.tipCompact, { width: tipWidth }, bubbleStyle]} onAccessibilityEscape={() => closeTip(false)}>
          <View style={styles.tipTop}>
            <View style={styles.tipCopy} accessible accessibilityRole="summary" accessibilityLabel={tipAccessibilityLabel} accessibilityLiveRegion="polite">
              <Text style={styles.tipSource}>{provenanceLabels[tip.provenance ?? 'creamytuner']}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
              {detailOpen ? <Text style={styles.tipDetail}>{tip.detail}</Text> : null}
            </View>
            <Pressable onPress={() => closeTip(true)} style={styles.tipClose} accessibilityRole="button" accessibilityLabel="Dismiss Creamy tip">
              <Text style={styles.tipCloseText}>{'\u00D7'}</Text>
            </Pressable>
          </View>
          {!detailOpen ? (
            <Pressable onPress={() => setDetailOpen(true)} style={styles.whyButton} accessibilityRole="button" accessibilityLabel="Why is Creamy suggesting this?">
              <Text style={styles.whyText}>Why?</Text>
            </Pressable>
          ) : null}
          <View style={styles.tailBorder} />
          <View style={styles.tail} />
        </Animated.View>
      ) : null}
      <Pressable
        onPress={react}
        accessibilityRole="button"
        accessibilityLabel="Creamy mascot"
        accessibilityHint={mascotHint}
        accessibilityValue={{ text: fillLabel }}
        style={[styles.tapTarget, compact && styles.tapTargetCompact]}
      >
        <Animated.View testID="creamy-mascot-stage" style={[styles.mascotStage, compact && styles.mascotStageCompact, reactionStyle]}>
          <Image
            testID="creamy-mascot-resting-frame"
            source={blinking && restingFrame === 10 ? TUTORIAL_CREAMY_BLINK : TUTORIAL_CREAMY_FRAMES[restingFrame]}
            placeholder={TUTORIAL_CREAMY_FRAMES[framePair]}
            placeholderContentFit="contain"
            contentFit="contain"
            contentPosition="center"
            transition={animate ? 100 : 0}
            cachePolicy="memory-disk"
            accessible={false}
            style={styles.mascotImage}
          />
          <View pointerEvents="none" style={[styles.talkingFrame, (angry || celebrate || reactionFrame !== null) && styles.hidden]}>
            <Animated.View style={[styles.talkingFrame, talkingStyle]}>
              <Image
                testID="creamy-mascot-talking-frame"
                source={TUTORIAL_CREAMY_FRAMES[framePair + 1]}
                placeholder={TUTORIAL_CREAMY_FRAMES[framePair + 1]}
                placeholderContentFit="contain"
                contentFit="contain"
                contentPosition="center"
                transition={0}
                cachePolicy="memory-disk"
                accessible={false}
                style={styles.mascotImage}
              />
            </Animated.View>
          </View>
          {addition.nonce ? <Animated.View testID="creamy-ingredient-effect" pointerEvents="none" style={[styles.effect, effectStyles[effectKind], effectStyle]} /> : null}
          {celebrate ? <><View style={[styles.spark, styles.celebrateOne]} /><View style={[styles.spark, styles.celebrateTwo]} /><View style={[styles.spark, styles.celebrateThree]} /></> : null}
          {angry ? <><View style={[styles.spark, styles.sparkOne]} /><View style={[styles.spark, styles.sparkTwo]} /><View style={[styles.spark, styles.sparkThree]} /></> : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const effectStyles = StyleSheet.create({
  liquid: { width: 9, height: 23, borderRadius: 8, backgroundColor: '#FF8AB9', left: '50%', marginLeft: -4.5, top: 5 },
  fruit: { width: 15, height: 15, borderRadius: 8, backgroundColor: '#F54E68', left: '50%', marginLeft: -7.5, top: 7, borderWidth: 2, borderColor: '#FFB1C3' },
  spoon: { width: 10, height: 25, borderRadius: 6, backgroundColor: '#F5E7FF', left: '50%', marginLeft: -5, top: 4, borderWidth: 1, borderColor: '#B69AE8' },
  'mix-in': { width: 14, height: 14, borderRadius: 3, backgroundColor: '#6B3829', left: '50%', marginLeft: -7, top: 7, borderWidth: 2, borderColor: '#B16B55' },
});

const styles = StyleSheet.create({
  slot: { width: 86, minHeight: 104, alignItems: 'center', justifyContent: 'flex-end' },
  slotCompact: { width: 76, minHeight: 88 },
  slotWide: { width: '100%' },
  tip: { alignSelf: 'center', marginBottom: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(78,217,232,0.64)', backgroundColor: '#182541', padding: 12 },
  tipCompact: { marginBottom: 12, borderRadius: 16, padding: 10 },
  tipTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipCopy: { flex: 1 },
  tipSource: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.3, marginBottom: 2 },
  tipText: { color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  tipClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', marginTop: -4, marginRight: -4 },
  tipCloseText: { color: palette.textMuted, fontSize: 22, lineHeight: 24, fontWeight: '700' },
  tipDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  whyButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 1, paddingHorizontal: 2 },
  whyText: { color: palette.cyan, fontSize: 14, fontWeight: '900' },
  tailBorder: { position: 'absolute', left: '50%', marginLeft: -13, bottom: -13, width: 0, height: 0, borderLeftWidth: 13, borderRightWidth: 13, borderTopWidth: 13, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(78,217,232,0.64)' },
  tail: { position: 'absolute', left: '50%', marginLeft: -11, bottom: -10, width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#182541' },
  tapTarget: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  tapTargetCompact: { width: 76, height: 76, borderRadius: 38 },
  mascotStage: { width: 84, height: 84 },
  mascotStageCompact: { width: 74, height: 74 },
  mascotImage: { position: 'absolute', left: '-22.5%', top: '-22.5%', width: '145%', height: '145%' },
  talkingFrame: { ...StyleSheet.absoluteFillObject },
  hidden: { opacity: 0 },
  effect: { position: 'absolute', zIndex: 4 },
  spark: { position: 'absolute', width: 8, height: 8, backgroundColor: '#FFCE57', transform: [{ rotate: '45deg' }] },
  sparkOne: { left: 5, top: 8 },
  sparkTwo: { right: 4, top: 13 },
  sparkThree: { right: 13, bottom: 5 },
  celebrateOne: { left: 4, top: 12, backgroundColor: '#FF72B6' },
  celebrateTwo: { right: 4, top: 8, backgroundColor: '#62DDE8' },
  celebrateThree: { right: 10, bottom: 5, backgroundColor: '#FFF0A0' },
});
