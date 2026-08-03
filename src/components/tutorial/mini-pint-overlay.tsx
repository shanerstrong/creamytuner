import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/src/components/ui';
import { getPintFillState } from '@/src/domain/fill';
import { palette, radii, shadows, spacing } from '@/src/theme';

export function MiniPintOverlay({ amountMl, capacityMl, visible, onToggle }: { amountMl: number; capacityMl: number; visible: boolean; onToggle: () => void }) {
  const fill = getPintFillState(amountMl, capacityMl);
  const danger = fill.status === 'overflow';
  if (!visible) {
    return (
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Show live pint guide" style={styles.showButton}>
        <Icon name="cup-outline" size={21} color={palette.cyan} />
        <Text style={styles.showText}>Show pint</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.overlay, danger && styles.overlayDanger]} accessibilityLabel={`Live pint guide. ${fill.amountMl} milliliters of ${fill.capacityMl}. ${fill.title}.`} accessibilityLiveRegion="polite">
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Hide live pint guide" style={styles.hideButton}>
        <Icon name="eye-off-outline" size={18} color={palette.textMuted} />
      </Pressable>
      <View style={styles.pintWrap}>
        {danger ? <View style={styles.spill} /> : null}
        <View style={[styles.pint, danger && styles.pintDanger]}>
          <View style={[styles.liquid, { height: `${fill.visualPercent}%` as `${number}%` }]}>
            <LinearGradient colors={danger ? ['#FF6B83', '#C93B83'] : ['#FF9AC8', '#B545D6']} style={StyleSheet.absoluteFill} />
            <View style={styles.liquidTop} />
          </View>
          <View style={styles.maxLine}><Text style={styles.maxText}>MAX</Text></View>
          <View style={styles.shine} />
          <View style={styles.rim} />
        </View>
      </View>
      <Text style={[styles.percent, danger && styles.dangerText]}>{fill.percent}%</Text>
      <Text style={styles.label}>{danger ? 'OVERFLOW' : 'LIVE PINT'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', zIndex: 50, right: 12, bottom: 96, width: 116, minHeight: 162, alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(78,217,232,0.45)', backgroundColor: 'rgba(10,16,38,0.96)', padding: spacing.xs, ...shadows.glow },
  overlayDanger: { borderColor: palette.danger, backgroundColor: 'rgba(69,18,43,0.97)' },
  hideButton: { position: 'absolute', zIndex: 3, top: 4, right: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pintWrap: { height: 105, width: 76, justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  pint: { width: 64, height: 98, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(235,241,255,0.78)', borderRadius: 13, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: 'rgba(230,239,255,0.08)' },
  pintDanger: { borderColor: palette.white },
  liquid: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  liquidTop: { position: 'absolute', top: -3, left: 0, right: 0, height: 7, borderRadius: 20, backgroundColor: 'rgba(255,224,240,0.82)' },
  maxLine: { position: 'absolute', zIndex: 3, left: 4, right: 4, top: '8%', borderTopWidth: 1.5, borderTopColor: palette.danger },
  maxText: { alignSelf: 'center', color: palette.danger, fontSize: 9, lineHeight: 12, fontWeight: '900', backgroundColor: 'rgba(8,12,31,0.9)', marginTop: -6, paddingHorizontal: 2 },
  shine: { position: 'absolute', zIndex: 2, top: 17, bottom: 8, left: 7, width: 5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  rim: { position: 'absolute', zIndex: 4, top: -1, left: -2, right: -2, height: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.86)', borderRadius: 7 },
  spill: { position: 'absolute', zIndex: 5, top: 0, width: 75, height: 13, borderRadius: 10, backgroundColor: palette.pink },
  percent: { color: palette.text, fontSize: 18, lineHeight: 22, fontWeight: '900' }, dangerText: { color: palette.danger },
  label: { color: palette.cyan, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 0.5 },
  showButton: { position: 'absolute', zIndex: 50, right: 12, bottom: 102, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(78,217,232,0.45)', backgroundColor: 'rgba(10,16,38,0.96)', paddingHorizontal: spacing.sm, ...shadows.glow },
  showText: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900' },
});
