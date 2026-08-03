import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { FooterCreamy, type TutorialAddition } from '@/src/components/tutorial/footer-creamy';
import { TutorialAmountEditor } from '@/src/components/tutorial/tutorial-amount-editor';
import { GlassCard, GradientButton, Icon, LoadingScreen, Screen, type IconName } from '@/src/components/ui';
import { machineById, machines } from '@/src/data/machines';
import { createFreezeTimer } from '@/src/domain/freeze-timer';
import { getPintFillState } from '@/src/domain/fill';
import { generateRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { CURRENT_ONBOARDING_VERSION, TUTORIAL_STAGES, fitTutorialBaseItems, normalizeTutorialDraft, tutorialBaseTemplates, tutorialItems, tutorialMixInItem, tutorialRecipePresentation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { scheduleFreezeReminder } from '@/src/services/freeze-reminder';
import { choosePintPhoto, type PintPhotoSource } from '@/src/services/pint-photo';
import { palette, radii, spacing } from '@/src/theme';
import type { Ingredient, RecipeIngredient, TutorialDraft, TutorialStage, TutorialTextureResult, UserSettings } from '@/src/types';

type Choice = { id: string; title: string; detail: string; icon: IconName; tone: 'pink' | 'lavender' | 'mint' | 'gold' };
type RemovedItem = { item: RecipeIngredient; fromBase: boolean };

const BASE_CHOICES: Choice[] = [
  { id: 'milk-2', title: '2% milk', detail: 'Familiar and forgiving', icon: 'cup-water', tone: 'pink' },
  { id: 'fairlife-2', title: 'Filtered milk', detail: 'More dairy protein', icon: 'arm-flex', tone: 'lavender' },
  { id: 'almond-milk', title: 'Almond milk', detail: 'Light and dairy-free', icon: 'leaf', tone: 'mint' },
  { id: 'soy-milk', title: 'Soy milk', detail: 'Thicker plant base', icon: 'sprout', tone: 'gold' },
];

const HELPER_CHOICES: Choice[] = [
  { id: 'jello-vanilla-zero', title: 'Pudding mix', detail: 'Easy body and flavor', icon: 'cup', tone: 'pink' },
  { id: 'cottage-cheese-low-fat', title: 'Cottage cheese', detail: 'Dense and creamy', icon: 'bowl-mix', tone: 'lavender' },
  { id: 'cream-cheese', title: 'Cream cheese', detail: 'Rich, smooth texture', icon: 'cheese', tone: 'gold' },
  { id: 'xanthan-gum', title: 'Xanthan gum', detail: 'A tiny amount goes far', icon: 'spoon-sugar', tone: 'mint' },
];

const SWEETENER_CHOICES: Choice[] = [
  { id: 'allulose', title: 'Allulose', detail: 'Softer lower-calorie freeze', icon: 'shaker-outline', tone: 'pink' },
  { id: 'sugar', title: 'Sugar', detail: 'Classic sweetness', icon: 'shaker', tone: 'lavender' },
  { id: 'brown-sugar', title: 'Brown sugar', detail: 'Caramel-like flavor', icon: 'shaker-outline', tone: 'gold' },
  { id: 'honey', title: 'Honey', detail: 'Warm liquid sweetness', icon: 'beehive-outline', tone: 'mint' },
];

const FLAVOR_CHOICES: Choice[] = [
  { id: 'strawberries', title: 'Strawberry', detail: 'Bright and beginner-friendly', icon: 'fruit-cherries', tone: 'pink' },
  { id: 'cocoa', title: 'Chocolate', detail: 'Deep cocoa flavor', icon: 'food-variant', tone: 'lavender' },
  { id: 'vanilla', title: 'Vanilla', detail: 'Simple and flexible', icon: 'flower-outline', tone: 'gold' },
  { id: 'banana', title: 'Banana', detail: 'Sweet with extra body', icon: 'food-apple-outline', tone: 'mint' },
];

const MIX_IN_CHOICES: Choice[] = [
  { id: 'cookie-pieces', title: 'Cookie pieces', detail: 'Crush before adding', icon: 'cookie-outline', tone: 'pink' },
  { id: 'dark-chocolate', title: 'Chocolate chips', detail: 'Chop into small pieces', icon: 'dots-grid', tone: 'lavender' },
  { id: 'cacao-nibs', title: 'Cacao nibs', detail: 'Small crunchy pieces', icon: 'seed-outline', tone: 'gold' },
];

const FILL_CHOICES: Choice[] = [
  { id: 'whey-vanilla', title: 'Protein scoop', detail: 'Adds protein and body', icon: 'arm-flex', tone: 'lavender' },
  { id: 'strawberries', title: 'More fruit', detail: 'Adds flavor and volume', icon: 'fruit-cherries', tone: 'pink' },
  { id: 'cottage-cheese-low-fat', title: 'Cottage cheese', detail: 'Adds creamy thickness', icon: 'bowl-mix', tone: 'gold' },
  { id: 'banana', title: 'Banana', detail: 'Adds sweetness and body', icon: 'food-apple-outline', tone: 'mint' },
];

const TEXTURE_CHOICES: (Choice & { id: TutorialTextureResult })[] = [
  { id: 'perfect', title: 'Looks perfect', detail: 'Smooth and scoopable', icon: 'check-circle-outline', tone: 'mint' },
  { id: 'powdery', title: 'Powdery', detail: 'Dry or crumbly', icon: 'cube-outline', tone: 'lavender' },
  { id: 'icy', title: 'Too icy', detail: 'Crunchy crystals', icon: 'snowflake-alert', tone: 'pink' },
  { id: 'chalky', title: 'Chalky', detail: 'Dry on the tongue', icon: 'blur', tone: 'gold' },
  { id: 'too-soft', title: 'Too soft', detail: 'Loose or melting', icon: 'ice-cream', tone: 'mint' },
];

const groupIds = {
  helper: HELPER_CHOICES.map((choice) => choice.id),
  sweetener: SWEETENER_CHOICES.map((choice) => choice.id),
  flavor: FLAVOR_CHOICES.map((choice) => choice.id),
};

export default function TutorialScreen() {
  const { ready, ingredients, recipes, settings, saveRecipe, updateSettings } = useApp();
  const [draft, setDraft] = useState<TutorialDraft>(() => normalizeTutorialDraft(settings.tutorialDraft));
  const [addition, setAddition] = useState<TutorialAddition>({ kind: 'liquid', nonce: 0 });
  const [editorId, setEditorId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemovedItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [timerMessage, setTimerMessage] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const initialized = useRef(false);
  const slide = useRef(new Animated.Value(0)).current;
  const undoOpacity = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const { width, height, fontScale } = useWindowDimensions();
  const compact = height < 720 || fontScale > 1.15;
  const animationDistance = Math.min(width, 560);

  useEffect(() => {
    if (!ready || initialized.current) return;
    setDraft(normalizeTutorialDraft(settings.tutorialDraft));
    initialized.current = true;
  }, [ready, settings.tutorialDraft]);

  useEffect(() => {
    if (!removed) return;
    undoOpacity.setValue(1);
    const animation = Animated.sequence([
      Animated.delay(3500),
      Animated.timing(undoOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished) setRemoved(null); });
    return () => animation.stop();
  }, [removed, undoOpacity]);

  const machine = machineById(draft.machineId);
  const items = useMemo(() => tutorialItems(draft, ingredients), [draft, ingredients]);
  const validation = useMemo(() => validateRecipe(items, ingredients, machine.id), [ingredients, items, machine.id]);
  const previewRecipe = useMemo(() => makeTutorialRecipe(draft, items, ingredients), [draft, ingredients, items]);
  const program = useMemo(() => recommendProgram(previewRecipe, machine.id), [machine.id, previewRecipe]);
  const mixIn = tutorialMixInItem(draft, ingredients);
  const mascotItems = mixIn && TUTORIAL_STAGES.indexOf(draft.stage) >= TUTORIAL_STAGES.indexOf('mix-ins') ? [...items, mixIn] : items;
  const mascotAmount = estimateVolumeMl(mascotItems);

  if (!ready) return <LoadingScreen />;

  const persist = (next: TutorialDraft, settingsPatch: Partial<UserSettings> = {}) => {
    setDraft(next);
    void updateSettings({ tutorialDraft: next, machineId: next.machineId, ...settingsPatch });
  };

  const patchDraft = (patch: Partial<TutorialDraft>) => persist({ ...draft, ...patch });
  const animateAddition = (kind: TutorialAddition['kind']) => setAddition((current) => ({ kind, nonce: current.nonce + 1 }));
  const settleWebFocus = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('#root *').forEach((element) => {
        if (element.scrollLeft || (element.scrollTop && getComputedStyle(element).overflow === 'hidden')) element.scrollTo(0, 0);
      });
    });
  };

  const transitionTo = (stage: TutorialStage, patch: Partial<TutorialDraft> = {}, settingsPatch: Partial<UserSettings> = {}) => {
    if (transitioning) return;
    settleWebFocus();
    const next = { ...draft, ...patch, stage };
    const direction = TUTORIAL_STAGES.indexOf(stage) >= TUTORIAL_STAGES.indexOf(draft.stage) ? 1 : -1;
    const commit = () => {
      setEditorId(null);
      persist(next, settingsPatch);
      slide.setValue(direction * animationDistance);
      if (reducedMotion || Platform.OS === 'web') {
        slide.setValue(0);
        setTransitioning(false);
      } else {
        Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setTransitioning(false));
      }
    };
    if (reducedMotion || Platform.OS === 'web') return commit();
    setTransitioning(true);
    Animated.timing(slide, { toValue: -direction * animationDistance, duration: 170, useNativeDriver: true }).start(commit);
  };

  const toggleDisclosure = (id: string) => {
    const open = draft.disclosures.includes(id);
    patchDraft({ disclosures: open ? draft.disclosures.filter((value) => value !== id) : [...draft.disclosures, id] });
  };

  const applyBaseTemplate = () => {
    const template = tutorialBaseTemplates(machine.capacityMl)[0];
    patchDraft({ baseItems: template.items.map((item) => ({ ...item })), manualAmountIds: draft.manualAmountIds.filter((id) => !BASE_CHOICES.some((choice) => choice.id === id)) });
    animateAddition('liquid');
  };

  const toggleBase = (id: string) => {
    const current = draft.baseItems.find((item) => item.ingredientId === id);
    if (current) {
      patchDraft({ baseItems: draft.baseItems.filter((item) => item.ingredientId !== id) });
      return;
    }
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    if (!ingredient) return;
    const amount = Math.max(60, Math.min(160, ingredient.defaultAmount));
    patchDraft({ baseItems: [...draft.baseItems, { ingredientId: id, amount, unit: 'ml' }] });
    animateAddition('liquid');
  };

  const toggleIngredient = (id: string, kind: TutorialAddition['kind']) => {
    const selected = draft.selectedIngredientIds.includes(id);
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    if (!ingredient) return;
    patchDraft({
      selectedIngredientIds: selected ? draft.selectedIngredientIds.filter((value) => value !== id) : [...draft.selectedIngredientIds, id],
      itemAmounts: selected ? draft.itemAmounts : { ...draft.itemAmounts, [id]: draft.itemAmounts[id] ?? ingredient.defaultAmount },
    });
    if (!selected) animateAddition(kind);
  };

  const addFillIngredient = (id: string, kind: TutorialAddition['kind']) => {
    if (draft.selectedIngredientIds.includes(id)) return;
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    if (!ingredient) return;
    const remaining = Math.max(1, machine.capacityMl - validation.estimatedVolumeMl - 20);
    const amount = Math.min(ingredient.defaultAmount, remaining);
    patchDraft({
      selectedIngredientIds: [...draft.selectedIngredientIds, id],
      itemAmounts: { ...draft.itemAmounts, [id]: amount },
    });
    animateAddition(kind);
  };

  const changeAmount = (id: string, amount: number, manual: boolean) => {
    if (amount <= 0) return removeIngredient(id);
    if (draft.baseItems.some((item) => item.ingredientId === id)) {
      patchDraft({
        baseItems: draft.baseItems.map((item) => item.ingredientId === id ? { ...item, amount } : item),
        manualAmountIds: manual ? [...new Set([...draft.manualAmountIds, id])] : draft.manualAmountIds.filter((value) => value !== id),
      });
      return;
    }
    patchDraft({
      itemAmounts: { ...draft.itemAmounts, [id]: amount },
      manualAmountIds: manual ? [...new Set([...draft.manualAmountIds, id])] : draft.manualAmountIds.filter((value) => value !== id),
    });
  };

  const removeIngredient = (id: string) => {
    settleWebFocus();
    const baseItem = draft.baseItems.find((item) => item.ingredientId === id);
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    const item = baseItem ?? (ingredient ? { ingredientId: id, amount: draft.itemAmounts[id] ?? ingredient.defaultAmount, unit: ingredient.defaultUnit } : null);
    if (!item) return;
    setRemoved({ item, fromBase: Boolean(baseItem) });
    const itemAmounts = { ...draft.itemAmounts };
    delete itemAmounts[id];
    patchDraft({
      baseItems: draft.baseItems.filter((candidate) => candidate.ingredientId !== id),
      selectedIngredientIds: draft.selectedIngredientIds.filter((value) => value !== id),
      itemAmounts,
      manualAmountIds: draft.manualAmountIds.filter((value) => value !== id),
    });
    setEditorId(null);
  };

  const undoRemove = () => {
    if (!removed) return;
    undoOpacity.stopAnimation();
    undoOpacity.setValue(1);
    if (removed.fromBase) patchDraft({ baseItems: [...draft.baseItems, removed.item] });
    else patchDraft({ selectedIngredientIds: [...new Set([...draft.selectedIngredientIds, removed.item.ingredientId])], itemAmounts: { ...draft.itemAmounts, [removed.item.ingredientId]: removed.item.amount } });
    setRemoved(null);
  };

  const addPintPhoto = async (source: PintPhotoSource) => {
    setBusy(true);
    setPhotoBusy(true);
    try {
      const photoUri = await choosePintPhoto(source);
      if (photoUri) {
        const next = { ...draft, photoUri };
        await updateSettings({ tutorialDraft: next, machineId: next.machineId });
        setDraft(next);
      }
    } catch (error) {
      Alert.alert('Could not add photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPhotoBusy(false);
      setBusy(false);
    }
  };

  const saveCurrentRecipe = async (source = draft) => {
    const currentItems = tutorialItems(source, ingredients);
    const recipe = makeTutorialRecipe(source, currentItems, ingredients);
    await saveRecipe(recipe);
    return recipe;
  };

  const freezeLater = async () => {
    setBusy(true);
    const recipe = await saveCurrentRecipe();
    setBusy(false);
    transitionTo('first-spin', { recipeId: recipe.id, freezeTimerStartedAt: null });
  };

  const startFreezeTimer = async () => {
    setBusy(true);
    const recipe = await saveCurrentRecipe();
    const timer = createFreezeTimer(recipe);
    const reminder = await scheduleFreezeReminder(timer).catch(() => ({ scheduled: false, notificationId: undefined, message: 'The in-app timer is active. A device reminder could not be scheduled.' }));
    setTimerMessage(reminder.message);
    setBusy(false);
    transitionTo('first-spin', { recipeId: recipe.id, freezeTimerStartedAt: timer.startedAt }, {
      activeFreezeTimer: { ...timer, notificationId: reminder.notificationId, notificationScheduled: reminder.scheduled },
      notifications: reminder.scheduled || settings.notifications,
    });
  };

  const finishTutorial = async () => {
    setBusy(true);
    try {
      const recipe = await saveCurrentRecipe();
      const finalDraft = { ...draft, stage: 'complete' as const, recipeId: recipe.id, photoUri: '' };
      await updateSettings({ tutorialDraft: finalDraft, machineId: finalDraft.machineId, onboarded: true, onboardingVersion: CURRENT_ONBOARDING_VERSION, firstPintCompleted: true });
      router.replace(`/recipe/${recipe.id}`);
    } catch (error) {
      Alert.alert('Could not save pint', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const stageIndex = TUTORIAL_STAGES.indexOf(draft.stage);
  const nextStage = TUTORIAL_STAGES[Math.min(TUTORIAL_STAGES.length - 1, stageIndex + 1)];
  const previousStage = TUTORIAL_STAGES[Math.max(0, stageIndex - 1)];
  const blocked = transitioning || busy
    || (draft.stage === 'base' && draft.baseItems.length === 0)
    || (draft.stage === 'blend' && validation.errors.length > 0)
    || (draft.stage === 'evaluate' && !draft.textureResult)
    || (draft.stage === 'respin' && !draft.finalTextureResult);
  const editorIngredient = editorId ? ingredients.find((ingredient) => ingredient.id === editorId) : undefined;
  const editorItem = editorId ? itemFor(draft, ingredients, editorId) : undefined;
  const editorIds = draft.stage === 'base'
    ? draft.baseItems.map((item) => item.ingredientId)
    : draft.stage === 'helper' || draft.stage === 'sweetener' || draft.stage === 'flavor'
      ? selectedFrom(draft, groupIds[draft.stage])
      : [];
  const editorIndex = editorId ? editorIds.indexOf(editorId) : -1;

  const handleBack = () => {
    if (editorId) {
      settleWebFocus();
      return setEditorId(null);
    }
    if (draft.stage === 'machine') return router.replace('/');
    transitionTo(previousStage);
  };

  const handleNext = () => {
    if (editorId) {
      settleWebFocus();
      return setEditorId(null);
    }
    if (draft.stage === 'complete') return void finishTutorial();
    transitionTo(nextStage);
  };

  const page = editorIngredient && editorItem ? (
    <FocusedAmountPage
      ingredient={editorIngredient}
      item={editorItem}
      settings={settings}
      compact={compact}
      recommendedAmount={recommendedAmount(editorIngredient.id, machine.capacityMl)}
      onChange={(amount, manual) => changeAmount(editorIngredient.id, amount, manual)}
      onRemove={() => removeIngredient(editorIngredient.id)}
      position={editorIndex + 1}
      total={editorIds.length}
      onPrevious={() => setEditorId(editorIds[Math.max(0, editorIndex - 1)])}
      onNext={() => setEditorId(editorIds[Math.min(editorIds.length - 1, editorIndex + 1)])}
    />
  ) : renderStage({
    draft,
    compact,
    ingredients,
    machine,
    items,
    validation,
    program,
    timerMessage,
    recipes,
    onMachine: (machineId) => patchDraft({ machineId }),
    onApplyBase: applyBaseTemplate,
    onToggleBase: toggleBase,
    onToggleIngredient: toggleIngredient,
    onAddFill: addFillIngredient,
    onEdit: (id) => {
      settleWebFocus();
      setEditorId(id);
    },
    onDisclosure: toggleDisclosure,
    onPatch: patchDraft,
    onMixIn: (mixInId) => {
      patchDraft({ mixInId });
      if (mixInId) animateAddition('mix-in');
    },
    onFit: () => patchDraft({ baseItems: fitTutorialBaseItems(draft, ingredients, machine.capacityMl) }),
    onTakePhoto: () => { void addPintPhoto('camera'); },
    onChoosePhoto: () => { void addPintPhoto('library'); },
    photoBusy,
  });

  return (
    <Screen scroll={false} resetKey={draft.stage} contentStyle={styles.content} footer={
      <TutorialFooter
        stage={draft.stage}
        busy={busy}
        disabled={blocked}
        amountMl={mascotAmount}
        capacityMl={machine.capacityMl}
        addition={addition}
        creamyEnabled={settings.creamyHelperEnabled}
        editorOpen={Boolean(editorId)}
        onBack={handleBack}
        onNext={handleNext}
        onFreezeNow={() => { void startFreezeTimer(); }}
        onFreezeLater={() => { void freezeLater(); }}
      />
    }>
      {!compact ? <Text style={styles.tutorialHeader}>Your first pint</Text> : null}
      <TutorialProgress stage={draft.stage} />
      <Animated.View key={draft.stage} style={[styles.animatedPage, Platform.OS === 'web' ? undefined : { transform: [{ translateX: slide }] }]}>{page}</Animated.View>
      {removed ? <Animated.View style={[styles.undo, { opacity: undoOpacity }]}><Pressable onPress={undoRemove} accessibilityRole="button" accessibilityLabel={`Undo removing ${ingredients.find((item) => item.id === removed.item.ingredientId)?.name ?? 'ingredient'}`} style={styles.undoButton}><Text style={styles.undoText}>Ingredient removed</Text><Text style={styles.undoAction}>Undo</Text></Pressable></Animated.View> : null}
    </Screen>
  );
}

type StageProps = {
  draft: TutorialDraft;
  compact: boolean;
  ingredients: Ingredient[];
  machine: ReturnType<typeof machineById>;
  items: RecipeIngredient[];
  validation: ReturnType<typeof validateRecipe>;
  program: ReturnType<typeof recommendProgram>;
  timerMessage: string;
  recipes: ReturnType<typeof useApp>['recipes'];
  onMachine: (id: string) => void;
  onApplyBase: () => void;
  onToggleBase: (id: string) => void;
  onToggleIngredient: (id: string, kind: TutorialAddition['kind']) => void;
  onAddFill: (id: string, kind: TutorialAddition['kind']) => void;
  onEdit: (id: string) => void;
  onDisclosure: (id: string) => void;
  onPatch: (patch: Partial<TutorialDraft>) => void;
  onMixIn: (id: string | null) => void;
  onFit: () => void;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  photoBusy: boolean;
};

function renderStage(props: StageProps) {
  const { draft, compact, ingredients, machine, items, validation, program, timerMessage, onMachine, onApplyBase, onToggleBase, onToggleIngredient, onAddFill, onEdit, onDisclosure, onPatch, onMixIn, onFit, onTakePhoto, onChoosePhoto, photoBusy } = props;
  const names = (ids: string[]) => ids.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', ');
  const disclose = (id: string) => draft.disclosures.includes(id);

  if (draft.stage === 'machine') {
    const open = disclose('machines');
    const otherChoices = machines.map((item, index) => ({ id: item.id, title: item.shortName, detail: item.subtitle, icon: index < 3 ? 'ice-cream' as IconName : 'cup' as IconName, tone: (['pink', 'lavender', 'mint', 'gold'][index % 4]) as Choice['tone'] }));
    const orderedChoices = [...otherChoices.filter((choice) => choice.id !== draft.machineId), ...otherChoices.filter((choice) => choice.id === draft.machineId)];
    return <Page icon="ice-cream" eyebrow="ONE QUICK SETUP" title="Which machine do you have?" intro="We use this only to choose compatible programs and the correct fill limit.">{open ? <><DisclosureButton label="Close machine choices" open onPress={() => onDisclosure('machines')} /><SmoothReveal><ChoicePager choices={orderedChoices} selected={[draft.machineId]} compact={compact} recommendedId={draft.machineId} onPress={onMachine} /></SmoothReveal></> : <><RecommendationCard title={machine.shortName} detail={machine.subtitle} action="Selected machine" active onPress={() => onDisclosure('machines')} /><DisclosureButton label="Choose a different machine" open={false} onPress={() => onDisclosure('machines')} /></>}</Page>;
  }

  if (draft.stage === 'base') {
    const selected = draft.baseItems.map((item) => item.ingredientId);
    const recommended = tutorialBaseTemplates(machine.capacityMl)[0].items;
    const recommendedDetail = `${Math.round(recommended[0].amount)} ml dairy milk + ${Math.round(recommended[1].amount)} ml almond milk`;
    const recommendedApplied = selected.includes('milk-2') && selected.includes('almond-milk');
    const open = disclose('base-options');
    const choices = [...BASE_CHOICES, { id: 'recommended-base', title: 'Balanced and light', detail: recommendedDetail, icon: 'creation' as IconName, tone: 'pink' as const }];
    return <Page icon="cup-water" eyebrow="STEP 1 · BASE" title="Start with your milk" intro="Use our easiest blend or combine any bases you like.">{open ? <><DisclosureButton label="Close base choices" open onPress={() => onDisclosure('base-options')} /><SmoothReveal><ChoicePager choices={choices} selected={[...selected, ...(recommendedApplied ? ['recommended-base'] : [])]} compact={compact} multi recommendedId="recommended-base" onPress={(id) => id === 'recommended-base' ? onApplyBase() : onToggleBase(id)} /></SmoothReveal></> : <><RecommendationCard title="Balanced and light" detail={recommendedDetail} action={recommendedApplied ? 'Recommended base added' : 'Use this base'} active={recommendedApplied} onPress={onApplyBase} /><DisclosureButton label="Other base choices" open={false} onPress={() => onDisclosure('base-options')} /></>}<AdjustButton ids={selected} label={selected.length ? `${selected.length} base${selected.length === 1 ? '' : 's'} selected` : 'No base selected'} names={names(selected)} onPress={() => selected[0] && onEdit(selected[0])} /></Page>;
  }

  if (draft.stage === 'helper') return <IngredientStage draft={draft} compact={compact} title="Add creamy texture" eyebrow="STEP 2 · TEXTURE" intro="Pudding mix is the easiest starting point. This step is optional." recommendedId="jello-vanilla-zero" recommendedTitle="Vanilla pudding mix" recommendedDetail="Adds body with one small measured amount" choices={HELPER_CHOICES} group={groupIds.helper} kind="spoon" ingredients={ingredients} onToggle={onToggleIngredient} onEdit={onEdit} onDisclosure={onDisclosure} />;
  if (draft.stage === 'sweetener') return <IngredientStage draft={draft} compact={compact} title="Choose your sweetness" eyebrow="STEP 3 · SWEETENER" intro="Sweetener also affects how hard the pint freezes." recommendedId="allulose" recommendedTitle="Allulose" recommendedDetail="A softer freeze with fewer calories" choices={SWEETENER_CHOICES} group={groupIds.sweetener} kind="spoon" ingredients={ingredients} onToggle={onToggleIngredient} onEdit={onEdit} onDisclosure={onDisclosure} />;
  if (draft.stage === 'flavor') return <IngredientStage draft={draft} compact={compact} title="Make it taste good" eyebrow="STEP 4 · FLAVOR" intro="Strawberry is forgiving, but you can combine flavors." recommendedId="strawberries" recommendedTitle="Strawberry" recommendedDetail="Bright fruit that blends smoothly" choices={FLAVOR_CHOICES} group={groupIds.flavor} kind="fruit" ingredients={ingredients} onToggle={onToggleIngredient} onEdit={onEdit} onDisclosure={onDisclosure} />;

  if (draft.stage === 'blend') {
    const fill = getPintFillState(validation.estimatedVolumeMl, machine.capacityMl);
    const hasRoom = fill.percent < 88 && !validation.errors.length;
    const fillOpen = disclose('fill-options');
    const remaining = Math.max(0, machine.capacityMl - validation.estimatedVolumeMl);
    return <Page icon="blender" eyebrow="MIX + CHECK" title="Blend until completely smooth" intro="Creamy shows the estimated level before anything goes into the freezer."><GlassCard style={[styles.fillCard, fill.status === 'overflow' && styles.dangerCard]}><View style={styles.fillTop}><View><Text style={styles.fillAmount}>{validation.estimatedVolumeMl} ml</Text><Text style={styles.fillLabel}>estimated fill</Text></View><View style={[styles.fillBadge, fill.status === 'overflow' && styles.fillBadgeDanger]}><Text style={styles.fillBadgeText}>{fill.status === 'overflow' ? 'TOO FULL' : `${fill.percent}%`}</Text></View></View><View style={styles.fillTrack}><View style={[styles.fillProgress, { width: `${fill.visualPercent}%` }, fill.status === 'overflow' && styles.fillProgressDanger]} /></View><Text style={styles.fillGuidance}>{fill.guidance}</Text></GlassCard>{validation.errors.length ? <GradientButton title="Fit this container" icon="arrow-collapse" onPress={onFit} /> : null}{hasRoom ? <>{fillOpen ? <><DisclosureButton label="Close add-ins" open onPress={() => onDisclosure('fill-options')} /><SmoothReveal><Text style={styles.roomText}>About {remaining} ml remains below the fill line.</Text><ChoicePager choices={FILL_CHOICES} selected={selectedFrom(draft, FILL_CHOICES.map((choice) => choice.id))} compact={compact} multi onPress={(id) => onAddFill(id, id === 'strawberries' || id === 'banana' ? 'fruit' : 'spoon')} /></SmoothReveal></> : <DisclosureButton label="There is room — add something" open={false} onPress={() => onDisclosure('fill-options')} />}</> : null}<DisclosureButton label="See what you added" open={disclose('blend-summary')} onPress={() => onDisclosure('blend-summary')} />{disclose('blend-summary') ? <SmoothReveal><Text style={styles.summaryText}>{items.map((item) => ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name).filter(Boolean).join(' · ')}</Text></SmoothReveal> : null}</Page>;
  }

  if (draft.stage === 'freeze') return <Page icon="snowflake" eyebrow="FREEZE FLAT" title="Freeze for 24 hours" intro="Put the storage lid on and keep the pint upright on a level shelf."><GlassCard style={styles.timerHero}><Text style={styles.timerNumber}>24:00</Text><Text style={styles.timerLabel}>hours before the first spin</Text></GlassCard><DisclosureButton label="Why a full 24 hours?" open={disclose('freeze-why')} onPress={() => onDisclosure('freeze-why')} />{disclose('freeze-why') ? <Text style={styles.detailText}>A pint can feel frozen on the outside while the center is still too warm. Do not process a pint that froze at an angle.</Text> : null}</Page>;

  if (draft.stage === 'first-spin') {
    const displayTime = `${String(draft.spinMinutes).padStart(2, '0')}:00`;
    return <Page icon="record-circle-outline" eyebrow="FIRST SPIN" title={`Press ${program.program.name}`} intro="Set the guide timer, start the machine program, then check the texture."><View style={styles.spinPanel}><Text style={styles.lcdLabel}>GUIDE TIMER</Text><View style={styles.lcdRow}><Pressable onPress={() => onPatch({ spinMinutes: Math.max(1, draft.spinMinutes - 1) })} disabled={draft.spinMinutes <= 1} accessibilityRole="button" accessibilityLabel="Decrease spin timer by one minute" style={[styles.lcdButton, draft.spinMinutes <= 1 && styles.disabled]}><Icon name="minus" size={28} color={palette.cyan} /></Pressable><View style={styles.lcdDisplay}><Text style={styles.lcdDigits}>{displayTime}</Text><Text style={styles.lcdUnit}>MIN : SEC</Text></View><Pressable onPress={() => onPatch({ spinMinutes: Math.min(10, draft.spinMinutes + 1) })} disabled={draft.spinMinutes >= 10} accessibilityRole="button" accessibilityLabel="Increase spin timer by one minute" style={[styles.lcdButton, draft.spinMinutes >= 10 && styles.disabled]}><Icon name="plus" size={28} color={palette.cyan} /></Pressable></View><Text style={styles.lcdNote}>Your machine controls its actual cycle. This adjustable timer is only a visual guide.</Text></View><GlassCard style={styles.programCompact}><View style={styles.programIconSmall}><Icon name="tune-vertical" size={28} color={palette.pink} /></View><View style={styles.flex}><Text style={styles.programName}>{program.program.name}</Text><Text style={styles.programReason}>{program.reason}</Text></View></GlassCard>{timerMessage ? <Text style={styles.detailText}>{timerMessage}</Text> : null}<DisclosureButton label="Machine steps" open={disclose('spin-steps')} onPress={() => onDisclosure('spin-steps')} />{disclose('spin-steps') ? <SmoothReveal><Text style={styles.detailText}>Install the pint in the outer container, lock it in place, press the recommended program, and wait for the cycle to finish before opening it.</Text></SmoothReveal> : null}</Page>;
  }

  if (draft.stage === 'evaluate') {
    const other = TEXTURE_CHOICES.filter((choice) => choice.id !== 'perfect');
    const open = disclose('texture-options');
    const toggleResult = (id: string) => onPatch({ textureResult: draft.textureResult === id ? null : id as TutorialTextureResult });
    return <Page icon="eye-outline" eyebrow="FIRST RESULT" title="How did the first spin turn out?" intro="Choose the closest answer. Tap the selected answer again to clear it.">{open ? <><DisclosureButton label="Close texture choices" open onPress={() => onDisclosure('texture-options')} /><SmoothReveal><ChoicePager choices={[...other, TEXTURE_CHOICES[0]]} selected={draft.textureResult ? [draft.textureResult] : []} compact={compact} recommendedId="perfect" onPress={toggleResult} /></SmoothReveal></> : <><RecommendationCard title="Looks perfect" detail="Smooth, creamy, and ready to scoop" action={draft.textureResult === 'perfect' ? 'Selected · tap to clear' : 'Choose this'} active={draft.textureResult === 'perfect'} onPress={() => toggleResult('perfect')} /><DisclosureButton label="Choose a texture problem" open={false} onPress={() => onDisclosure('texture-options')} /></>}</Page>;
  }

  if (draft.stage === 'mix-ins') {
    const selected = draft.mixInId ? [draft.mixInId] : ['no-mix-ins'];
    const open = disclose('mix-in-options');
    const choices = [...MIX_IN_CHOICES, { id: 'no-mix-ins', title: 'No mix-ins', detail: 'Keep the texture as-is', icon: 'check-circle-outline' as IconName, tone: 'mint' as const }];
    return <Page icon="cookie-outline" eyebrow="OPTIONAL MIX-INS" title="Want chunks or crunch?" intro={draft.mixInId ? 'Add one small handful, make a hole in the center, then press the Mix-In button once.' : 'Skip this when you like the pint exactly as it is.'}>{open ? <><DisclosureButton label="Close mix-in choices" open onPress={() => onDisclosure('mix-in-options')} /><SmoothReveal><ChoicePager choices={choices} selected={selected} compact={compact} recommendedId="no-mix-ins" onPress={(id) => onMixIn(id === 'no-mix-ins' ? null : id)} /></SmoothReveal></> : <><RecommendationCard title="No mix-ins" detail="Scoop the pint exactly as it is" action={!draft.mixInId ? 'Selected' : 'Choose no mix-ins'} active={!draft.mixInId} onPress={() => onMixIn(null)} /><DisclosureButton label="Show mix-in choices" open={false} onPress={() => onDisclosure('mix-in-options')} /></>}{draft.mixInId ? <View style={styles.mixInstruction}><Icon name="gesture-tap-button" color={palette.cyan} /><Text style={styles.mixInstructionText}>Small handful added? Press Mix-In once.</Text></View> : null}</Page>;
  }

  if (draft.stage === 'respin') {
    const finalGuidance = draft.finalTextureResult ? tutorialTextureGuidance[draft.finalTextureResult] : null;
    const toggleResult = (id: string) => onPatch({ finalTextureResult: draft.finalTextureResult === id ? null : id as TutorialTextureResult });
    return <Page icon="eye-outline" eyebrow="FINAL TEXTURE CHECK" title="How did it come out?" intro="Choose what you see now. Tap the selected answer again to clear it."><ChoicePager choices={TEXTURE_CHOICES} selected={draft.finalTextureResult ? [draft.finalTextureResult] : []} compact={compact} recommendedId="perfect" onPress={toggleResult} />{draft.finalTextureResult && draft.finalTextureResult !== 'perfect' && finalGuidance ? <GlassCard style={styles.troubleshootCard}><Text style={styles.nextLabel}>TRY THIS NEXT</Text><Text style={styles.troubleshootAction}>{finalGuidance.next}</Text><Text style={styles.troubleshootDetail}>{correctionDetail(draft.finalTextureResult)}</Text></GlassCard> : draft.finalTextureResult === 'perfect' ? <Text style={styles.perfectNote}>Perfect — stop processing and enjoy it.</Text> : null}</Page>;
  }

  const presentation = tutorialRecipePresentation(draft);
  return <Page icon="party-popper" eyebrow="CONGRATULATIONS!" title="Your pint is complete" intro="Save a photo with the recipe, or continue without one."><View style={styles.photoCard}>{draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={styles.pintPhoto} accessibilityLabel="Your finished pint photo" /> : <LinearGradient colors={['rgba(241,78,155,0.28)', 'rgba(78,217,232,0.16)']} style={styles.photoPlaceholder}>{photoBusy ? <ActivityIndicator color={palette.cyan} size="large" /> : <Icon name="camera-plus-outline" size={52} color={palette.white} />}<Text style={styles.celebrationTitle}>{photoBusy ? 'Preparing photo…' : presentation.name}</Text></LinearGradient>}<Text style={styles.celebrationCopy}>{photoBusy ? 'Compressing and saving your photo' : draft.photoUri ? 'Photo added to your saved recipe' : props.recipes.some((recipe) => recipe.id === draft.recipeId) ? 'Recipe saved locally' : 'Ready to save locally'}</Text></View><View style={styles.photoActions}><Pressable disabled={photoBusy} onPress={onTakePhoto} accessibilityRole="button" style={[styles.photoAction, photoBusy && styles.disabled]}><Icon name="camera-outline" color={palette.cyan} /><Text style={styles.photoActionText}>{photoBusy ? 'Adding…' : draft.photoUri ? 'Retake' : 'Take photo'}</Text></Pressable><Pressable disabled={photoBusy} onPress={onChoosePhoto} accessibilityRole="button" style={[styles.photoAction, photoBusy && styles.disabled]}><Icon name="image-outline" color={palette.lavender} /><Text style={styles.photoActionText}>{photoBusy ? 'Please wait' : 'Choose photo'}</Text></Pressable></View></Page>;
}

function IngredientStage({ draft, compact, title, eyebrow, intro, recommendedId, recommendedTitle, recommendedDetail, choices, group, kind, ingredients, onToggle, onEdit, onDisclosure }: {
  draft: TutorialDraft; compact: boolean; title: string; eyebrow: string; intro: string; recommendedId: string; recommendedTitle: string; recommendedDetail: string; choices: Choice[]; group: string[]; kind: TutorialAddition['kind']; ingredients: Ingredient[]; onToggle: (id: string, kind: TutorialAddition['kind']) => void; onEdit: (id: string) => void; onDisclosure: (id: string) => void;
}) {
  const selected = selectedFrom(draft, group);
  const disclosureId = `${draft.stage}-options`;
  const open = draft.disclosures.includes(disclosureId);
  const names = selected.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', ');
  const orderedChoices = [...choices.filter((choice) => choice.id !== recommendedId), ...choices.filter((choice) => choice.id === recommendedId)];
  return <Page icon={choices[0].icon} eyebrow={eyebrow} title={title} intro={intro}>{open ? <><DisclosureButton label="Close other choices" open onPress={() => onDisclosure(disclosureId)} /><SmoothReveal><ChoicePager choices={orderedChoices} selected={selected} compact={compact} multi recommendedId={recommendedId} onPress={(id) => onToggle(id, kind)} /></SmoothReveal></> : <><RecommendationCard title={recommendedTitle} detail={recommendedDetail} action={selected.includes(recommendedId) ? 'Recommended added' : 'Use recommendation'} active={selected.includes(recommendedId)} onPress={() => { if (!selected.includes(recommendedId)) onToggle(recommendedId, kind); }} /><DisclosureButton label="Other choices" open={false} onPress={() => onDisclosure(disclosureId)} /></>}{selected.length ? <AdjustButton ids={selected} label={`${selected.length} selected`} names={names} onPress={() => onEdit(selected[0])} /> : <Text style={styles.optionalHint}>Optional · tap Continue to skip</Text>}</Page>;
}

function FocusedAmountPage({ ingredient, item, settings, compact, recommendedAmount: amount, position, total, onChange, onRemove, onPrevious, onNext }: { ingredient: Ingredient; item: RecipeIngredient; settings: UserSettings; compact: boolean; recommendedAmount: number; position: number; total: number; onChange: (amount: number, manual: boolean) => void; onRemove: () => void; onPrevious: () => void; onNext: () => void }) {
  const pager = total > 1 ? <View style={styles.editorPager}><Pressable disabled={position <= 1} onPress={onPrevious} style={[styles.editorPagerButton, position <= 1 && styles.disabled]} accessibilityRole="button"><Text style={styles.editorPagerText}>Previous</Text></Pressable><Text style={styles.editorPagerCount}>{position} of {total}</Text><Pressable disabled={position >= total} onPress={onNext} style={[styles.editorPagerButton, position >= total && styles.disabled]} accessibilityRole="button"><Text style={styles.editorPagerText}>Next</Text></Pressable></View> : null;
  const editor = <TutorialAmountEditor item={item} ingredient={ingredient} settings={settings} recommendedAmount={amount} onChange={onChange} onRemove={onRemove} />;
  if (compact) return <View style={styles.compactEditorPage}><Text style={styles.compactEditorHint}>Type an amount or use minus and plus. Zero removes it.</Text>{pager}{editor}</View>;
  return <Page icon={ingredientIcon(ingredient)} eyebrow="ADJUST ONE INGREDIENT" title={ingredient.name} intro="Type an amount or use minus and plus. Reaching zero removes it.">{pager}{editor}<Text style={styles.detailText}>Amounts are stored in metric units, so changing the display unit never changes the recipe.</Text></Page>;
}

function Page({ icon, eyebrow, title, intro, children }: { icon: IconName; eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <View style={styles.page}><View style={styles.pageHeading}><View style={styles.pageIcon}><Icon name={icon} size={28} color={palette.pink} /></View><View style={styles.headingCopy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title} maxFontSizeMultiplier={1.35}>{title}</Text></View></View><Text style={styles.intro} maxFontSizeMultiplier={1.35}>{intro}</Text><View style={styles.pageBody}>{children}</View></View>;
}

function RecommendationCard({ title, detail, action, active, onPress }: { title: string; detail: string; action: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${title}. ${detail}. ${action}`} style={({ pressed }) => [styles.recommendation, active && styles.recommendationActive, pressed && styles.pressed]}><LinearGradient colors={active ? ['rgba(241,78,155,0.32)', 'rgba(174,134,255,0.20)'] : ['rgba(241,78,155,0.18)', 'rgba(174,134,255,0.10)']} style={StyleSheet.absoluteFill} /><View style={styles.recommendationIcon}><Icon name={active ? 'check-circle' : 'creation'} color={active ? palette.success : palette.pink} size={29} /></View><View style={styles.flex}><Text style={styles.recommendationTitle}>{title}</Text><Text style={styles.recommendationDetail}>{detail}</Text><Text style={styles.recommendationAction}>{action}</Text></View></Pressable>;
}

function DisclosureButton({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}><Icon name={open ? 'minus-circle-outline' : 'plus-circle-outline'} color={palette.cyan} /><Text style={styles.disclosureText}>{label}</Text></Pressable>;
}

function SmoothReveal({ children }: { children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [progress, reducedMotion]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>{children}</Animated.View>;
}

function ChoicePager({ choices, selected, compact, multi = false, recommendedId, onPress }: { choices: Choice[]; selected: string[]; compact: boolean; multi?: boolean; recommendedId?: string; onPress: (id: string) => void }) {
  const pageSize = compact ? 2 : 4;
  const [page, setPage] = useState(0);
  const orderedChoices = recommendedId
    ? [...choices.filter((choice) => choice.id !== recommendedId), ...choices.filter((choice) => choice.id === recommendedId)]
    : choices;
  const pages = Math.max(1, Math.ceil(orderedChoices.length / pageSize));
  const visible = orderedChoices.slice(page * pageSize, page * pageSize + pageSize);
  return <View style={styles.choicePager}><View style={styles.choiceGrid}>{visible.map((choice) => {
    const active = selected.includes(choice.id);
    return <Pressable key={choice.id} onPress={() => onPress(choice.id)} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={multi ? { checked: active } : { selected: active }} accessibilityLabel={`${choice.title}. ${choice.detail}${choice.id === recommendedId ? '. Recommended' : ''}`} style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.pressed]}><View style={[styles.choiceArt, toneStyle[choice.tone]]}><Icon name={choice.icon} size={31} color={active ? palette.white : palette.text} /></View>{choice.id === recommendedId ? <Text style={styles.choiceRecommended}>RECOMMENDED</Text> : null}<Text style={styles.choiceTitle}>{choice.title}</Text><Text style={styles.choiceDetail}>{choice.detail}</Text>{active ? <View style={styles.check}><Icon name="check" size={15} color={palette.ink} /></View> : null}</Pressable>;
  })}</View>{pages > 1 ? <View style={styles.pagerRow}><Pressable disabled={page === 0} onPress={() => setPage((value) => Math.max(0, value - 1))} style={[styles.pageButton, page === 0 && styles.disabled]} accessibilityRole="button"><Text style={styles.pageButtonText}>Previous</Text></Pressable><Text style={styles.pageCount}>{page + 1} of {pages}</Text><Pressable disabled={page === pages - 1} onPress={() => setPage((value) => Math.min(pages - 1, value + 1))} style={[styles.pageButton, page === pages - 1 && styles.disabled]} accessibilityRole="button"><Text style={styles.pageButtonText}>More</Text></Pressable></View> : null}</View>;
}

function AdjustButton({ ids, label, names, onPress }: { ids: string[]; label: string; names: string; onPress: () => void }) {
  return <Pressable disabled={!ids.length} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Adjust amounts. ${names}`} style={({ pressed }) => [styles.adjust, !ids.length && styles.disabled, pressed && styles.pressed]}><View style={styles.adjustIcon}><Icon name="tune-variant" color={palette.cyan} /></View><View style={styles.flex}><Text style={styles.adjustLabel}>{label}</Text><Text style={styles.adjustNames} numberOfLines={2}>{names || 'Choose at least one option'}</Text></View><Text style={styles.adjustAction}>Adjust amounts</Text></Pressable>;
}

function TutorialProgress({ stage }: { stage: TutorialStage }) {
  const index = TUTORIAL_STAGES.indexOf(stage);
  const phase = index <= 5 ? 'Prepare' : index === 6 ? 'Freeze' : index <= 11 ? 'Process' : 'Complete';
  return <View style={styles.progress}><View style={styles.progressTop}><Text style={styles.progressPhase}>{phase}</Text><Text style={styles.progressCount}>{index + 1} of {TUTORIAL_STAGES.length}</Text></View><View style={styles.dots}>{TUTORIAL_STAGES.map((value, dotIndex) => <View key={value} style={[styles.dot, dotIndex <= index && styles.dotActive]} />)}</View></View>;
}

function TutorialFooter({ stage, busy, disabled, amountMl, capacityMl, addition, creamyEnabled, editorOpen, onBack, onNext, onFreezeNow, onFreezeLater }: { stage: TutorialStage; busy: boolean; disabled: boolean; amountMl: number; capacityMl: number; addition: TutorialAddition; creamyEnabled: boolean; editorOpen: boolean; onBack: () => void; onNext: () => void; onFreezeNow: () => void; onFreezeLater: () => void }) {
  const title = editorOpen ? 'Done' : stage === 'base' && disabled ? 'Choose base' : stage === 'blend' && disabled ? 'Fix fill' : stage === 'freeze' ? busy ? 'Starting…' : 'Start timer' : stage === 'complete' ? busy ? 'Saving…' : 'Save pint' : 'Continue';
  const primaryAction = stage === 'freeze' ? onFreezeNow : onNext;
  return <SafeAreaView edges={['bottom']} style={styles.footerSafe}><View style={styles.footer}>{stage === 'freeze' ? <GradientButton title="I’ll come back later" variant="secondary" disabled={busy} onPress={onFreezeLater} /> : null}<View style={styles.footerRow}><View style={styles.footerSide}><Pressable onPress={onBack} disabled={busy} accessibilityRole="button" accessibilityLabel="Previous tutorial page" style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Icon name="arrow-left" /><Text style={styles.backText}>Back</Text></Pressable></View>{creamyEnabled ? <FooterCreamy amountMl={amountMl} capacityMl={capacityMl} addition={addition} /> : <View style={styles.mascotSpacer} />}<View style={styles.footerSide}><GradientButton title={title} icon={stage === 'freeze' ? 'timer-outline' : stage === 'complete' ? 'check' : 'arrow-right'} disabled={disabled} onPress={primaryAction} /></View></View></View></SafeAreaView>;
}

function selectedFrom(draft: TutorialDraft, ids: string[]) { return ids.filter((id) => draft.selectedIngredientIds.includes(id)); }

function itemFor(draft: TutorialDraft, ingredients: Ingredient[], id: string): RecipeIngredient | undefined {
  const base = draft.baseItems.find((item) => item.ingredientId === id);
  if (base) return base;
  const ingredient = ingredients.find((item) => item.id === id);
  if (!ingredient || !draft.selectedIngredientIds.includes(id)) return undefined;
  return { ingredientId: id, amount: draft.itemAmounts[id] ?? ingredient.defaultAmount, unit: ingredient.defaultUnit };
}

function recommendedAmount(id: string, capacityMl: number) {
  const template = tutorialBaseTemplates(capacityMl).flatMap((item) => item.items).find((item) => item.ingredientId === id);
  return template?.amount ?? (id === 'xanthan-gum' ? 0.25 : id === 'strawberries' ? 100 : id === 'allulose' ? 15 : id === 'jello-vanilla-zero' ? 3 : 30);
}

function ingredientIcon(ingredient: Ingredient): IconName {
  if (ingredient.category === 'base') return 'cup-water';
  if (ingredient.category === 'fruit') return 'fruit-cherries';
  if (ingredient.category === 'sweetener' || ingredient.category === 'stabilizer') return 'spoon-sugar';
  if (ingredient.category === 'mix-in') return 'cookie-outline';
  return 'food-variant';
}

function correctionDetail(result: TutorialTextureResult) {
  if (result === 'powdery') return 'A powdery first spin is common. Pack it down and Re-Spin once before considering a small amount of liquid.';
  if (result === 'chalky') return 'Dry powder can create chalkiness. Re-Spin now, then reduce powder or increase the liquid base next time.';
  if (result === 'icy') return 'Ice usually points to the base balance. Re-Spin once; review sweetener, milk solids, and stabilizer for the next pint.';
  if (result === 'too-soft') return 'Do not keep processing a melting pint. Freeze it until firm again.';
  return 'Once the texture is right, stop. Use Mix-In only if you want chunks folded through it.';
}

function makeTutorialRecipe(draft: TutorialDraft, items: RecipeIngredient[], ingredients: Ingredient[]) {
  const presentation = tutorialRecipePresentation(draft);
  const mixIn = tutorialMixInItem(draft, ingredients);
  const recipe = generateRecipe({ name: presentation.name, style: 'ice-cream', items: mixIn ? [...items, mixIn] : items, ingredients, existingId: draft.recipeId || undefined, imageKey: presentation.imageKey, photoUri: draft.photoUri });
  recipe.directions = [
    'Blend the base ingredients until completely smooth.',
    'Pour into the correct container without exceeding its MAX line.',
    'Freeze upright and level with the storage lid for at least 24 hours.',
    'Run the recommended first-spin program and inspect the texture.',
    draft.mixInId ? 'Make a hole with a spoon, add the mix-in, then run Mix-In once.' : 'If powdery or crumbly, pack it down and use Re-Spin once.',
  ];
  return recipe;
}

const toneStyle = StyleSheet.create({
  pink: { backgroundColor: 'rgba(241,78,155,0.34)' },
  lavender: { backgroundColor: 'rgba(174,134,255,0.34)' },
  mint: { backgroundColor: 'rgba(78,217,232,0.28)' },
  gold: { backgroundColor: 'rgba(246,197,106,0.28)' },
});

const styles = StyleSheet.create({
  content: { flex: 1, paddingBottom: 0 },
  animatedPage: { flex: 1, minHeight: 0 },
  tutorialHeader: { color: palette.text, fontSize: 17, lineHeight: 21, fontWeight: '800', textAlign: 'center', marginTop: 1 },
  progress: { marginTop: -2, marginBottom: spacing.xs },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPhase: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7 },
  progressCount: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 4, marginTop: 6 },
  dot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: palette.panelRaised },
  dotActive: { backgroundColor: palette.pink },
  page: { flex: 1, minHeight: 0 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pageIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(241,78,155,0.16)' },
  headingCopy: { flex: 1 },
  eyebrow: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7 },
  title: { color: palette.text, fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 1 },
  intro: { color: palette.textMuted, fontSize: 16, lineHeight: 22, marginTop: spacing.xs },
  pageBody: { flex: 1, minHeight: 0, gap: spacing.xs, marginTop: spacing.sm },
  flex: { flex: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.42 },
  recommendation: { minHeight: 92, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(241,78,155,0.52)', overflow: 'hidden', padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recommendationActive: { borderColor: palette.success },
  recommendationIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: 'rgba(9,13,32,0.42)', alignItems: 'center', justifyContent: 'center' },
  recommendationTitle: { color: palette.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  recommendationDetail: { color: palette.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 },
  recommendationAction: { color: palette.cyan, fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 4 },
  disclosure: { minHeight: 46, borderRadius: radii.md, backgroundColor: 'rgba(78,217,232,0.08)', borderWidth: 1, borderColor: 'rgba(78,217,232,0.30)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  disclosureText: { color: palette.cyan, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  choicePager: { gap: 6 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { width: '48.9%', minHeight: 98, padding: 9, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, overflow: 'hidden' },
  choiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.10)' },
  choiceArt: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  choiceTitle: { color: palette.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  choiceDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 17, marginTop: 1 },
  choiceRecommended: { color: palette.pink, fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
  check: { position: 'absolute', top: 8, right: 8, width: 23, height: 23, borderRadius: 12, backgroundColor: palette.success, alignItems: 'center', justifyContent: 'center' },
  pagerRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { minWidth: 80, minHeight: 40, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  pageButtonText: { color: palette.text, fontSize: 13, fontWeight: '900' },
  pageCount: { color: palette.textMuted, fontSize: 13, fontWeight: '800' },
  adjust: { minHeight: 62, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, padding: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  adjustIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(78,217,232,0.10)', alignItems: 'center', justifyContent: 'center' },
  adjustLabel: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  adjustNames: { color: palette.textMuted, fontSize: 13, lineHeight: 17, marginTop: 1 },
  adjustAction: { color: palette.cyan, fontSize: 13, fontWeight: '900' },
  optionalHint: { color: palette.textMuted, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', paddingVertical: spacing.xs },
  editorPager: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorPagerButton: { minWidth: 88, minHeight: 40, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  editorPagerText: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  editorPagerCount: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  compactEditorPage: { flex: 1, minHeight: 0, gap: spacing.xs },
  compactEditorHint: { color: palette.textMuted, fontSize: 14, lineHeight: 19, textAlign: 'center' },
  fillCard: { padding: spacing.md, borderColor: 'rgba(78,217,232,0.38)' },
  dangerCard: { borderColor: palette.danger },
  fillTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fillAmount: { color: palette.text, fontSize: 32, lineHeight: 38, fontWeight: '900' },
  fillLabel: { color: palette.textMuted, fontSize: 14, lineHeight: 19 },
  fillBadge: { paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: 'rgba(78,217,232,0.16)' },
  fillBadgeDanger: { backgroundColor: 'rgba(255,107,131,0.18)' },
  fillBadgeText: { color: palette.text, fontSize: 13, fontWeight: '900' },
  fillTrack: { height: 13, borderRadius: 7, overflow: 'hidden', backgroundColor: palette.panelRaised, marginTop: spacing.md },
  fillProgress: { height: '100%', borderRadius: 7, backgroundColor: palette.cyan },
  fillProgressDanger: { backgroundColor: palette.danger },
  fillGuidance: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  roomText: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  summaryText: { color: palette.text, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  timerHero: { minHeight: 158, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(78,217,232,0.42)', backgroundColor: 'rgba(78,217,232,0.07)' },
  timerNumber: { color: palette.text, fontSize: 52, lineHeight: 58, fontWeight: '900', letterSpacing: -2 },
  timerLabel: { color: palette.cyan, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  detailText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: spacing.xs },
  programCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: 'rgba(241,78,155,0.42)' },
  programIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: 'rgba(241,78,155,0.15)', alignItems: 'center', justifyContent: 'center' },
  programName: { color: palette.text, fontSize: 24, lineHeight: 29, fontWeight: '900' },
  programReason: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  spinPanel: { borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(78,217,232,0.42)', backgroundColor: '#070D18', padding: spacing.sm },
  lcdLabel: { color: palette.textMuted, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  lcdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: 5 },
  lcdButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(78,217,232,0.38)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111D2A' },
  lcdDisplay: { minWidth: 146, borderRadius: 10, borderWidth: 2, borderColor: '#284D4C', backgroundColor: '#071614', paddingHorizontal: spacing.sm, paddingVertical: 5, alignItems: 'center', shadowColor: '#63FFC9', shadowOpacity: 0.28, shadowRadius: 10 },
  lcdDigits: { color: '#8FFFD5', fontSize: 38, lineHeight: 42, fontWeight: '900', fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', web: 'monospace' }), letterSpacing: 3, textShadowColor: 'rgba(143,255,213,0.55)', textShadowRadius: 7 },
  lcdUnit: { color: '#559C84', fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1.2 },
  lcdNote: { color: palette.textMuted, fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  programCompact: { minHeight: 72, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(241,78,155,0.42)' },
  programIconSmall: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(241,78,155,0.15)', alignItems: 'center', justifyContent: 'center' },
  readyNote: { color: palette.cyan, fontSize: 14, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
  nextLabel: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.8 },
  respinText: { color: palette.text, fontSize: 20, lineHeight: 26, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm },
  mixInstruction: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.35)', backgroundColor: 'rgba(78,217,232,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  mixInstructionText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '900', textAlign: 'center' },
  troubleshootCard: { padding: spacing.sm, borderColor: 'rgba(246,197,106,0.42)' },
  troubleshootAction: { color: palette.text, fontSize: 18, lineHeight: 23, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  troubleshootDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  perfectNote: { color: palette.success, fontSize: 15, lineHeight: 20, fontWeight: '900', textAlign: 'center', paddingVertical: spacing.xs },
  celebration: { minHeight: 250, borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(241,78,155,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  celebrationIcon: { width: 112, height: 112, borderRadius: 40, backgroundColor: 'rgba(241,78,155,0.30)', alignItems: 'center', justifyContent: 'center' },
  celebrationTitle: { color: palette.text, fontSize: 24, lineHeight: 30, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
  celebrationCopy: { color: palette.cyan, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: spacing.xs },
  photoCard: { flex: 1, minHeight: 0, borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(241,78,155,0.40)', backgroundColor: palette.panelSoft, overflow: 'hidden', alignItems: 'center' },
  photoPlaceholder: { flex: 1, width: '100%', minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  pintPhoto: { flex: 1, width: '100%', minHeight: 150, resizeMode: 'cover' },
  photoActions: { flexDirection: 'row', gap: spacing.xs },
  photoAction: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.xs },
  photoActionText: { color: palette.text, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  undo: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.xs, minHeight: 48, borderRadius: radii.md, backgroundColor: '#263455', borderWidth: 1, borderColor: palette.border, overflow: 'hidden', zIndex: 20 },
  undoButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  undoText: { color: palette.text, fontSize: 14, fontWeight: '800' },
  undoAction: { color: palette.cyan, fontSize: 15, fontWeight: '900' },
  footerSafe: { backgroundColor: 'rgba(8,12,31,0.99)', borderTopWidth: 1, borderTopColor: palette.border },
  footer: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 6 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerSide: { flex: 1, minWidth: 0 },
  backButton: { width: '100%', minHeight: 52, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backText: { color: palette.text, fontSize: 15, fontWeight: '900' },
  mascotSpacer: { width: 82, minHeight: 100 },
});
