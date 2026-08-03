import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { GradientButton, Icon, LoadingScreen, Screen, textStyles } from '@/src/components/ui';
import { CURRENT_ONBOARDING_VERSION } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';
import { tutorialDraftSchema } from '@/src/types';

export default function WelcomeScreen() {
  const { ready, settings, updateSettings } = useApp();
  const pathname = usePathname();
  const { height } = useWindowDimensions();
  const compact = height < 900;
  const veryCompact = height < 700;
  const tutorialComplete = settings.onboarded && settings.onboardingVersion >= CURRENT_ONBOARDING_VERSION;
  const hasDraft = settings.tutorialDraft.stage !== 'machine' || settings.tutorialDraft.baseItems.length > 0 || settings.tutorialDraft.selectedIngredientIds.length > 0;

  useEffect(() => {
    if (ready && tutorialComplete && pathname === '/') router.replace('/(tabs)/home');
  }, [pathname, ready, tutorialComplete]);

  if (!ready || tutorialComplete) return <LoadingScreen />;

  const startFresh = async () => {
    const tutorialDraft = tutorialDraftSchema.parse({ version: 3, flowVersion: CURRENT_ONBOARDING_VERSION, machineId: settings.machineId });
    await updateSettings({ tutorialDraft });
    router.push('/tutorial');
  };

  return (
    <Screen scroll={false} contentStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={[styles.brand, compact && styles.brandCompact]}>
        <WelcomeWordmark compact={veryCompact} />
        <Text style={[styles.title, compact && styles.titleCompact]}>Build a better pint.</Text>
      </View>
      <View style={[styles.heroWrap, compact && styles.heroWrapCompact, veryCompact && styles.heroWrapVeryCompact]}>
        <LinearGradient colors={['rgba(209,44,185,0.28)', 'rgba(39,111,190,0.04)']} style={styles.heroGlow} />
        <View style={[styles.ingredientBubble, styles.ingredientMilk]}><Icon name="cup-water" color={palette.cyan} size={24} /></View>
        <View style={[styles.ingredientBubble, styles.ingredientFruit]}><Icon name="fruit-cherries" color={palette.pink} size={25} /></View>
        <View style={[styles.ingredientBubble, styles.ingredientScoop]}><Icon name="spoon-sugar" color={palette.warning} size={24} /></View>
        <View style={[styles.mascotCrop, veryCompact && styles.mascotCropVeryCompact]} accessibilityLabel="Creamy waiting in an empty clear pint">
          <Image source={require('@/assets/images/mascot/creamy-fill-progress.png')} contentFit="fill" style={[styles.mascotAtlas, veryCompact && styles.mascotAtlasVeryCompact]} />
        </View>
        {!veryCompact ? <Text style={styles.heroPrompt}>Pick ingredients. Creamy guides the rest.</Text> : null}
      </View>
      <View style={styles.bottom}>
        <GradientButton title="Build my pint" icon="arrow-right" onPress={() => { void startFresh(); }} />
        {hasDraft ? <GradientButton title="Resume saved pint" icon="history" variant="secondary" onPress={() => router.push('/tutorial?resume=1')} /> : null}
        <Text style={styles.disclaimer}>Recipes and nutrition are informational. Always follow your machine’s official safety instructions.</Text>
      </View>
    </Screen>
  );
}

function WelcomeWordmark({ compact }: { compact: boolean }) {
  return <View style={styles.wordmarkWrap} accessibilityLabel="Creamy Tuner">
    <LinearGradient colors={[palette.pink, palette.lavender, palette.cyan]} style={[styles.logoSpark, compact && styles.logoSparkCompact]}><Icon name="creation" color={palette.white} size={compact ? 22 : 28} /></LinearGradient>
    <View><View style={styles.wordmarkRow}><Text style={[styles.wordCreamy, compact && styles.wordCompact]}>Creamy</Text><Text style={[styles.wordTuner, compact && styles.wordCompact]}>Tuner</Text></View><Text style={styles.wordTag}>PINT LAB</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingTop: spacing.lg, paddingBottom: spacing.md },
  contentCompact: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  brand: { alignItems: 'center', gap: spacing.sm },
  brandCompact: { gap: 5 },
  wordmarkWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoSpark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], borderWidth: 2, borderColor: 'rgba(255,255,255,0.30)' },
  logoSparkCompact: { width: 42, height: 42, borderRadius: 14 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'baseline' },
  wordCreamy: { color: palette.white, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2 },
  wordTuner: { color: palette.pink, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2 },
  wordCompact: { fontSize: 28, lineHeight: 32 },
  wordTag: { color: palette.cyan, fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 3.4, marginLeft: 2 },
  title: { color: palette.text, fontSize: 26, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  titleCompact: { fontSize: 23, lineHeight: 28 },
  tagline: { ...textStyles.body, textAlign: 'center', color: palette.textMuted, fontWeight: '600', maxWidth: 390 },
  taglineCompact: { fontSize: 14, lineHeight: 19 },
  heroWrap: { height: '45%', minHeight: 300, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: palette.border, marginVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  heroWrapCompact: { height: '28%', minHeight: 190, marginVertical: spacing.xs },
  heroWrapVeryCompact: { height: 110, minHeight: 110 },
  heroGlow: { ...StyleSheet.absoluteFillObject },
  mascotCrop: { width: 202, height: 178, overflow: 'hidden', transform: [{ translateY: 8 }] },
  mascotCropVeryCompact: { width: 101, height: 89 },
  mascotAtlas: { width: 806, height: 442, transform: [{ translateY: -43 }] },
  mascotAtlasVeryCompact: { width: 403, height: 221, transform: [{ translateY: -22 }] },
  ingredientBubble: { position: 'absolute', zIndex: 2, width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', backgroundColor: palette.panelRaised },
  ingredientMilk: { left: '13%', top: '24%', transform: [{ rotate: '-12deg' }] },
  ingredientFruit: { right: '13%', top: '18%', transform: [{ rotate: '10deg' }] },
  ingredientScoop: { right: '17%', bottom: '23%', transform: [{ rotate: '-7deg' }] },
  heroPrompt: { position: 'absolute', bottom: spacing.sm, color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  bottom: { gap: spacing.md },
  disclaimer: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint },
});
