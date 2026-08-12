import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, StyleSheet, Text, View } from 'react-native';

import { recipeImages } from '@/src/assets';
import { FreezeTimerCard } from '@/src/components/freeze-timer-card';
import { AppHeader, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, Screen } from '@/src/components/ui';
import { createFreezeTimer, isFreezeTimerReady } from '@/src/domain/freeze-timer';
import { getRecipeEligibility } from '@/src/domain/dietary';
import { useApp } from '@/src/providers/app-provider';
import { cancelFreezeReminder, scheduleFreezeReminder } from '@/src/services/freeze-reminder';
import { palette, radii, spacing } from '@/src/theme';

export default function FreezeTimerScreen() {
  const params = useLocalSearchParams<{ recipeId?: string; justBuilt?: string }>();
  const { ready, recipes, ingredients, settings, updateSettings } = useApp();
  const recipe = recipes.find((candidate) => candidate.id === params.recipeId);
  const activeTimer = settings.activeFreezeTimer?.recipeId === recipe?.id ? settings.activeFreezeTimer : null;
  const [message, setMessage] = useState('');
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [activeTimer]);
  const readyToSpin = useMemo(() => activeTimer ? isFreezeTimerReady(activeTimer, now) : false, [activeTimer, now]);
  const conflicts = recipe ? getRecipeEligibility(recipe, ingredients, settings) : [];

  if (!ready) return <LoadingScreen />;
  if (!recipe) return <Screen><AppHeader title="Freeze timer" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><GlassCard style={styles.missing}><Text style={styles.missingTitle}>Recipe not found</Text><GradientButton title="Go home" onPress={() => router.replace('/(tabs)/home')} /></GlassCard></Screen>;
  if (conflicts.length) return <Screen><AppHeader title="Freeze timer" left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.back()} />} /><GlassCard style={styles.missing}><Icon name="shield-alert-outline" color={palette.danger} size={30} /><Text style={styles.missingTitle}>Adjust this recipe first</Text><Text style={styles.blockedText}>{conflicts.map((entry) => entry.ingredient.name).join(', ')} conflicts with your food settings. Timer and processing guidance are blocked until the ingredients are changed.</Text><GradientButton title="Edit ingredients" onPress={() => router.replace(`/builder?recipeId=${recipe.id}`)} /></GlassCard></Screen>;

  const startTimer = async () => {
    setStarting(true);
    const timer = createFreezeTimer(recipe);
    try {
      if (settings.activeFreezeTimer?.notificationId) await cancelFreezeReminder(settings.activeFreezeTimer.notificationId);
      const reminder = await scheduleFreezeReminder(timer);
      await updateSettings({ activeFreezeTimer: { ...timer, notificationId: reminder.notificationId, notificationScheduled: reminder.scheduled }, notifications: reminder.scheduled || settings.notifications });
      setMessage(reminder.message);
    } catch {
      await updateSettings({ activeFreezeTimer: timer });
      setMessage('The in-app timer is active, but a device notification could not be scheduled.');
    } finally {
      setStarting(false);
    }
  };

  const confirmStart = () => {
    if (settings.activeFreezeTimer && settings.activeFreezeTimer.recipeId !== recipe.id) {
      Alert.alert('Replace the current timer?', `${settings.activeFreezeTimer.recipeName} is already freezing. Starting this timer will replace it.`, [
        { text: 'Keep current timer', style: 'cancel' },
        { text: 'Replace timer', onPress: () => { void startTimer(); } },
      ]);
      return;
    }
    void startTimer();
  };

  const cancelTimer = async () => {
    await cancelFreezeReminder(activeTimer?.notificationId);
    await updateSettings({ activeFreezeTimer: null });
    setMessage('Freeze timer canceled.');
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <AppHeader title={activeTimer ? 'Freeze timer' : 'Pint complete'} left={<IconButton icon="chevron-left" label="Go back" onPress={() => router.replace(`/recipe/${recipe.id}`)} />} />
      <ImageBackground source={recipe.photoUri ? { uri: recipe.photoUri } : recipeImages[recipe.imageKey]} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={['transparent', 'rgba(8,12,31,0.98)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCopy}><View style={styles.check}><Icon name="check" size={34} /></View><Text style={styles.heroTitle}>{activeTimer ? recipe.name : 'Your pint is built.'}</Text><Text style={styles.heroText}>{activeTimer ? 'Keep it flat while it freezes.' : 'Put it in the freezer when you are ready.'}</Text></View>
      </ImageBackground>

      {settings.tutorialMode ? <GlassCard style={styles.tutorial}><View style={styles.tutorialIcon}><Icon name="school-outline" color={palette.lavender} /></View><View style={styles.tutorialCopy}><Text style={styles.tutorialBadge}>TUTORIAL MODE</Text><Text style={styles.tutorialText}>{activeTimer ? 'Creamy Tuner counts from the moment you tapped Start. Come back when it says Ready to spin.' : 'Freeze the pint level and flat. Tap the timer button only after the pint is actually in your freezer.'}</Text></View></GlassCard> : null}

      {activeTimer ? <>
        <FreezeTimerCard timer={activeTimer} onPress={() => undefined} />
        {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
        {readyToSpin ? <GradientButton title="Ready — spin this pint" icon="record-circle-outline" onPress={() => router.replace(`/(tabs)/spin?recipeId=${recipe.id}`)} /> : <GradientButton title="View recipe" variant="secondary" onPress={() => router.replace(`/recipe/${recipe.id}`)} />}
        <GradientButton title="Cancel timer" variant="danger" onPress={() => void cancelTimer()} />
      </> : <>
        <GlassCard style={styles.steps}>
          <Step number="1" icon="snowflake" title="Place pint in freezer" detail="Keep the lid level and the pint flat." />
          <Step number="2" icon="gesture-tap-button" title="Tap the button below" detail="The timer does not start automatically." />
          <Step number="3" icon="bell-outline" title="Come back in 24 hours" detail="The phone app can notify you when it is ready." last />
        </GlassCard>
        <GradientButton title={starting ? 'Starting timer…' : 'It is in the freezer — start 24-hour timer'} icon="timer-outline" disabled={starting} onPress={confirmStart} />
        <GradientButton title="Not now" variant="secondary" onPress={() => router.replace(`/recipe/${recipe.id}`)} />
      </>}
      <Text style={styles.disclaimer}>Freezer temperatures vary. Confirm the pint is fully frozen before spinning.</Text>
    </Screen>
  );
}

function Step({ number, icon, title, detail, last = false }: { number: string; icon: 'snowflake' | 'gesture-tap-button' | 'bell-outline'; title: string; detail: string; last?: boolean }) {
  return <View style={[styles.step, !last && styles.stepBorder]}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><View style={styles.stepIcon}><Icon name={icon} color={palette.cyan} /></View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  screenContent: { gap: spacing.sm }, hero: { minHeight: 300, justifyContent: 'flex-end', borderRadius: radii.xl, overflow: 'hidden' }, heroImage: { borderRadius: radii.xl }, heroCopy: { padding: spacing.lg, alignItems: 'center' }, check: { width: 66, height: 66, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.pink, marginBottom: spacing.sm }, heroTitle: { color: palette.text, fontSize: 28, lineHeight: 34, fontWeight: '900', textAlign: 'center' }, heroText: { color: palette.textMuted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: spacing.xs },
  tutorial: { padding: spacing.sm, flexDirection: 'row', gap: spacing.sm, borderColor: 'rgba(174,134,255,0.4)' }, tutorialIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(174,134,255,0.13)', alignItems: 'center', justifyContent: 'center' }, tutorialCopy: { flex: 1 }, tutorialBadge: { color: palette.lavender, fontSize: 13, lineHeight: 18, fontWeight: '900' }, tutorialText: { color: palette.text, fontSize: 15, lineHeight: 22, marginTop: 2 },
  steps: { paddingHorizontal: spacing.md }, step: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }, stepBorder: { borderBottomWidth: 1, borderBottomColor: palette.border }, stepNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.pink }, stepNumberText: { color: palette.white, fontSize: 17, fontWeight: '900' }, stepIcon: { width: 44, alignItems: 'center' }, stepCopy: { flex: 1 }, stepTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }, stepDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  message: { color: palette.cyan, fontSize: 15, lineHeight: 21, fontWeight: '800', textAlign: 'center', paddingHorizontal: spacing.md }, disclaimer: { color: palette.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm }, missing: { padding: spacing.lg, gap: spacing.md }, missingTitle: { color: palette.text, fontSize: 22, fontWeight: '900' },
  blockedText: { color: palette.textMuted, fontSize: 15, lineHeight: 22 },
});
