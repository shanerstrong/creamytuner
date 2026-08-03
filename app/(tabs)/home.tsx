import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard, BrandWordmark, GradientButton, Icon, IconButton, RecipeCard, Screen, SectionTitle, textStyles } from '@/src/components/ui';
import { PintHero } from '@/src/components/pint-hero';
import { FreezeTimerCard } from '@/src/components/freeze-timer-card';
import { pintSpinFrames, recipeImages } from '@/src/assets';
import { machineById } from '@/src/data/machines';
import { useApp } from '@/src/providers/app-provider';
import { palette, radii, spacing } from '@/src/theme';

export default function HomeScreen() {
  const { recipes, settings, toggleFavorite } = useApp();
  const machine = machineById(settings.machineId);
  const recent = recipes.slice(0, 2);
  return (
    <Screen>
      <View style={styles.topbar}>
        <BrandWordmark />
        <IconButton icon="cog-outline" label="Open settings" onPress={() => router.push('/settings')} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroRow}><PintHero image={recipeImages.strawberry} frames={pintSpinFrames} label="Strawberry pint" size={142} /><View style={styles.heroCopyWrap}><Text style={styles.eyebrow}>YOUR EASIEST PINT YET</Text><Text style={styles.heroTitle}>{settings.firstPintCompleted ? 'Build your next pint' : 'Build your first pint'}</Text><Text style={styles.heroCopy}>Choose what sounds good. Creamy Tuner builds the recipe and guides every step.</Text></View></View>
        <GradientButton title="Build my pint" icon="arrow-right" onPress={() => router.push('/builder')} />
        {settings.guidedBuilderDraft ? <GlassCard style={styles.resumeCard} onPress={() => router.push('/builder?resume=1')} accessibilityLabel={`Resume ${draftSummary(settings.guidedBuilderDraft)}`}><Icon name="history" color={palette.cyan} /><View style={styles.resumeCopy}><Text style={styles.resumeTitle}>Continue where you left off</Text><Text style={styles.resumeDetail}>{draftSummary(settings.guidedBuilderDraft)}</Text></View></GlassCard> : null}
      </View>

      {settings.activeFreezeTimer ? <><SectionTitle title="Your freezing pint" /><FreezeTimerCard timer={settings.activeFreezeTimer} onPress={() => router.push(`/freeze-timer?recipeId=${settings.activeFreezeTimer?.recipeId}`)} /></> : null}

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

function draftSummary(draft: NonNullable<ReturnType<typeof useApp>['settings']['guidedBuilderDraft']>) {
  const flavor = draft.answers.flavor === 'surprise-me' ? 'surprise' : draft.answers.flavor;
  const stage = draft.stage === 'question-texture' ? 'Question 1 of 3' : draft.stage === 'question-flavor' ? 'Question 2 of 3' : draft.stage === 'question-goal' ? 'Question 3 of 3' : draft.stage === 'recommendation' ? 'Recommendation ready' : draft.stage === 'customize' ? 'Customizing ingredients' : 'Ready to review';
  return `${flavor} ${draft.answers.goal.replaceAll('-', ' ')} pint · ${stage}`;
}

function ToolRow({ icon, title, detail, onPress }: { icon: 'tune-vertical' | 'snowflake-alert' | 'bookshelf' | 'record-circle-outline'; title: string; detail: string; onPress: () => void }) {
  return <GlassCard onPress={onPress} accessibilityLabel={title} style={styles.toolRow}><View style={styles.toolIcon}><Icon name={icon} size={24} color={palette.lavender} /></View><View style={styles.toolCopy}><Text style={styles.toolTitle}>{title}</Text><Text style={styles.toolDetail}>{detail}</Text></View></GlassCard>;
}

const styles = StyleSheet.create({
  topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  machineBanner: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.md },
  machineLabel: { color: palette.lavender, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  machineName: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 3 },
  change: { color: palette.pink, fontSize: 15, fontWeight: '800' },
  heroCard: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: 'rgba(19,28,57,0.8)', marginBottom: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  heroCopyWrap: { flex: 1 },
  eyebrow: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7 },
  heroTitle: { color: palette.text, fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 3 },
  heroCopy: { ...textStyles.body, fontSize: 16, lineHeight: 23, marginTop: spacing.xs },
  resumeCard: { minHeight: 68, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, borderColor: 'rgba(78,217,232,0.3)' },
  resumeCopy: { flex: 1 }, resumeTitle: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '900' }, resumeDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2, textTransform: 'capitalize' },
  tools: { gap: spacing.xs },
  toolRow: { minHeight: 72, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toolIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.14)' },
  toolCopy: { flex: 1 },
  toolTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  toolDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  recipeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
});
