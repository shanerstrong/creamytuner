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
        <Text style={[styles.title, compact && styles.titleCompact]}>Your perfect pint{`\n`}starts with <Text style={styles.titleAccent}>you.</Text></Text>
      </View>
      <View style={[styles.heroWrap, compact && styles.heroWrapCompact, veryCompact && styles.heroWrapVeryCompact]}>
        <LinearGradient colors={['rgba(210,45,185,0.30)', 'rgba(77,74,190,0.11)', 'rgba(9,13,32,0.02)']} style={styles.heroGlow} />
        <View style={[styles.particle, styles.particleOne]} /><View style={[styles.particle, styles.particleTwo]} /><View style={[styles.particle, styles.particleThree]} /><View style={[styles.particle, styles.particleFour]} />
        <View style={[styles.ingredientBubble, styles.ingredientMilk]}><Icon name="cup-water" color={palette.cyan} size={veryCompact ? 20 : 26} /></View>
        <View style={[styles.ingredientBubble, styles.ingredientFruit]}><Icon name="fruit-cherries" color={palette.pink} size={veryCompact ? 21 : 28} /></View>
        <View style={[styles.ingredientBubble, styles.ingredientChocolate]}><Icon name="food-variant" color={palette.warning} size={veryCompact ? 20 : 26} /></View>
        <View style={[styles.ingredientBubble, styles.ingredientScoop]}><Icon name="spoon-sugar" color={palette.lavender} size={veryCompact ? 20 : 26} /></View>
        <View style={[styles.mascotStage, veryCompact && styles.mascotStageVeryCompact]}>
          <View style={[styles.arm, styles.armLeft, veryCompact && styles.armVeryCompact]}><View style={[styles.hand, veryCompact && styles.handVeryCompact]}><Icon name="thumb-up" color={palette.white} size={veryCompact ? 15 : 22} /></View></View>
          <View style={[styles.arm, styles.armRight, veryCompact && styles.armVeryCompact]}><View style={[styles.hand, styles.handRight, veryCompact && styles.handVeryCompact]}><Icon name="thumb-up" color={palette.white} size={veryCompact ? 15 : 22} /></View></View>
          <View style={[styles.mascotCrop, veryCompact && styles.mascotCropVeryCompact]} accessibilityLabel="Creamy smiling in an empty clear pint">
          <Image source={require('@/assets/images/mascot/creamy-fill-progress.png')} contentFit="fill" style={[styles.mascotAtlas, veryCompact && styles.mascotAtlasVeryCompact]} />
          <View style={[styles.welcomeFace, veryCompact && styles.welcomeFaceVeryCompact]} pointerEvents="none">
            <View style={[styles.welcomeEyes, veryCompact && styles.welcomeEyesVeryCompact]}><View style={[styles.welcomeEye, veryCompact && styles.welcomeEyeVeryCompact]} /><View style={[styles.welcomeEye, veryCompact && styles.welcomeEyeVeryCompact]} /></View>
            <View style={[styles.welcomeSmile, veryCompact && styles.welcomeSmileVeryCompact]} />
          </View>
          </View>
        </View>
        <View style={[styles.heroPrompt, veryCompact && styles.heroPromptVeryCompact]}><Icon name="creation" color={palette.pink} size={16} /><Text style={styles.heroPromptText}>Creamy guides every step</Text></View>
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
    <View style={[styles.logoMark, compact && styles.logoMarkCompact]}><View style={styles.logoSwirl}><View style={styles.logoSwirlTop} /><View style={styles.logoSwirlMiddle} /><View style={styles.logoSwirlBottom} /></View><View style={styles.logoPint}><View style={styles.logoPintLine} /></View></View>
    <View><View style={styles.wordmarkRow}><Text style={[styles.wordCreamy, compact && styles.wordCompact]}>Creamy</Text><Text style={[styles.wordTuner, compact && styles.wordCompact]}>Tuner</Text></View><Text style={styles.wordTag}>BUILD · FREEZE · SPIN</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'flex-start', paddingTop: spacing.md, paddingBottom: spacing.md },
  contentCompact: { paddingTop: spacing.xs, paddingBottom: spacing.xs },
  brand: { alignItems: 'center', gap: spacing.md },
  brandCompact: { gap: 6 },
  wordmarkWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: { width: 52, height: 56, alignItems: 'center', justifyContent: 'flex-end' },
  logoMarkCompact: { width: 42, height: 45, transform: [{ scale: 0.82 }] },
  logoPint: { width: 34, height: 29, borderWidth: 2, borderColor: palette.white, borderTopWidth: 3, borderRadius: 7, backgroundColor: 'rgba(78,217,232,0.10)', alignItems: 'center' },
  logoPintLine: { width: 25, height: 3, borderRadius: 2, backgroundColor: palette.cyan, marginTop: 6 },
  logoSwirl: { position: 'absolute', top: 0, width: 34, height: 31, alignItems: 'center', justifyContent: 'flex-end' },
  logoSwirlTop: { width: 8, height: 7, borderRadius: 6, backgroundColor: palette.pink, transform: [{ rotate: '-18deg' }] },
  logoSwirlMiddle: { width: 20, height: 8, borderRadius: 10, backgroundColor: palette.lavender, marginTop: -1, transform: [{ rotate: '8deg' }] },
  logoSwirlBottom: { width: 31, height: 9, borderRadius: 11, backgroundColor: palette.pink, marginTop: -1, transform: [{ rotate: '-5deg' }] },
  wordmarkRow: { flexDirection: 'row', alignItems: 'baseline' },
  wordCreamy: { color: palette.white, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2 },
  wordTuner: { color: palette.pink, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2 },
  wordCompact: { fontSize: 28, lineHeight: 32 },
  wordTag: { color: palette.cyan, fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 2.1, marginLeft: 2 },
  title: { color: palette.text, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  titleCompact: { fontSize: 24, lineHeight: 28 },
  titleAccent: { color: palette.pink },
  tagline: { ...textStyles.body, textAlign: 'center', color: palette.textMuted, fontWeight: '600', maxWidth: 390 },
  taglineCompact: { fontSize: 14, lineHeight: 19 },
  heroWrap: { height: '48%', minHeight: 330, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(241,78,155,0.26)', marginVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  heroWrapCompact: { height: '39%', minHeight: 260, marginVertical: spacing.xs },
  heroWrapVeryCompact: { height: 225, minHeight: 225 },
  heroGlow: { ...StyleSheet.absoluteFillObject },
  mascotStage: { width: 270, height: 235, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 9 }] },
  mascotStageVeryCompact: { width: 190, height: 165, transform: [{ translateY: 4 }] },
  mascotCrop: { width: 236, height: 208, overflow: 'hidden', zIndex: 2 },
  mascotCropVeryCompact: { width: 166, height: 146 },
  mascotAtlas: { width: 944, height: 518, transform: [{ translateY: -50 }] },
  mascotAtlasVeryCompact: { width: 664, height: 365, transform: [{ translateY: -35 }] },
  welcomeFace: { position: 'absolute', left: 68, top: 88, width: 100, height: 70, borderRadius: 34, backgroundColor: 'rgba(42,25,78,0.94)', alignItems: 'center', justifyContent: 'center' },
  welcomeFaceVeryCompact: { left: 48, top: 62, width: 70, height: 49, borderRadius: 24 },
  welcomeEyes: { flexDirection: 'row', gap: 22, transform: [{ translateY: -5 }] },
  welcomeEyesVeryCompact: { gap: 15, transform: [{ translateY: -3 }] },
  welcomeEye: { width: 8, height: 11, borderRadius: 5, backgroundColor: palette.white },
  welcomeEyeVeryCompact: { width: 6, height: 8, borderRadius: 4 },
  welcomeSmile: { width: 30, height: 14, borderBottomWidth: 4, borderBottomColor: palette.pink, borderRadius: 16, transform: [{ translateY: -1 }] },
  welcomeSmileVeryCompact: { width: 21, height: 10, borderBottomWidth: 3, borderRadius: 10 },
  arm: { position: 'absolute', top: 105, width: 66, height: 14, borderRadius: 8, backgroundColor: 'rgba(174,134,255,0.82)', zIndex: 3 },
  armVeryCompact: { top: 75, width: 46, height: 10 },
  armLeft: { left: 3, transform: [{ rotate: '-27deg' }] },
  armRight: { right: 3, transform: [{ rotate: '27deg' }] },
  hand: { position: 'absolute', left: -8, top: -12, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  handRight: { left: undefined, right: -8 },
  handVeryCompact: { left: -6, top: -9, width: 28, height: 28, borderRadius: 14 },
  ingredientBubble: { position: 'absolute', zIndex: 4, width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(23,31,70,0.90)' },
  ingredientMilk: { left: '8%', top: '13%', transform: [{ rotate: '-12deg' }] },
  ingredientFruit: { right: '8%', top: '11%', transform: [{ rotate: '10deg' }] },
  ingredientChocolate: { right: '5%', top: '47%', transform: [{ rotate: '-8deg' }] },
  ingredientScoop: { left: '6%', top: '51%', transform: [{ rotate: '8deg' }] },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.pink, opacity: 0.75 },
  particleOne: { left: '27%', top: '18%' }, particleTwo: { right: '29%', top: '28%', backgroundColor: palette.cyan }, particleThree: { left: '24%', bottom: '27%', backgroundColor: palette.lavender }, particleFour: { right: '23%', bottom: '35%' },
  heroPrompt: { position: 'absolute', bottom: spacing.sm, minHeight: 36, paddingHorizontal: spacing.sm, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(9,13,32,0.72)' },
  heroPromptVeryCompact: { bottom: 5, minHeight: 30 },
  heroPromptText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  bottom: { gap: spacing.sm, marginTop: spacing.xs },
  disclaimer: { ...textStyles.caption, textAlign: 'center', color: palette.textFaint },
});
