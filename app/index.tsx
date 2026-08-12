import { router, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GradientButton, Icon, LoadingScreen, Screen, textStyles } from '@/src/components/ui';
import { WelcomeCreamy } from '@/src/components/creamy/welcome-creamy';
import { WELCOME_WORDMARK_AI } from '@/src/components/creamy/mascot-assets';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import { tutorialDraftSchema } from '@/src/types';

export default function WelcomeScreen() {
  const { ready, settings, updateSettings } = useApp();
  const pathname = usePathname();
  const { height, width } = useWindowDimensions();
  const compact = height < 900;
  const veryCompact = height < 700 || width < 390;
  const tutorialComplete = settings.onboarded && settings.onboardingVersion >= CURRENT_ONBOARDING_VERSION;
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
        <WelcomeWordmark compact={veryCompact} />
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

function WelcomeWordmark({ compact }: { compact: boolean }) {
  return <View style={styles.wordmarkWrap} accessible accessibilityRole="image" accessibilityLabel="CreamyTuner">
    <Image source={WELCOME_WORDMARK_AI} contentFit="contain" cachePolicy="memory-disk" accessible={false} style={[styles.wordmarkImage, compact && styles.wordmarkImageCompact]} />
    <Text style={styles.wordTag}>BUILD {'\u00B7'} FREEZE {'\u00B7'} SPIN</Text>
  </View>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: '#030C26' },
  contentCompact: { paddingTop: spacing.xs, paddingBottom: spacing.xs },
  brand: { alignItems: 'center', gap: spacing.md },
  brandCompact: { gap: 6 },
  wordmarkWrap: { width: '100%', maxWidth: 340, alignItems: 'center' },
  wordmarkImage: { width: '100%', maxWidth: 340, aspectRatio: 1671 / 466 },
  wordmarkImageCompact: { maxWidth: 278 },
  wordTag: { color: palette.cyan, fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 1.7, marginTop: -5 },
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
