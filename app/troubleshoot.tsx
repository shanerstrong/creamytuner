import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, GlassCard, GradientButton, Icon, IconButton, Screen, type IconName } from '@/src/components/ui';
import { palette, radii, spacing } from '@/src/theme';

const issues = [
  { id: 'powdery', title: 'Too Powdery', subtitle: 'Dry, crumbly texture', icon: 'cube-outline' as IconName, advice: 'Use Re-Spin once without adding liquid. If it stays powdery, add only 1–2 tablespoons of milk and Re-Spin again.' },
  { id: 'soft', title: 'Too Soft', subtitle: 'Melting too quickly', icon: 'ice-cream' as IconName, advice: 'Return the pint to the freezer until firm. Confirm the freezer is cold enough and the base froze flat for at least 24 hours.' },
  { id: 'icy', title: 'Too Icy', subtitle: 'Icicles or icy bites', icon: 'snowflake' as IconName, advice: 'Review the sweetener and stabilizer balance. A small amount of guar gum or a recipe-appropriate sweetener can reduce iciness next time.' },
  { id: 'wont-spin', title: "Won't Spin", subtitle: 'Machine struggles or stops', icon: 'cog-off-outline' as IconName, advice: 'Stop the machine. Confirm the tub is seated correctly and the frozen surface is flat. Never process a tilted block or exceed the max-fill line.' },
  { id: 'crumbly', title: 'Sides Crumbly', subtitle: 'Gap around the edges', icon: 'circle-outline' as IconName, advice: 'Scrape down the loose sides into the center, then use Re-Spin. Avoid adding extra liquid unless the whole pint is powdery.' },
  { id: 'hard', title: 'Center Hard', subtitle: 'Hard block in the middle', icon: 'record-circle-outline' as IconName, advice: 'Let the pint sit at room temperature for a few minutes, confirm it is level, then process using the recipe-appropriate program.' },
];

export default function TroubleshooterScreen() {
  const params = useLocalSearchParams<{ issue?: string }>();
  const [selected, setSelected] = useState(params.issue ?? 'powdery');
  const active = issues.find((issue) => issue.id === selected) ?? issues[0];
  return (
    <Screen>
      <AppHeader title="What's happening with your pint?" subtitle="Select the issue you're facing" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} />
      <View style={styles.grid}>
        {issues.map((issue) => (
          <GlassCard key={issue.id} onPress={() => setSelected(issue.id)} accessibilityLabel={issue.title} style={[styles.issue, selected === issue.id && styles.issueActive]}>
            <View style={styles.icon}><Icon name={issue.icon} color={selected === issue.id ? palette.pink : palette.textMuted} /></View>
            <Text style={styles.title}>{issue.title}</Text>
            <Text style={styles.subtitle}>{issue.subtitle}</Text>
          </GlassCard>
        ))}
      </View>
      <GlassCard style={styles.answer}>
        <View style={styles.answerIcon}><Icon name="lightbulb-on-outline" color={palette.warning} /></View>
        <View style={styles.answerCopy}><Text style={styles.answerTitle}>{active.title}</Text><Text style={styles.answerText}>{active.advice}</Text></View>
      </GlassCard>
      <Text style={styles.safety}>If the machine makes unusual noises, stops repeatedly, or the container is damaged, stop and consult the official owner’s guide.</Text>
      <GradientButton title="Go to Live Spin" icon="record-circle-outline" onPress={() => router.push('/(tabs)/spin')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md },
  issue: { width: '48.2%', minHeight: 126, padding: spacing.sm },
  issueActive: { borderColor: palette.pink, borderWidth: 2 },
  icon: { width: 38, height: 38, borderRadius: radii.sm, backgroundColor: 'rgba(174,134,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 3 },
  answer: { padding: spacing.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  answerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(246,197,106,0.12)', alignItems: 'center', justifyContent: 'center' },
  answerCopy: { flex: 1 },
  answerTitle: { color: palette.text, fontWeight: '800', fontSize: 17 },
  answerText: { color: palette.textMuted, fontSize: 16, lineHeight: 24, marginTop: 3 },
  safety: { color: palette.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: spacing.md },
});
