import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlassCard, BrandWordmark, GradientButton, Icon, IconButton, RecipeCard, Screen, SectionTitle, textStyles } from '@/src/components/ui';
import { PintHero } from '@/src/components/pint-hero';
import { pintSpinFrames, recipeImages } from '@/src/assets';
import { machineById } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

export default function HomeScreen() {
  const { recipes, settings, toggleFavorite, updateSettings } = useApp();
  const machine = machineById(settings.machineId);
  const recent = recipes.slice(0, 2);
  return (
    <Screen>
      <View style={styles.topbar}>
        <BrandWordmark />
        <IconButton icon="cog-outline" label="Open settings" onPress={() => router.push('/settings')} />
      </View>

      <View style={styles.heroCard}>
        <PintHero image={recipeImages.strawberry} frames={pintSpinFrames} label="Strawberry pint" size={250} />
        <Text style={styles.eyebrow}>{settings.firstPintCompleted ? 'BUILD YOUR NEXT PINT' : 'YOUR FIRST PINT, STEP BY STEP'}</Text>
        <Text style={styles.heroTitle}>{settings.firstPintCompleted ? 'Ready to make another?' : 'Let’s build one together'}</Text>
        <Text style={styles.heroCopy}>{settings.tutorialMode ? 'CreamyTuner will explain one decision at a time, from texture goal to final fill check.' : 'Quick mode keeps the explanations short and takes you directly through the core choices.'}</Text>
        {settings.guidedBuilderDraft ? <GradientButton title="Continue my pint" icon="arrow-right" onPress={() => router.push('/builder?resume=1')} /> : <GradientButton title={settings.tutorialMode ? 'Start guided tutorial' : 'Build my pint'} icon="arrow-right" onPress={() => router.push(settings.tutorialMode ? '/builder?mode=guided' : '/builder?mode=quick')} />}
        <Pressable onPress={() => { const tutorialMode = !settings.tutorialMode; void updateSettings({ tutorialMode }); }} style={styles.modeChoice} accessibilityRole="switch" accessibilityState={{ checked: settings.tutorialMode }} accessibilityLabel="Guided tutorial mode"><Icon name={settings.tutorialMode ? 'school' : 'lightning-bolt'} size={20} color={settings.tutorialMode ? palette.cyan : palette.warning} /><View style={styles.modeChoiceCopy}><Text style={styles.modeChoiceTitle}>{settings.tutorialMode ? 'Guided tutorial is on' : 'Quick mode is on'}</Text><Text style={styles.modeChoiceDetail}>Tap to switch to {settings.tutorialMode ? 'the faster builder' : 'page-by-page teaching'}.</Text></View><Icon name="swap-horizontal" color={palette.textMuted} /></Pressable>
      </View>

      <Text style={styles.pathTitle}>How your pint comes together</Text>
      <Text style={styles.pathIntro}>Move from left to right. The detailed controls appear after you’ve chosen a sensible starting base.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pathRow}>
        <PathCard number="1" icon="target" title="Choose a goal" detail="Pick the texture and flavor." />
        <PathArrow />
        <PathCard number="2" icon="cup-water" title="Build the base" detail="Use what you have." />
        <PathArrow />
        <PathCard number="3" icon="tune-variant" title="Fine-tune" detail="Adjust familiar amounts." />
        <PathArrow />
        <PathCard number="4" icon="check-decagram-outline" title="Review" detail="Check fill and program." />
      </ScrollView>

      <GlassCard style={styles.machineBanner} onPress={() => router.push('/machines')} accessibilityLabel="Change selected machine">
        <View><Text style={styles.machineLabel}>YOUR MACHINE</Text><Text style={styles.machineName}>{machine.name}</Text></View>
        <Text style={styles.change}>Change</Text>
      </GlassCard>

      <SectionTitle title="More tools" />
      <View style={styles.tools}>
        <ToolRow icon="tune-vertical" title="Which program?" detail="Find a compatible machine setting" onPress={() => router.push('/program')} />
        <ToolRow icon="snowflake-alert" title="Fix my pint" detail="Troubleshoot texture issues" onPress={() => router.push('/troubleshoot')} />
        <ToolRow icon="bookshelf" title="Ingredient library" detail="Explore ingredients and substitutions" onPress={() => router.push('/(tabs)/library')} />
        <ToolRow icon="record-circle-outline" title="Live spin" detail="Follow the spin and evaluate each step" onPress={() => router.push('/(tabs)/spin')} />
      </View>

      <SectionTitle title="Recent recipes" action="View all" onAction={() => router.push('/(tabs)/recipes')} />
      <View style={styles.recipeRow}>
        {recent.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onPress={() => router.push(`/recipe/${recipe.id}`)} onFavorite={() => toggleFavorite(recipe.id)} />)}
      </View>
    </Screen>
  );
}

function PathCard({ number, icon, title, detail }: { number: string; icon: 'target' | 'cup-water' | 'tune-variant' | 'check-decagram-outline'; title: string; detail: string }) {
  return <View style={styles.pathCard}><View style={styles.pathCardTop}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><Icon name={icon} size={25} color={palette.lavender} /></View><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepDetail}>{detail}</Text></View>;
}

function PathArrow() { return <View style={styles.pathArrow}><Icon name="arrow-right" size={20} color={palette.pink} /></View>; }

function ToolRow({ icon, title, detail, onPress }: { icon: 'tune-vertical' | 'snowflake-alert' | 'bookshelf' | 'record-circle-outline'; title: string; detail: string; onPress: () => void }) {
  return <GlassCard onPress={onPress} accessibilityLabel={title} style={styles.toolRow}><View style={styles.toolIcon}><Icon name={icon} size={24} color={palette.lavender} /></View><View style={styles.toolCopy}><Text style={styles.toolTitle}>{title}</Text><Text style={styles.toolDetail}>{detail}</Text></View><Icon name="chevron-right" size={22} color={palette.textMuted} /></GlassCard>;
}

const styles = StyleSheet.create({
  topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  machineBanner: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.md },
  machineLabel: { color: palette.lavender, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  machineName: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 3 },
  change: { color: palette.pink, fontSize: 15, fontWeight: '800' },
  heroCard: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: 'rgba(19,28,57,0.8)', alignItems: 'stretch', marginBottom: spacing.md },
  eyebrow: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center', letterSpacing: 0.8, marginTop: spacing.sm },
  heroTitle: { color: palette.text, fontSize: 26, lineHeight: 32, fontWeight: '900', textAlign: 'center', marginTop: spacing.xs },
  heroCopy: { ...textStyles.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  modeChoice: { minHeight: 64, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginTop: spacing.sm },
  modeChoiceCopy: { flex: 1 },
  modeChoiceTitle: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  modeChoiceDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  pathTitle: { color: palette.text, fontSize: 21, lineHeight: 27, fontWeight: '900', marginTop: spacing.sm },
  pathIntro: { ...textStyles.body, marginTop: 3, marginBottom: spacing.sm },
  pathRow: { alignItems: 'center', paddingBottom: spacing.xs },
  pathCard: { width: 164, minHeight: 132, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft },
  pathCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  pathArrow: { width: 38, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(241,78,155,0.16)', borderWidth: 1, borderColor: 'rgba(241,78,155,0.35)', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: palette.pink, fontSize: 16, fontWeight: '900' },
  stepTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  stepDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  tools: { gap: spacing.xs },
  toolRow: { minHeight: 72, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.14)' },
  toolCopy: { flex: 1 },
  toolTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  toolDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  recipeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
});
