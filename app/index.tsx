import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { pintSpinFrames, recipeImages } from '@/src/assets';
import { BrandWordmark, GradientButton, LoadingScreen, LogoMark, Screen, textStyles } from '@/src/components/ui';
import { PintHero } from '@/src/components/pint-hero';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

export default function WelcomeScreen() {
  const { ready, settings } = useApp();
  const tutorialComplete = settings.onboarded && settings.onboardingVersion >= CURRENT_ONBOARDING_VERSION;

  useEffect(() => {
    if (ready && tutorialComplete) router.replace('/(tabs)/home');
  }, [ready, tutorialComplete]);

  if (!ready || tutorialComplete) return <LoadingScreen />;

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.brand}>
        <LogoMark size={74} />
        <BrandWordmark large />
        <Text style={styles.welcome}>WELCOME</Text>
        <Text style={styles.title}>Your first pint, made simple.</Text>
        <Text style={styles.tagline}>Creamy Tuner will guide you one easy page at a time—from the base to the final texture check.</Text>
      </View>
      <View style={styles.heroWrap}>
        <LinearGradient colors={['rgba(209,44,185,0.28)', 'rgba(39,111,190,0.04)']} style={styles.heroGlow} />
        <PintHero image={recipeImages.strawberry} frames={pintSpinFrames} label="Strawberry pint" size={300} />
      </View>
      <View style={styles.bottom}>
        <GradientButton title={settings.tutorialDraft.step > 0 ? 'Continue tutorial' : "Let's make your first pint"} icon="arrow-right" onPress={() => router.push('/tutorial')} />
        <Text style={styles.disclaimer}>Recipes and nutrition are informational. Always follow your machine’s official safety instructions.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingTop: spacing.lg, paddingBottom: spacing.md },
  brand: { alignItems: 'center', gap: spacing.sm },
  welcome: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: palette.text, fontSize: 26, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  tagline: { ...textStyles.body, textAlign: 'center', color: palette.textMuted, fontWeight: '600', maxWidth: 390 },
  heroWrap: { height: '45%', minHeight: 300, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginVertical: spacing.md },
  heroGlow: { ...StyleSheet.absoluteFillObject },
  bottom: { gap: spacing.md },
  disclaimer: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint },
});
