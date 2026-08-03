import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { MiniPintOverlay } from '@/src/components/tutorial/mini-pint-overlay';
import { AppHeader, GlassCard, GradientButton, Icon, IconButton, LoadingScreen, Screen, type IconName } from '@/src/components/ui';
import { machineById, machines } from '@/src/data/machines';
import { createFreezeTimer } from '@/src/domain/freeze-timer';
import { generateRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import { CURRENT_ONBOARDING_VERSION, TUTORIAL_STEP_COUNT, fitTutorialBaseAmount, tutorialItems, tutorialMixInItem, tutorialRecipePresentation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { scheduleFreezeReminder } from '@/src/services/freeze-reminder';
import { palette, radii, spacing } from '@/src/theme';
import type { Recipe, TutorialDraft, TutorialTextureResult, UserSettings } from '@/src/types';

type Choice = { id: string; title: string; detail: string; icon: IconName };

const baseChoices: Choice[] = [
  { id: 'milk-2', title: '2% milk', detail: 'A forgiving, familiar dairy base.', icon: 'cup-water' },
  { id: 'fairlife-2', title: 'Ultra-filtered milk', detail: 'More protein with a creamy dairy base.', icon: 'arm-flex' },
  { id: 'almond-milk', title: 'Almond milk', detail: 'A light dairy-free starting point.', icon: 'leaf' },
  { id: 'soy-milk', title: 'Soy milk', detail: 'A thicker dairy-free option.', icon: 'sprout' },
];

const helperChoices: (Choice & { value: string | null })[] = [
  { id: 'jello-vanilla-zero', value: 'jello-vanilla-zero', title: 'Vanilla pudding mix', detail: 'Adds flavor and body. Check the package allergens.', icon: 'cup' },
  { id: 'jello-cheesecake-zero', value: 'jello-cheesecake-zero', title: 'Cheesecake pudding mix', detail: 'A richer, tangier texture helper.', icon: 'cake-variant-outline' },
  { id: 'xanthan-gum', value: 'xanthan-gum', title: 'Xanthan gum', detail: 'Use only a small measured amount.', icon: 'dots-hexagon' },
  { id: 'none-helper', value: null, title: 'No texture helper', detail: 'Fine for richer bases; lighter pints may be icier.', icon: 'minus-circle-outline' },
];

const sweetenerChoices: (Choice & { value: string | null })[] = [
  { id: 'allulose', value: 'allulose', title: 'Allulose', detail: 'Lower-calorie sweetness and a softer freeze.', icon: 'shaker-outline' },
  { id: 'sugar', value: 'sugar', title: 'Granulated sugar', detail: 'Classic sweetness and familiar texture.', icon: 'shaker' },
  { id: 'brown-sugar', value: 'brown-sugar', title: 'Brown sugar', detail: 'Adds caramel-like depth.', icon: 'shaker-outline' },
  { id: 'none-sweetener', value: null, title: 'No added sweetener', detail: 'Fruit can help, but the pint may freeze harder.', icon: 'minus-circle-outline' },
];

const flavorChoices: (Choice & { value: string | null })[] = [
  { id: 'strawberries', value: 'strawberries', title: 'Strawberry', detail: 'Bright fruit flavor and natural sweetness.', icon: 'fruit-cherries' },
  { id: 'cocoa', value: 'cocoa', title: 'Chocolate', detail: 'Unsweetened cocoa for a deeper pint.', icon: 'food-variant' },
  { id: 'vanilla', value: 'vanilla', title: 'Vanilla', detail: 'Simple, flexible, and easy to customize.', icon: 'flower-outline' },
  { id: 'banana', value: 'banana', title: 'Banana', detail: 'Fruit sweetness with extra body.', icon: 'food-apple-outline' },
  { id: 'none-flavor', value: null, title: 'Keep it plain', detail: 'Build a neutral base now and add flavor later.', icon: 'circle-outline' },
];

const textureChoices: { id: TutorialTextureResult; title: string; detail: string; icon: IconName }[] = [
  { id: 'perfect', title: 'Perfect', detail: 'Smooth, creamy, and ready to scoop.', icon: 'check-circle-outline' },
  { id: 'powdery', title: 'Powdery or crumbly', detail: 'Dry-looking after the first spin.', icon: 'cube-outline' },
  { id: 'chalky', title: 'Chalky', detail: 'Smooth enough, but dry on the tongue.', icon: 'blur' },
  { id: 'icy', title: 'Too icy', detail: 'Visible crystals or crunchy ice.', icon: 'snowflake-alert' },
  { id: 'too-soft', title: 'Too soft', detail: 'Melting or loose instead of scoopable.', icon: 'ice-cream' },
];

export default function TutorialScreen() {
  const { ready, ingredients, recipes, settings, saveRecipe, updateSettings } = useApp();
  const [draft, setDraft] = useState<TutorialDraft>(settings.tutorialDraft);
  const [transitioning, setTransitioning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timerMessage, setTimerMessage] = useState('');
  const initialized = useRef(false);
  const slide = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (ready && !initialized.current) {
      setDraft(settings.tutorialDraft);
      initialized.current = true;
    }
  }, [ready, settings.tutorialDraft]);

  const machine = machineById(draft.machineId);
  const items = useMemo(() => tutorialItems(draft, ingredients), [draft, ingredients]);
  const validation = useMemo(() => validateRecipe(items, ingredients, machine.id), [ingredients, items, machine.id]);
  const previewRecipe = useMemo(() => generateTutorialRecipe(draft, items, ingredients), [draft, ingredients, items]);
  const program = useMemo(() => recommendProgram(previewRecipe, machine.id), [machine.id, previewRecipe]);
  const showMiniPint = draft.step >= 1 && draft.step <= 6;

  if (!ready) return <LoadingScreen />;

  const persistDraft = (next: TutorialDraft) => {
    setDraft(next);
    void updateSettings({ tutorialDraft: next, machineId: next.machineId });
  };

  const changeDraft = (patch: Partial<TutorialDraft>) => persistDraft({ ...draft, ...patch });

  const transitionTo = (step: number, patch: Partial<TutorialDraft> = {}, settingsPatch: Partial<UserSettings> = {}) => {
    if (transitioning) return;
    const next = { ...draft, ...patch, step };
    const direction = step >= draft.step ? 1 : -1;
    const commit = () => {
      setDraft(next);
      void updateSettings({ tutorialDraft: next, machineId: next.machineId, ...settingsPatch });
      slide.setValue(direction * Math.min(width, 560));
      if (reducedMotion) {
        slide.setValue(0);
        setTransitioning(false);
      } else {
        Animated.timing(slide, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setTransitioning(false));
      }
    };
    if (reducedMotion) {
      commit();
      return;
    }
    setTransitioning(true);
    Animated.timing(slide, { toValue: -direction * Math.min(width, 560), duration: 190, useNativeDriver: true }).start(commit);
  };

  const saveCurrentRecipe = async (sourceDraft = draft) => {
    const currentItems = tutorialItems(sourceDraft, ingredients);
    const recipe = generateTutorialRecipe(sourceDraft, currentItems, ingredients);
    await saveRecipe(recipe);
    return recipe;
  };

  const freezeLater = async () => {
    setBusy(true);
    const recipe = await saveCurrentRecipe();
    setBusy(false);
    transitionTo(7, { recipeId: recipe.id });
  };

  const startFreezeTimer = async () => {
    setBusy(true);
    const recipe = await saveCurrentRecipe();
    const timer = createFreezeTimer(recipe);
    const reminder = await scheduleFreezeReminder(timer).catch(() => ({ scheduled: false, notificationId: undefined, message: 'The in-app timer is active, but a device reminder could not be scheduled.' }));
    setTimerMessage(reminder.message);
    setBusy(false);
    transitionTo(7, { recipeId: recipe.id }, {
      activeFreezeTimer: { ...timer, notificationId: reminder.notificationId, notificationScheduled: reminder.scheduled },
      notifications: reminder.scheduled || settings.notifications,
    });
  };

  const finishTutorial = async (openFix = false) => {
    setBusy(true);
    const recipe = await saveCurrentRecipe();
    const finalDraft = { ...draft, recipeId: recipe.id, step: 10 };
    await updateSettings({
      tutorialDraft: finalDraft,
      machineId: finalDraft.machineId,
      onboarded: true,
      onboardingVersion: CURRENT_ONBOARDING_VERSION,
      firstPintCompleted: true,
    });
    setBusy(false);
    if (openFix && draft.textureResult !== 'perfect') {
      const issue = draft.textureResult === 'chalky' ? 'powdery' : draft.textureResult;
      router.replace(`/troubleshoot?issue=${issue}`);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const fitPint = () => changeDraft({ baseAmountMl: fitTutorialBaseAmount(draft, ingredients, machine.capacityMl) });
  const page = renderTutorialPage({ draft, changeDraft, items, ingredients, validation, machine, program, timerMessage, recipes });
  const nextDisabled = transitioning || busy || (draft.step === 5 && validation.errors.length > 0);

  return (
    <View style={styles.shell}>
      <Screen resetKey={draft.step} contentStyle={styles.content} footer={
        <TutorialFooter
          step={draft.step}
          busy={busy}
          disabled={nextDisabled}
          onBack={() => draft.step === 0 ? router.replace('/') : transitionTo(draft.step - 1)}
          onNext={() => transitionTo(Math.min(10, draft.step + 1))}
          onFreezeNow={() => { void startFreezeTimer(); }}
          onFreezeLater={() => { void freezeLater(); }}
          onFinish={() => { void finishTutorial(false); }}
        />
      }>
        <AppHeader title="Your first pint" left={<IconButton icon="chevron-left" label="Go back" onPress={() => draft.step === 0 ? router.replace('/') : transitionTo(draft.step - 1)} />} />
        <TutorialProgress step={draft.step} />
        <Animated.View style={{ transform: [{ translateX: slide }] }}>{page}</Animated.View>
        {draft.step === 5 && validation.errors.length ? <GradientButton title="Fit this container" icon="arrow-collapse" onPress={fitPint} /> : null}
        {draft.step === 10 && draft.textureResult !== 'perfect' ? <GradientButton title="Open the matching fix" variant="secondary" icon="wrench-outline" onPress={() => { void finishTutorial(true); }} /> : null}
      </Screen>
      {showMiniPint ? <MiniPintOverlay amountMl={validation.estimatedVolumeMl} capacityMl={machine.capacityMl} visible={settings.tutorialPintVisible} onToggle={() => void updateSettings({ tutorialPintVisible: !settings.tutorialPintVisible })} /> : null}
    </View>
  );
}

function renderTutorialPage({ draft, changeDraft, items, ingredients, validation, machine, program, timerMessage, recipes }: {
  draft: TutorialDraft;
  changeDraft: (patch: Partial<TutorialDraft>) => void;
  items: ReturnType<typeof tutorialItems>;
  ingredients: ReturnType<typeof useApp>['ingredients'];
  validation: ReturnType<typeof validateRecipe>;
  machine: ReturnType<typeof machineById>;
  program: ReturnType<typeof recommendProgram>;
  timerMessage: string;
  recipes: Recipe[];
}) {
  const nameOf = (id: string | null) => id ? ingredients.find((ingredient) => ingredient.id === id)?.name ?? 'None' : 'None';
  switch (draft.step) {
    case 0:
      return <Page icon="cup" eyebrow="STEP 1" title="Which machine do you have?" intro="This keeps fill limits and program names accurate."><View style={styles.machineGrid}>{machines.map((choice) => <ChoiceCard key={choice.id} id={choice.id} title={choice.shortName} detail={choice.subtitle} icon={choice.familyId === 'nc700' ? 'ice-cream' : 'cup'} active={choice.id === draft.machineId} onPress={() => changeDraft({ machineId: choice.id })} compact />)}</View></Page>;
    case 1:
      return <Page icon="cup-water" eyebrow="BUILD THE BASE" title="Start with one base" intro="The base supplies most of the liquid. You can change exact amounts later."><ChoiceList choices={baseChoices} value={draft.baseId} onChange={(baseId) => { const ingredient = ingredients.find((candidate) => candidate.id === baseId); changeDraft({ baseId, baseAmountMl: ingredient?.defaultUnit === 'ml' ? ingredient.defaultAmount : 300 }); }} /><GlassCard style={styles.optionalCard} onPress={() => changeDraft({ proteinId: draft.proteinId ? null : 'whey-vanilla' })} accessibilityLabel={draft.proteinId ? 'Remove optional protein powder' : 'Add optional protein powder'}><View style={styles.optionalRow}><Icon name="arm-flex" color={palette.cyan} /><View style={styles.flex}><Text style={styles.optionalTitle}>Add vanilla protein powder?</Text><Text style={styles.optionalText}>{draft.proteinId ? 'Included — tap to remove' : 'Optional — tap to add one measured scoop'}</Text></View><Icon name={draft.proteinId ? 'check-circle' : 'plus-circle-outline'} color={draft.proteinId ? palette.success : palette.textMuted} /></View></GlassCard></Page>;
    case 2:
      return <Page icon="cup" eyebrow="BUILD TEXTURE" title="Choose a texture helper" intro="Pudding mix and gums are optional. More is not better—use the measured amount."><ChoiceList choices={helperChoices} value={draft.helperId ?? 'none-helper'} onChange={(id) => changeDraft({ helperId: helperChoices.find((choice) => choice.id === id)?.value ?? null })} /></Page>;
    case 3:
      return <Page icon="shaker-outline" eyebrow="BALANCE THE FREEZE" title="Choose a sweetener" intro="Sweetener changes both flavor and how hard the pint freezes."><ChoiceList choices={sweetenerChoices} value={draft.sweetenerId ?? 'none-sweetener'} onChange={(id) => changeDraft({ sweetenerId: sweetenerChoices.find((choice) => choice.id === id)?.value ?? null })} /></Page>;
    case 4:
      return <Page icon="fruit-cherries" eyebrow="MAKE IT YOURS" title="Add fruit or flavor" intro="Blend fruit into the base before freezing. Do not process hard, loose frozen fruit by itself."><ChoiceList choices={flavorChoices} value={draft.flavorId ?? 'none-flavor'} onChange={(id) => changeDraft({ flavorId: flavorChoices.find((choice) => choice.id === id)?.value ?? null })} /></Page>;
    case 5:
      return <Page icon="blender" eyebrow="BLEND + CHECK" title="Blend until completely smooth" intro="A smooth, level base protects texture and helps the machine process evenly."><InfoCard number="1" title="Blend the base" detail="Blend the milk, protein, helper, sweetener, and fruit until no lumps remain." /><InfoCard number="2" title="Pour into the correct pint" detail={`Use the ${machine.shortName} container and keep the mixture below its MAX line.`} /><InfoCard number="3" title="Check the live pint" detail={validation.errors.length ? 'It is over the safe target. Tap Fit this container below.' : `Looks good: about ${validation.estimatedVolumeMl} ml in a ${machine.capacityMl} ml container.`} tone={validation.errors.length ? 'danger' : 'success'} /><GlassCard style={styles.summaryCard}><Text style={styles.summaryTitle}>What you added</Text>{items.map((item) => <Text key={item.ingredientId} style={styles.summaryLine}>{nameOf(item.ingredientId)}</Text>)}</GlassCard></Page>;
    case 6:
      return <Page icon="snowflake" eyebrow="FREEZE FLAT" title="Freeze for at least 24 hours" intro="Twelve hours is not the supported minimum. The pint can feel frozen sooner and still be too warm inside."><GlassCard style={styles.timerHero}><Text style={styles.timerNumber}>24:00</Text><Text style={styles.timerLabel}>minimum freeze time</Text></GlassCard><InfoCard number="1" title="Use the storage lid" detail="Keep the pint upright and level on a flat freezer shelf." /><InfoCard number="2" title="Start only when it is inside" detail="The timer button below never starts automatically." /><Text style={styles.safetyNote}>Do not process a pint that froze at an angle. Melt it, whisk it smooth, and freeze it level again.</Text></Page>;
    case 7:
      return <Page icon="record-circle-outline" eyebrow="FIRST SPIN" title={`Choose ${program.program.name}`} intro={`That is Creamy Tuner’s starting recommendation for this base on the ${machine.shortName}.`}><GlassCard style={styles.programCard}><View style={styles.programIcon}><Icon name="tune-vertical" size={34} color={palette.pink} /></View><View style={styles.flex}><Text style={styles.programName}>{program.program.name}</Text><Text style={styles.programReason}>{program.reason}</Text></View></GlassCard>{timerMessage ? <Text style={styles.timerMessage}>{timerMessage}</Text> : null}<InfoCard number="1" title="Confirm 24 hours" detail="The pint should be fully frozen and level before it enters the machine." /><InfoCard number="2" title="Run one full program" detail="Let the machine finish, lower the bowl, and inspect the result before doing anything else." /></Page>;
    case 8:
      return <Page icon="eye-outline" eyebrow="CHECK THE RESULT" title="How did the first spin look?" intro="Pick the closest answer. Creamy Tuner will show only the next useful action."><View style={styles.choiceList}>{textureChoices.map((choice) => <ChoiceCard key={choice.id} {...choice} active={draft.textureResult === choice.id} onPress={() => changeDraft({ textureResult: choice.id })} />)}</View></Page>;
    case 9: {
      const guidance = tutorialTextureGuidance[draft.textureResult];
      const mixIns: (Choice & { value: string | null })[] = [
        { id: 'no-mix-in', value: null, title: 'No mix-ins', detail: 'Scoop it as-is.', icon: 'minus-circle-outline' },
        { id: 'cookie-pieces', value: 'cookie-pieces', title: 'Cookie pieces', detail: 'Add after the first spin using Mix-In.', icon: 'cookie-outline' },
        { id: 'dark-chocolate', value: 'dark-chocolate', title: 'Chocolate chips', detail: 'Crush or chop, then use Mix-In.', icon: 'dots-grid' },
      ];
      return <Page icon="refresh" eyebrow="CHOOSE ONE NEXT ACTION" title={guidance.title} intro={guidance.detail}><GlassCard style={styles.guidanceCard}><Text style={styles.nextLabel}>NEXT ACTION</Text><Text style={styles.nextAction}>{guidance.next}</Text></GlassCard>{draft.textureResult === 'perfect' ? <><Text style={styles.subheading}>Optional mix-ins</Text><ChoiceList choices={mixIns} value={draft.mixInId ?? 'no-mix-in'} onChange={(id) => changeDraft({ mixInId: mixIns.find((choice) => choice.id === id)?.value ?? null })} /><Text style={styles.safetyNote}>Use a spoon to make a 1½-inch-wide hole to the bottom, add up to about ⅓ cup total, then run MIX-IN.</Text></> : <><InfoCard number="1" title="Use a spoon or silicone spatula" detail="Pack loose ice cream down gently. Do not scrape aggressively with a knife or metal utensil." /><InfoCard number="2" title="Do not stack Re-Spin and Mix-In" detail="If you are adding mix-ins, choose MIX-IN instead of automatically running both programs." /><Text style={styles.safetyNote}>For drinkable outputs only, the manufacturer says 2–4 tbsp of milk can thin the drink before Re-Spin. Do not add milk automatically to a scoopable pint.</Text></>}</Page>;
    }
    default: {
      const presentation = tutorialRecipePresentation(draft);
      const saved = recipes.some((recipe) => recipe.id === draft.recipeId);
      return <Page icon="party-popper" eyebrow="TUTORIAL COMPLETE" title="You know the whole pint process" intro="Your dashboard and tools unlock after this page."><GlassCard style={styles.completeCard}><View style={styles.completeIcon}><Icon name="check" size={38} color={palette.ink} /></View><Text style={styles.completeTitle}>{presentation.name}</Text><Text style={styles.completeText}>{saved ? 'Saved to your recipes.' : 'Ready to save to your recipes.'}</Text><View style={styles.completeSummary}><Text style={styles.completeLine}>Base: {nameOf(draft.baseId)}</Text><Text style={styles.completeLine}>Texture helper: {nameOf(draft.helperId)}</Text><Text style={styles.completeLine}>Flavor: {nameOf(draft.flavorId)}</Text><Text style={styles.completeLine}>Result choice: {draft.textureResult.replaceAll('-', ' ')}</Text></View></GlassCard><Text style={styles.safetyNote}>Creamy Tuner gives estimates and guidance. Always follow the owner’s guide and MAX line for your exact machine.</Text></Page>;
    }
  }
}

function generateTutorialRecipe(draft: TutorialDraft, baseItems: ReturnType<typeof tutorialItems>, ingredients: ReturnType<typeof useApp>['ingredients']) {
  const presentation = tutorialRecipePresentation(draft);
  const mixIn = tutorialMixInItem(draft, ingredients);
  const recipe = generateRecipe({
    name: presentation.name,
    style: 'ice-cream',
    items: mixIn ? [...baseItems, mixIn] : baseItems,
    ingredients,
    existingId: draft.recipeId || undefined,
    imageKey: presentation.imageKey,
  });
  recipe.directions = [
    'Blend the base ingredients until completely smooth.',
    'Pour into the correct container without exceeding its MAX line.',
    'Freeze flat with the storage lid for at least 24 hours.',
    'Run the recommended first-spin program and inspect the texture.',
    draft.mixInId ? 'Use a spoon to make a 1½-inch-wide hole, add the mix-in, then run MIX-IN.' : 'If powdery or crumbly, pack it down and use Re-Spin once.',
  ];
  return recipe;
}

function TutorialProgress({ step }: { step: number }) {
  return <View style={styles.progress}><View style={styles.progressTop}><Text style={styles.progressLabel}>FIRST PINT TUTORIAL</Text><Text style={styles.progressCount}>{step + 1} of {TUTORIAL_STEP_COUNT}</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / TUTORIAL_STEP_COUNT) * 100}%` }]} /></View></View>;
}

function Page({ icon, eyebrow, title, intro, children }: { icon: IconName; eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <View><View style={styles.pageIcon}><Icon name={icon} size={30} color={palette.pink} /></View><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text><Text style={styles.intro}>{intro}</Text><View style={styles.pageBody}>{children}</View></View>;
}

function ChoiceList({ choices, value, onChange }: { choices: Choice[]; value: string; onChange: (id: string) => void }) {
  return <View style={styles.choiceList}>{choices.map((choice) => <ChoiceCard key={choice.id} {...choice} active={choice.id === value} onPress={() => onChange(choice.id)} />)}</View>;
}

function ChoiceCard({ title, detail, icon, active, onPress, compact = false }: Choice & { active: boolean; onPress: () => void; compact?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${title}. ${detail}`} style={({ pressed }) => [styles.choice, compact && styles.choiceCompact, active && styles.choiceActive, pressed && styles.pressed]}><View style={[styles.choiceIcon, active && styles.choiceIconActive]}><Icon name={icon} color={active ? palette.pink : palette.lavender} /></View><View style={styles.flex}><Text style={styles.choiceTitle}>{title}</Text><Text style={styles.choiceDetail}>{detail}</Text></View><Icon name={active ? 'check-circle' : 'circle-outline'} color={active ? palette.success : palette.textFaint} /></Pressable>;
}

function InfoCard({ number, title, detail, tone = 'default' }: { number: string; title: string; detail: string; tone?: 'default' | 'success' | 'danger' }) {
  return <GlassCard style={[styles.infoCard, tone === 'danger' && styles.infoDanger, tone === 'success' && styles.infoSuccess]}><View style={styles.infoRow}><View style={[styles.infoNumber, tone === 'danger' && styles.infoNumberDanger, tone === 'success' && styles.infoNumberSuccess]}><Text style={styles.infoNumberText}>{number}</Text></View><View style={styles.flex}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDetail}>{detail}</Text></View></View></GlassCard>;
}

function TutorialFooter({ step, busy, disabled, onBack, onNext, onFreezeNow, onFreezeLater, onFinish }: { step: number; busy: boolean; disabled: boolean; onBack: () => void; onNext: () => void; onFreezeNow: () => void; onFreezeLater: () => void; onFinish: () => void }) {
  return <SafeAreaView edges={['bottom']} style={styles.footerSafe}><View style={styles.footer}>{step === 6 ? <><GradientButton title={busy ? 'Starting…' : 'It is in the freezer — start 24h timer'} icon="timer-outline" disabled={disabled} onPress={onFreezeNow} /><GradientButton title="I’ll come back later" variant="secondary" disabled={busy} onPress={onFreezeLater} /></> : step === 10 ? <GradientButton title={busy ? 'Saving…' : 'Finish tutorial'} icon="arrow-right" disabled={busy} onPress={onFinish} /> : <View style={styles.footerRow}><Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Previous tutorial page" style={styles.backButton}><Icon name="arrow-left" /><Text style={styles.backText}>Back</Text></Pressable><View style={styles.nextWrap}><GradientButton title={step === 5 && disabled ? 'Fix fill first' : 'Continue'} icon="arrow-right" disabled={disabled} onPress={onNext} /></View></View>}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: palette.ink }, content: { paddingBottom: spacing.lg },
  progress: { marginBottom: spacing.lg }, progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, progressLabel: { color: palette.lavender, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7 }, progressCount: { color: palette.textMuted, fontSize: 14, lineHeight: 20, fontWeight: '800' }, progressTrack: { height: 7, borderRadius: 4, backgroundColor: palette.panelRaised, marginTop: spacing.xs, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: palette.pink },
  pageIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(241,78,155,0.14)', marginBottom: spacing.sm }, eyebrow: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.8 }, title: { color: palette.text, fontSize: 29, lineHeight: 35, fontWeight: '900', marginTop: 3 }, intro: { color: palette.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.xs }, pageBody: { gap: spacing.sm, marginTop: spacing.lg, paddingBottom: spacing.md },
  machineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choiceList: { gap: spacing.sm }, choice: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, padding: spacing.sm }, choiceCompact: { width: '48.3%', minHeight: 128, flexDirection: 'column', alignItems: 'flex-start' }, choiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.12)' }, choiceIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.12)' }, choiceIconActive: { backgroundColor: 'rgba(241,78,155,0.15)' }, choiceTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }, choiceDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, flex: { flex: 1 },
  optionalCard: { padding: spacing.sm, marginTop: spacing.sm, borderColor: 'rgba(78,217,232,0.3)' }, optionalRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, optionalTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' }, optionalText: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  infoCard: { padding: spacing.sm }, infoDanger: { borderColor: palette.danger, backgroundColor: 'rgba(255,107,131,0.08)' }, infoSuccess: { borderColor: 'rgba(80,210,160,0.45)' }, infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, infoNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelRaised }, infoNumberDanger: { backgroundColor: palette.danger }, infoNumberSuccess: { backgroundColor: palette.success }, infoNumberText: { color: palette.white, fontSize: 16, fontWeight: '900' }, infoTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }, infoDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  summaryCard: { padding: spacing.md, marginTop: spacing.sm }, summaryTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900', marginBottom: spacing.xs }, summaryLine: { color: palette.textMuted, fontSize: 15, lineHeight: 22 },
  timerHero: { minHeight: 150, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(78,217,232,0.4)' }, timerNumber: { color: palette.text, fontSize: 50, lineHeight: 58, fontWeight: '900', letterSpacing: -2 }, timerLabel: { color: palette.cyan, fontSize: 15, lineHeight: 21, fontWeight: '900' }, safetyNote: { color: palette.warning, fontSize: 14, lineHeight: 21, fontWeight: '700', padding: spacing.sm, borderRadius: radii.sm, backgroundColor: 'rgba(246,197,106,0.09)' },
  programCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: 'rgba(241,78,155,0.4)' }, programIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(241,78,155,0.14)' }, programName: { color: palette.text, fontSize: 23, lineHeight: 29, fontWeight: '900' }, programReason: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 }, timerMessage: { color: palette.cyan, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center' },
  guidanceCard: { padding: spacing.lg, alignItems: 'center', borderColor: 'rgba(78,217,232,0.4)' }, nextLabel: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.8 }, nextAction: { color: palette.text, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: spacing.xs, textAlign: 'center' }, subheading: { color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '900', marginTop: spacing.sm },
  completeCard: { padding: spacing.lg, alignItems: 'center', borderColor: 'rgba(80,210,160,0.45)' }, completeIcon: { width: 74, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.success }, completeTitle: { color: palette.text, fontSize: 23, lineHeight: 29, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm }, completeText: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginTop: 3 }, completeSummary: { width: '100%', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.border }, completeLine: { color: palette.text, fontSize: 15, lineHeight: 23, textTransform: 'capitalize' },
  footerSafe: { backgroundColor: 'rgba(8,12,31,0.98)', borderTopWidth: 1, borderTopColor: palette.border }, footer: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs }, footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, backButton: { minWidth: 96, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border }, backText: { color: palette.text, fontSize: 15, fontWeight: '800' }, nextWrap: { flex: 1 },
});
