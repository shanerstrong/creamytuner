import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CREAMYTUNER_INTRO_MELODY } from '@/src/components/brand/brand-assets';
import { GradientButton, Icon, LoadingScreen, Screen, BrandWordmark, textStyles } from '@/src/components/ui';
import { WelcomeCreamy } from '@/src/components/creamy/welcome-creamy';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import { tutorialDraftSchema } from '@/src/types';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function WelcomeScreen() {
  const { ready, settings, updateSettings } = useApp();
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const pathname = usePathname();
  const { height, width } = useWindowDimensions();
  const compact = height < 900;
  const veryCompact = height < 700 || width < 390;
  const tutorialComplete = intro !== '1' && settings.onboarded && settings.onboardingVersion >= CURRENT_ONBOARDING_VERSION;
  const hasDraft = settings.tutorialDraft.stage !== 'machine' || settings.tutorialDraft.baseItems.length > 0 || settings.tutorialDraft.selectedIngredientIds.length > 0;

  useEffect(() => {
    if (ready && tutorialComplete && pathname === '/') router.replace('/(tabs)/home');
  }, [pathname, ready, tutorialComplete]);

  if (!ready || tutorialComplete) return <LoadingScreen />;

  const startFresh = async () => {
    const tutorialDraft = tutorialDraftSchema.parse({ version: 5, flowVersion: CURRENT_ONBOARDING_VERSION, machineId: settings.machineId, dietaryPreferences: settings.dietaryPreferences, foodAllergies: settings.foodAllergies, customAvoidFoods: settings.customAvoidFoods });
    await updateSettings({ tutorialDraft });
    router.push('/tutorial');
  };

  return (
    <Screen contentStyle={[styles.content, compact && styles.contentCompact]}>
      <Animated.View entering={settings.creamyMotionEnabled ? FadeInDown.duration(520).delay(60) : undefined} style={[styles.brand, compact && styles.brandCompact]}>
        <IntroWordmark compact={veryCompact} motionEnabled={settings.creamyMotionEnabled} />
        <Text style={[styles.title, compact && styles.titleCompact]}>Your perfect pint{`\n`}starts with <Text style={styles.titleAccent}>you.</Text></Text>
      </Animated.View>
      <Animated.View entering={settings.creamyMotionEnabled ? FadeInDown.duration(560).delay(180) : undefined} style={[styles.heroWrap, compact && styles.heroWrapCompact, veryCompact && styles.heroWrapVeryCompact]}>
        <View style={styles.heroMedia}>
          <WelcomeCreamy compact={compact} motionEnabled={settings.creamyMotionEnabled} />
        </View>
        <View style={styles.heroPrompt}><Icon name="creation" color={palette.pink} size={16} /><Text style={styles.heroPromptText}>Creamy guides every step</Text></View>
      </Animated.View>
      <Animated.View entering={settings.creamyMotionEnabled ? FadeInDown.duration(500).delay(320) : undefined} style={styles.bottom}>
        <GradientButton title="Build my pint" icon="arrow-right" onPress={() => { void startFresh(); }} />
        {hasDraft ? <GradientButton title="Resume saved pint" icon="history" variant="secondary" onPress={() => router.push('/tutorial?resume=1')} /> : null}
        <Text style={styles.disclaimer}>Recipes and nutrition are informational. Always follow your machine{`\u2019`}s official safety instructions.</Text>
      </Animated.View>
    </Screen>
  );
}

function IntroWordmark({ compact, motionEnabled }: { compact: boolean; motionEnabled: boolean }) {
  const systemReducedMotion = useReducedMotion();
  const animate = motionEnabled && !systemReducedMotion;
  const reveal = useSharedValue(animate ? 0 : 1);
  const shimmer = useSharedValue(animate ? 0 : 1);
  const sparkle = useSharedValue(animate ? 0 : 1);
  const player = useAudioPlayer(CREAMYTUNER_INTRO_MELODY, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(reveal);
      cancelAnimation(shimmer);
      cancelAnimation(sparkle);
      reveal.value = 1;
      shimmer.value = 1;
      sparkle.value = 1;
      return;
    }
    reveal.value = withSequence(
      withTiming(1.08, { duration: 440, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
    );
    shimmer.value = 0;
    shimmer.value = withDelay(180, withTiming(1, { duration: 980, easing: Easing.inOut(Easing.cubic) }));
    sparkle.value = 0;
    sparkle.value = withDelay(500, withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(0.35, { duration: 520 })), 3, true));
  }, [animate, reveal, shimmer, sparkle]);

  const replayMelody = () => {
    void player.seekTo(0).then(() => player.play()).catch(() => undefined);
  };
  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.4, 1], [0, 0.75, 1]),
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [-14, 0]) },
      { scale: interpolate(reveal.value, [0, 1], [0.76, 1]) },
    ],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.16, 0.82, 1], [0, 0.95, 0.72, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-130, 390]) },
      { rotate: '-18deg' },
    ],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: interpolate(sparkle.value, [0, 1], [0.45, 1.15]) }, { rotate: '45deg' }],
  }));

  return <View style={[styles.wordmarkWrap, compact && styles.wordmarkWrapCompact]}>
    <Animated.View style={[styles.logoMotion, logoStyle]}>
      <BrandWordmark large compact={compact} />
      {animate ? <><AnimatedLinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,244,225,0.8)', 'rgba(255,255,255,0)']} locations={[0, 0.5, 1]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={[styles.logoShimmer, shimmerStyle]} /><Animated.View pointerEvents="none" style={[styles.logoSpark, sparkleStyle]} /><Animated.View pointerEvents="none" style={[styles.logoSpark, styles.logoSparkTwo, sparkleStyle]} /></> : null}
    </Animated.View>
    <Text style={styles.wordTag}>BUILD {'\u00B7'} FREEZE {'\u00B7'} SPIN</Text>
    <Pressable onPress={replayMelody} accessibilityRole="button" accessibilityLabel={status.playing ? 'Replay CreamyTuner intro melody' : 'Play CreamyTuner intro melody'} style={({ pressed }) => [styles.soundButton, status.playing && styles.soundButtonActive, pressed && styles.soundButtonPressed]}>
      <Icon name={status.playing ? 'volume-high' : 'music-note'} size={15} color={status.playing ? palette.ink : palette.cyan} />
      <Text style={[styles.soundButtonText, status.playing && styles.soundButtonTextActive]}>{status.playing ? 'Playing intro' : Platform.OS === 'web' ? 'Play 5-sec intro' : 'Play intro'}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: '#030C26' },
  contentCompact: { paddingTop: spacing.xs, paddingBottom: spacing.xs },
  brand: { alignItems: 'center', gap: spacing.md },
  brandCompact: { gap: 6 },
  wordmarkWrap: { width: '100%', maxWidth: 340, alignItems: 'center' },
  wordmarkWrapCompact: { maxWidth: 278 },
  logoMotion: { width: '100%', alignItems: 'center', overflow: 'hidden' },
  wordTag: { color: palette.cyan, fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 1.7, marginTop: -5 },
  logoShimmer: { position: 'absolute', top: 5, bottom: 5, width: 58, borderRadius: 24 },
  logoSpark: { position: 'absolute', top: 5, right: 24, width: 10, height: 10, zIndex: 3, backgroundColor: '#FFF3B4' },
  logoSparkTwo: { top: 'auto', right: 'auto', bottom: 13, left: 31, width: 7, height: 7, backgroundColor: palette.cyan },
  soundButton: { minHeight: 34, marginTop: 4, paddingHorizontal: 12, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(78,217,232,0.5)', backgroundColor: 'rgba(9,13,32,0.7)' },
  soundButtonActive: { backgroundColor: palette.cyan },
  soundButtonPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  soundButtonText: { color: palette.cyan, fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 0.3 },
  soundButtonTextActive: { color: palette.ink },
  title: { color: palette.text, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  titleCompact: { fontSize: 24, lineHeight: 28 },
  titleAccent: { color: palette.pink },
  tagline: { ...textStyles.body, textAlign: 'center', color: palette.textMuted, fontWeight: '600', maxWidth: 390 },
  taglineCompact: { fontSize: 14, lineHeight: 19 },
  heroWrap: { minHeight: 374, marginVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  heroWrapCompact: { minHeight: 270, marginVertical: spacing.xs },
  heroWrapVeryCompact: { minHeight: 258 },
  heroMedia: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#030C26' },
  heroPrompt: { minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(9,13,32,0.72)' },
  heroPromptText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  bottom: { gap: spacing.sm, marginTop: spacing.xs },
  disclaimer: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint },
});
