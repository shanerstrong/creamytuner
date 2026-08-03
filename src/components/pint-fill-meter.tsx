import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { getPintFillState } from '@/src/domain/fill';
import { palette, radii, spacing } from '@/src/theme';

export function PintFillMeter({ estimatedVolumeMl, capacityMl, tutorialMode = false, compact = false }: { estimatedVolumeMl: number; capacityMl: number; tutorialMode?: boolean; compact?: boolean }) {
  const fill = getPintFillState(estimatedVolumeMl, capacityMl);
  const danger = fill.status === 'overflow';
  const near = fill.status === 'near-limit';
  const fillHeight = `${fill.visualPercent}%` as `${number}%`;
  const accessibilityLabel = `${fill.amountMl} milliliters of ${fill.capacityMl}. ${fill.title}. ${fill.guidance}`;

  return (
    <View style={[styles.card, compact && styles.cardCompact, danger && styles.cardDanger]} accessibilityLabel={accessibilityLabel} accessibilityLiveRegion="polite">
      <View style={styles.visualColumn}>
        {danger ? <View style={styles.spill} pointerEvents="none"><View style={styles.spillDropLarge} /><View style={styles.spillDropSmall} /><View style={styles.spillWave} /></View> : null}
        <View style={[styles.pint, compact && styles.pintCompact, danger && styles.pintDanger]}>
          <View style={styles.pintShine} />
          <View style={[styles.liquid, { height: fillHeight }]}>
            <LinearGradient colors={danger ? ['#FF6B83', '#F14E9B', '#B545D6'] : ['#FF9AC8', '#F14E9B', '#9B5DE5']} style={StyleSheet.absoluteFill} />
            <View style={styles.layerLight} />
            <View style={styles.layerDark} />
            <View style={styles.liquidTop} />
          </View>
          <View style={styles.maxLine}><Text style={[styles.maxText, danger && styles.maxTextDanger]}>MAX</Text></View>
          <View style={styles.rim} />
          <View style={styles.rimInner} />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>LIVE FILL GUIDE</Text>
        <Text style={[styles.percent, danger && styles.percentDanger]}>{fill.percent}%</Text>
        <Text style={styles.amount}>{fill.amountMl} ml of {fill.capacityMl} ml</Text>
        <View style={[styles.status, danger ? styles.statusDanger : near ? styles.statusNear : styles.statusGood]}>
          <Text style={[styles.statusTitle, danger && styles.statusTitleDanger]}>{danger ? 'OVERFLOW' : fill.title}</Text>
        </View>
        <Text style={styles.guidance}>{fill.guidance}</Text>
        {tutorialMode && !compact ? <View style={styles.tutorial}><Text style={styles.tutorialBadge}>TUTORIAL MODE</Text><Text style={styles.tutorialText}>This pint fills as you change ingredients. Keep the mixture below the MAX line.</Text></View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 270, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(174,134,255,0.35)', backgroundColor: 'rgba(18,27,53,0.94)', padding: spacing.md, marginBottom: spacing.md, overflow: 'visible' },
  cardCompact: { minHeight: 220, gap: spacing.md }, cardDanger: { borderColor: palette.danger, backgroundColor: 'rgba(76,22,48,0.82)' },
  visualColumn: { width: 145, alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  pint: { width: 130, height: 214, borderWidth: 3, borderTopWidth: 2, borderColor: 'rgba(235,241,255,0.72)', borderRadius: 24, borderTopLeftRadius: 15, borderTopRightRadius: 15, overflow: 'hidden', backgroundColor: 'rgba(228,237,255,0.08)' },
  pintCompact: { width: 112, height: 178 }, pintDanger: { borderColor: 'rgba(255,220,230,0.9)' },
  pintShine: { position: 'absolute', zIndex: 4, top: 20, bottom: 14, left: 12, width: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)' },
  liquid: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' }, liquidTop: { position: 'absolute', left: 0, right: 0, top: -5, height: 12, borderRadius: 50, backgroundColor: 'rgba(255,220,240,0.82)' },
  layerLight: { position: 'absolute', left: 0, right: 0, top: '28%', height: '18%', backgroundColor: 'rgba(255,214,229,0.28)' }, layerDark: { position: 'absolute', left: 0, right: 0, bottom: '16%', height: '15%', backgroundColor: 'rgba(112,41,142,0.22)' },
  maxLine: { position: 'absolute', zIndex: 5, left: 7, right: 7, top: '8%', borderTopWidth: 2, borderTopColor: palette.danger }, maxText: { alignSelf: 'center', color: palette.danger, fontSize: 12, lineHeight: 16, fontWeight: '900', backgroundColor: 'rgba(9,13,32,0.88)', paddingHorizontal: 4, marginTop: -9 }, maxTextDanger: { color: palette.white, backgroundColor: palette.danger },
  rim: { position: 'absolute', zIndex: 6, left: -3, right: -3, top: -2, height: 15, borderWidth: 2, borderColor: 'rgba(245,248,255,0.82)', borderRadius: 10, backgroundColor: 'rgba(230,239,255,0.14)' }, rimInner: { position: 'absolute', zIndex: 7, left: 5, right: 5, top: 3, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.12)' },
  spill: { position: 'absolute', zIndex: 9, top: -8, left: 2, right: 2, height: 50 }, spillWave: { position: 'absolute', left: 12, right: 12, bottom: 2, height: 19, borderRadius: 16, backgroundColor: palette.pink }, spillDropLarge: { position: 'absolute', left: 5, bottom: -17, width: 15, height: 31, borderRadius: 10, backgroundColor: palette.pink }, spillDropSmall: { position: 'absolute', right: 9, bottom: -7, width: 10, height: 20, borderRadius: 8, backgroundColor: palette.danger },
  copy: { flex: 1 }, eyebrow: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7 }, percent: { color: palette.text, fontSize: 38, lineHeight: 44, fontWeight: '900', marginTop: 2 }, percentDanger: { color: palette.danger }, amount: { color: palette.textMuted, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  status: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7, marginTop: spacing.sm }, statusGood: { backgroundColor: 'rgba(80,210,160,0.13)' }, statusNear: { backgroundColor: 'rgba(246,197,106,0.14)' }, statusDanger: { backgroundColor: palette.danger }, statusTitle: { color: palette.success, fontSize: 13, lineHeight: 17, fontWeight: '900' }, statusTitleDanger: { color: palette.white }, guidance: { color: palette.text, fontSize: 15, lineHeight: 21, marginTop: spacing.xs },
  tutorial: { marginTop: spacing.sm, borderLeftWidth: 3, borderLeftColor: palette.lavender, paddingLeft: spacing.sm }, tutorialBadge: { color: palette.lavender, fontSize: 13, lineHeight: 18, fontWeight: '900' }, tutorialText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
});
