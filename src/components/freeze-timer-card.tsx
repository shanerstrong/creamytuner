import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatFreezeReadyTime, formatFreezeTimerRemaining, isFreezeTimerReady } from '@/src/domain/freeze-timer';
import { GlassCard, Icon } from '@/src/components/ui';
import { palette, spacing } from '@/src/theme';
import type { FreezeTimer } from '@/src/types';

export function FreezeTimerCard({ timer, onPress }: { timer: FreezeTimer; onPress: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  const ready = isFreezeTimerReady(timer, now);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${timer.recipeName}. ${formatFreezeTimerRemaining(timer, now)}`}><GlassCard style={[styles.card, ready && styles.readyCard]}><View style={[styles.icon, ready && styles.readyIcon]}><Icon name={ready ? 'check' : 'timer-sand'} size={27} color={ready ? palette.ink : palette.cyan} /></View><View style={styles.copy}><Text style={styles.eyebrow}>{ready ? 'READY TO SPIN' : 'FREEZING NOW'}</Text><Text style={styles.name} numberOfLines={1}>{timer.recipeName}</Text><Text style={styles.remaining}>{formatFreezeTimerRemaining(timer, now)}</Text><Text style={styles.readyTime}>{formatFreezeReadyTime(timer)}</Text></View></GlassCard></Pressable>;
}

const styles = StyleSheet.create({ card: { minHeight: 102, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(78,217,232,0.35)' }, readyCard: { borderColor: 'rgba(80,210,160,0.55)' }, icon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(78,217,232,0.12)' }, readyIcon: { backgroundColor: palette.success }, copy: { flex: 1 }, eyebrow: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7 }, name: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 1 }, remaining: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 2 }, readyTime: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 } });
