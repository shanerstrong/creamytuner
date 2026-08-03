import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { pintSpinFrames, recipeImages } from '@/src/assets';
import { BrandWordmark, GradientButton, LoadingScreen, LogoMark, Screen, textStyles } from '@/src/components/ui';
import { PintHero } from '@/src/components/pint-hero';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import { tutorialDraftSchema } from '@/src/types';

export default function WelcomeScreen() {
  const { ready, settings, updateSettings } = useApp();
  const { height } = useWindowDimensions();
  const compact = height < 900;
  const veryCompact = height < 700;
  const tutorialComplete = settings.onboarded && settings.onboardingVersion >= CURRENT_ONBOARDING_VERSION;
  const hasDraft = settings.tutorialDraft.stage !== 'machine' || settings.tutorialDraft.baseItems.length > 0 || settings.tutorialDraft.selectedIngredientIds.length > 0;

  useEffect(() => {
    if (ready && tutorialComplete) router.replace('/(tabs)/home');
  }, [ready, tutorialComplete]);

  if (!ready || tutorialComplete) return <LoadingScreen />;

  const startFresh = async () => {
    const tutorialDraft = tutorialDraftSchema.parse({ version: 3, flowVersion: CURRENT_ONBOARDING_VERSION, machineId: settings.machineId });
    await updateSettings({ tutorialDraft });
    router.push('/tutorial');
  };

  return (
    <Screen scroll={false} contentStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={[styles.brand, compact && styles.brandCompact]}>
        {!veryCompact ? <LogoMark size={compact ? 58 : 74} /> : null}
        <BrandWordmark large />
        <Text style={styles.welcome}>WELCOME</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Your first pint, made simple.</Text>
        {!veryCompact ? <Text style={[styles.tagline, compact && styles.taglineCompact]}>Creamy Tuner will guide you one easy page at a time—from the base to the final texture check.</Text> : null}
      </View>
      <View style={[styles.heroWrap, compact && styles.heroWrapCompact, veryCompact && styles.heroWrapVeryCompact]}>
        <LinearGradient colors={['rgba(209,44,185,0.28)', 'rgba(39,111,190,0.04)']} style={styles.heroGlow} />
        <PintHero image={recipeImages.strawberry} frames={pintSpinFrames} label="Strawberry pint" size={veryCompact ? 105 : compact ? 205 : 300} />
      </View>
      <View style={styles.bottom}>
        <GradientButton title="Start a new pint" icon="arrow-right" onPress={() => { void startFresh(); }} />
        {hasDraft ? <GradientButton title="Resume saved pint" icon="history" variant="secondary" onPress={() => router.push('/tutorial?resume=1')} /> : null}
        <Text style={styles.disclaimer}>Recipes and nutrition are informational. Always follow your machine’s official safety instructions.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingTop: spacing.lg, paddingBottom: spacing.md },
  contentCompact: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  brand: { alignItems: 'center', gap: spacing.sm },
  brandCompact: { gap: 5 },
  welcome: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: palette.text, fontSize: 26, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  titleCompact: { fontSize: 23, lineHeight: 28 },
  tagline: { ...textStyles.body, textAlign: 'center', color: palette.textMuted, fontWeight: '600', maxWidth: 390 },
  taglineCompact: { fontSize: 14, lineHeight: 19 },
  heroWrap: { height: '45%', minHeight: 300, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginVertical: spacing.md },
  heroWrapCompact: { height: '28%', minHeight: 190, marginVertical: spacing.xs },
  heroWrapVeryCompact: { height: 110, minHeight: 110 },
  heroGlow: { ...StyleSheet.absoluteFillObject },
  bottom: { gap: spacing.md },
  disclaimer: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint },
});
