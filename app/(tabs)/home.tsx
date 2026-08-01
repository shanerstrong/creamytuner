import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard, BrandWordmark, GradientButton, Icon, IconButton, RecipeCard, Screen, SectionTitle, textStyles } from '@/src/components/ui';
import { PintHero } from '@/src/components/pint-hero';
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

      <View style={styles.intro}>
        <Text style={styles.welcome}>Make your next pint feel easy.</Text>
        <Text style={styles.question}>We’ll help you choose a goal, use what you have, and land on a recipe that fits your machine.</Text>
      </View>

      <GlassCard style={styles.machineBanner} onPress={() => router.push('/machines')} accessibilityLabel="Change selected machine">
        <View><Text style={styles.machineLabel}>YOUR MACHINE</Text><Text style={styles.machineName}>{machine.name}</Text></View>
        <Text style={styles.change}>Change</Text>
      </GlassCard>

      <View style={styles.heroCard}>
        <PintHero image={recipeImages.strawberry} frames={pintSpinFrames} label="Strawberry pint" size={250} />
        <Text style={styles.heroTitle}>Start with a guided pint</Text>
        <Text style={styles.heroCopy}>Pick a style, tell us what’s in your kitchen, and we’ll explain what to add next.</Text>
        <GradientButton title="Build my pint" icon="arrow-right" onPress={() => router.push('/builder')} />
      </View>

      <GlassCard style={styles.pathCard}>
        <Text style={styles.pathTitle}>Your path</Text>
        <StepRow number="1" title="Choose a goal" detail="Ice cream, gelato, sorbet, or more" />
        <StepRow number="2" title="Mark what you have" detail="See missing and optional ingredients" />
        <StepRow number="3" title="Review the recommendation" detail="Amounts, nutrition, and machine program" />
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

function StepRow({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <View style={styles.stepRow}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepDetail}>{detail}</Text></View></View>;
}

function ToolRow({ icon, title, detail, onPress }: { icon: 'tune-vertical' | 'snowflake-alert' | 'bookshelf' | 'record-circle-outline'; title: string; detail: string; onPress: () => void }) {
  return <GlassCard onPress={onPress} accessibilityLabel={title} style={styles.toolRow}><View style={styles.toolIcon}><Icon name={icon} size={24} color={palette.lavender} /></View><View style={styles.toolCopy}><Text style={styles.toolTitle}>{title}</Text><Text style={styles.toolDetail}>{detail}</Text></View><Icon name="chevron-right" size={22} color={palette.textMuted} /></GlassCard>;
}

const styles = StyleSheet.create({
  topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  intro: { marginTop: spacing.sm, marginBottom: spacing.md },
  welcome: { ...textStyles.heading, fontSize: 26, lineHeight: 32 },
  question: { ...textStyles.body, marginTop: spacing.xs },
  machineBanner: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  machineLabel: { color: palette.lavender, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  machineName: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 3 },
  change: { color: palette.pink, fontSize: 15, fontWeight: '800' },
  heroCard: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: 'rgba(19,28,57,0.8)', alignItems: 'stretch', marginBottom: spacing.md },
  heroTitle: { color: palette.text, fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm },
  heroCopy: { ...textStyles.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  pathCard: { padding: spacing.md, marginBottom: spacing.sm },
  pathTitle: { color: palette.text, fontSize: 19, lineHeight: 25, fontWeight: '900', marginBottom: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  stepNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(241,78,155,0.16)', borderWidth: 1, borderColor: 'rgba(241,78,155,0.35)', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: palette.pink, fontSize: 16, fontWeight: '900' },
  stepCopy: { flex: 1 },
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
