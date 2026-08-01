import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard, Icon, Pill, textStyles, type IconName } from '@/src/components/ui';
import { palette, radii, spacing } from '@/src/theme';
import type { BuilderPreferences, RecipeStyle } from '@/src/types';

const recipeStyles: { id: RecipeStyle; label: string; detail: string }[] = [
  { id: 'ice-cream', label: 'Ice cream', detail: 'Rich and scoopable' },
  { id: 'lite-ice-cream', label: 'Lite', detail: 'Lighter, still creamy' },
  { id: 'sorbet', label: 'Sorbet', detail: 'Fruit-forward' },
  { id: 'gelato', label: 'Gelato', detail: 'Dense and silky' },
  { id: 'milkshake', label: 'Milkshake', detail: 'Drinkable and thick' },
  { id: 'smoothie-bowl', label: 'Smoothie bowl', detail: 'Spoonable and cold' },
];

const flavorOptions = ['Anything', 'Strawberry', 'Chocolate', 'Mint', 'Berry'];

export function TutorialExplainer({ title, children }: { title: string; children: string }) {
  return <View style={styles.explainer}><Icon name="lightbulb-on-outline" color={palette.cyan} /><View style={styles.explainerCopy}><Text style={styles.explainerTitle}>{title}</Text><Text style={styles.explainerText}>{children}</Text></View></View>;
}

export function TutorialIntroStep() {
  const stages: [IconName, string, string][] = [
    ['target', 'Pick a goal', 'Decide the texture and flavor you want.'],
    ['cup-water', 'Build the base', 'Choose ingredients that create body, sweetness, and stability.'],
    ['tune-variant', 'Fine-tune it', 'Use familiar kitchen measurements and check the fill level.'],
    ['snowflake', 'Freeze and spin', 'Save the recipe and follow the suggested machine program.'],
  ];
  return <View><Text style={styles.eyebrow}>FIRST-PINT TUTORIAL</Text><Text style={styles.heading}>Let’s build one together</Text><Text style={styles.intro}>CreamyTuner will explain one decision at a time. Nothing changes behind your back, and you can edit every amount before saving.</Text><View style={styles.stageList}>{stages.map(([icon, title, detail], index) => <GlassCard key={title} style={styles.stageCard}><View style={styles.stageNumber}><Text style={styles.stageNumberText}>{index + 1}</Text></View><Icon name={icon} color={palette.lavender} size={25} /><View style={styles.stageCopy}><Text style={styles.stageTitle}>{title}</Text><Text style={styles.stageDetail}>{detail}</Text></View></GlassCard>)}</View><TutorialExplainer title="You stay in control">Recommendations are starting points, not guarantees. Always check your container’s fill line and official machine instructions.</TutorialExplainer></View>;
}

export function GuidedGoalStep({ preferences, onPreferencesChange }: { preferences: BuilderPreferences; onPreferencesChange: (value: BuilderPreferences) => void }) {
  return <View><Text style={styles.heading}>What are you making?</Text><Text style={styles.intro}>Start with the texture you want. This choice shapes the ingredient suggestions and machine program.</Text><TutorialExplainer title="Why this matters">Ice cream needs a balanced creamy base. Sorbet leans on fruit, while lite recipes usually need extra help staying soft.</TutorialExplainer><Text style={styles.label}>Style</Text><View style={styles.choiceGrid}>{recipeStyles.map((item) => <Pressable key={item.id} onPress={() => onPreferencesChange({ ...preferences, style: item.id })} style={[styles.choiceCard, preferences.style === item.id && styles.choiceCardActive]} accessibilityRole="radio" accessibilityState={{ selected: preferences.style === item.id }} accessibilityLabel={`${item.label}: ${item.detail}`}><Text style={styles.choiceTitle}>{item.label}</Text><Text style={styles.choiceDetail}>{item.detail}</Text></Pressable>)}</View><Text style={styles.label}>Flavor direction</Text><View style={styles.pillRow}>{flavorOptions.map((flavor) => <Pill key={flavor} label={flavor} active={preferences.flavor === flavor.toLowerCase()} onPress={() => onPreferencesChange({ ...preferences, flavor: flavor.toLowerCase() })} />)}</View><Text style={styles.label}>Optional craving note</Text><TextInput value={preferences.craving} onChangeText={(craving) => onPreferencesChange({ ...preferences, craving })} placeholder="e.g. thick chocolate with cookie pieces" placeholderTextColor={palette.textFaint} style={styles.textInput} accessibilityLabel="Optional craving note" /></View>;
}

export function StartingPointStep({ onGuided, onTemplate, hasTemplate }: { onGuided: () => void; onTemplate: () => void; hasTemplate: boolean }) {
  return <View><Text style={styles.heading}>Choose a starting point</Text><Text style={styles.intro}>A starting point gives you a balanced structure. You’ll still choose ingredients and adjust every amount.</Text><TutorialExplainer title="Beginner recommendation">Choose “Help me build it” if you want CreamyTuner to adapt the base to what you already have.</TutorialExplainer><View style={styles.startingList}><GlassCard style={[styles.startingCard, !hasTemplate && styles.startingCardActive]} onPress={onGuided} accessibilityLabel="Help me build a balanced base"><View style={styles.startingIcon}><Icon name="creation" size={28} color={palette.cyan} /></View><View style={styles.startingCopy}><View style={styles.startingTitleRow}><Text style={styles.startingTitle}>Help me build it</Text><Text style={styles.badge}>RECOMMENDED</Text></View><Text style={styles.startingDetail}>Mark what you have, then choose from a balanced recommendation.</Text></View><Icon name="chevron-right" color={palette.cyan} /></GlassCard><GlassCard style={[styles.startingCard, hasTemplate && styles.startingCardActive]} onPress={onTemplate} accessibilityLabel="Start with the Ultra-Thick Base template"><View style={styles.startingIcon}><Icon name="flask-empty-outline" size={28} color={palette.pink} /></View><View style={styles.startingCopy}><Text style={styles.startingTitle}>Ultra-Thick Base</Text><Text style={styles.startingDetail}>Loads milk, almond milk, whey, cottage cheese, cream cheese, salt, and xanthan.</Text></View><Icon name="chevron-right" color={palette.pink} /></GlassCard></View><Text style={styles.footnote}>You can replace ingredients later. Selecting a starting point never locks the recipe.</Text></View>;
}

const styles = StyleSheet.create({
  eyebrow: { color: palette.pink, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.xs },
  heading: { ...textStyles.heading, fontSize: 26, lineHeight: 32 },
  intro: { ...textStyles.body, marginTop: spacing.xs, marginBottom: spacing.md },
  explainer: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.35)', backgroundColor: 'rgba(78,217,232,0.08)', marginBottom: spacing.md },
  explainerCopy: { flex: 1 },
  explainerTitle: { color: palette.cyan, fontSize: 16, lineHeight: 22, fontWeight: '900' },
  explainerText: { color: palette.text, fontSize: 15, lineHeight: 22, marginTop: 2 },
  stageList: { gap: spacing.xs, marginBottom: spacing.md },
  stageCard: { minHeight: 76, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stageNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(241,78,155,0.16)' },
  stageNumberText: { color: palette.pink, fontSize: 16, fontWeight: '900' },
  stageCopy: { flex: 1 },
  stageTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  stageDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  label: { color: palette.textMuted, fontSize: 16, lineHeight: 21, fontWeight: '800', marginBottom: spacing.xs, marginTop: spacing.md },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choiceCard: { width: '47.5%', minHeight: 92, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, padding: spacing.sm, justifyContent: 'center' },
  choiceCardActive: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.16)' },
  choiceTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  choiceDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 3 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  textInput: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.md, fontSize: 16 },
  startingList: { gap: spacing.sm },
  startingCard: { minHeight: 110, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startingCardActive: { borderColor: palette.cyan, borderWidth: 2 },
  startingIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.13)' },
  startingCopy: { flex: 1 },
  startingTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  startingTitle: { color: palette.text, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  startingDetail: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginTop: 3 },
  badge: { color: palette.cyan, fontSize: 11, lineHeight: 16, fontWeight: '900', letterSpacing: 0.5 },
  footnote: { color: palette.textFaint, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.md },
});
