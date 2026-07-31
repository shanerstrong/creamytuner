import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { recipeImages } from '@/src/assets';
import { BrandWordmark, GradientButton, LoadingScreen, LogoMark, Screen, textStyles } from '@/src/components/ui';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

export default function WelcomeScreen() {
  const { ready, settings } = useApp();

  useEffect(() => {
    if (ready && settings.onboarded) router.replace('/(tabs)/home');
  }, [ready, settings.onboarded]);

  if (!ready || settings.onboarded) return <LoadingScreen />;

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.brand}>
        <LogoMark size={74} />
        <BrandWordmark large />
        <Text style={styles.tagline}>Smarter frozen treats.{`\n`}Better texture. Every time.</Text>
      </View>
      <View style={styles.heroWrap}>
        <LinearGradient colors={['rgba(209,44,185,0.28)', 'rgba(39,111,190,0.04)']} style={styles.heroGlow} />
        <Image source={recipeImages.strawberry} style={styles.hero} resizeMode="cover" accessibilityLabel="Strawberry cheesecake protein ice cream" />
      </View>
      <View style={styles.bottom}>
        <GradientButton title="Let's Get Started" icon="arrow-right" onPress={() => router.push('/machines?first=1')} />
        <View style={styles.dots}><View style={styles.dotActive} /><View style={styles.dot} /><View style={styles.dot} /></View>
        <Text style={styles.disclaimer}>Recipes and nutrition are informational. Always follow your machine’s official safety instructions.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingTop: spacing.lg, paddingBottom: spacing.md },
  brand: { alignItems: 'center', gap: spacing.sm },
  tagline: { ...textStyles.body, textAlign: 'center', color: palette.text, fontWeight: '600' },
  heroWrap: { height: '45%', minHeight: 300, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginVertical: spacing.md },
  heroGlow: { ...StyleSheet.absoluteFillObject },
  hero: { width: '100%', height: '100%', borderRadius: radii.xl },
  bottom: { gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.textFaint },
  dotActive: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.pink },
  disclaimer: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint },
});
