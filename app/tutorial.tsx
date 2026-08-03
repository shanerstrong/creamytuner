import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { FooterCreamy, type TutorialAddition } from '@/src/components/tutorial/footer-creamy';
import { TutorialAmountEditor } from '@/src/components/tutorial/tutorial-amount-editor';
import { GlassCard, GradientButton, Icon, LoadingScreen, Screen, SearchField, type IconName } from '@/src/components/ui';
import { machineById, machines } from '@/src/data/machines';
import { createFreezeTimer } from '@/src/domain/freeze-timer';
import { getPintFillState } from '@/src/domain/fill';
import { generateRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { CURRENT_ONBOARDING_VERSION, TUTORIAL_STAGES, fitTutorialBaseItems, normalizeTutorialDraft, tutorialBaseTemplates, tutorialItems, tutorialMixInItems, tutorialRecipePresentation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { scheduleFreezeReminder } from '@/src/services/freeze-reminder';
import { choosePintPhoto, type PintPhotoSource } from '@/src/services/pint-photo';
import { palette, radii, spacing } from '@/src/theme';
import type { Ingredient, IngredientCategory, RecipeIngredient, TutorialDraft, TutorialStage, TutorialTextureResult, Unit, UserSettings } from '@/src/types';

type Choice = { id: string; title: string; detail: string; icon: IconName; tone: 'pink' | 'lavender' | 'mint' | 'gold' };
type RemovedItem = { item: RecipeIngredient; fromBase: boolean };

const BASE_CHOICES: Choice[] = [
  { id: 'milk-2', title: '2% milk', detail: 'Familiar and forgiving', icon: 'cup-water', tone: 'pink' },
  { id: 'fairlife-2', title: 'Filtered milk', detail: 'More dairy protein', icon: 'arm-flex', tone: 'lavender' },
  { id: 'almond-milk', title: 'Almond milk', detail: 'Light and dairy-free', icon: 'leaf', tone: 'mint' },
  { id: 'soy-milk', title: 'Soy milk', detail: 'Thicker plant base', icon: 'sprout', tone: 'gold' },
];

const DIETARY_CHOICES: Choice[] = [
  { id: 'vegan', title: 'Vegan', detail: 'Plant-based ingredients only', icon: 'leaf', tone: 'mint' },
  { id: 'vegetarian', title: 'Vegetarian', detail: 'No meat or gelatin', icon: 'sprout', tone: 'lavender' },
  { id: 'dairy-free', title: 'Dairy-free', detail: 'Avoid milk-based ingredients', icon: 'cup-off-outline', tone: 'pink' },
  { id: 'gluten-free', title: 'Gluten-free', detail: 'Avoid wheat-based ingredients', icon: 'check-circle-outline', tone: 'gold' },
  { id: 'no-added-sugar', title: 'No added sugar', detail: 'Use unsweetened or alternative sweeteners', icon: 'shaker-outline', tone: 'pink' },
  { id: 'high-protein', title: 'High protein', detail: 'Prioritize protein-rich bases', icon: 'arm-flex', tone: 'lavender' },
  { id: 'high-carb', title: 'High carb', detail: 'Prioritize fruit and classic sugar', icon: 'fruit-cherries', tone: 'gold' },
  { id: 'high-fiber', title: 'High fiber', detail: 'Prioritize fruit and fiber-rich additions', icon: 'sprout', tone: 'mint' },
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
  { id: 'maple-syrup', title: 'Maple syrup', detail: 'Rich maple sweetness', icon: 'bottle-tonic-outline', tone: 'gold' },
  { id: 'erythritol', title: 'Erythritol', detail: 'Low-calorie with a cool finish', icon: 'shaker-outline', tone: 'lavender' },
  { id: 'monk-fruit', title: 'Monk fruit blend', detail: 'Check the package conversion', icon: 'leaf', tone: 'mint' },
  { id: 'stevia', title: 'Stevia blend', detail: 'Very sweet — use sparingly', icon: 'sprout', tone: 'pink' },
  { id: 'agave', title: 'Agave', detail: 'Smooth liquid sweetness', icon: 'water-outline', tone: 'gold' },
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
  { id: 'peanut-butter', title: 'Peanut butter', detail: 'Add small frozen dollops', icon: 'peanut-outline', tone: 'mint' },
  { id: 'graham-crumbs', title: 'Graham crumbs', detail: 'Fold in a small handful', icon: 'food-outline', tone: 'gold' },
  { id: 'coconut-flakes', title: 'Coconut flakes', detail: 'Use short, soft pieces', icon: 'leaf', tone: 'lavender' },
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
  const { ready, ingredients, recipes, settings, saveRecipe, updateSettings, addCustomIngredient } = useApp();
  const [draft, setDraft] = useState<TutorialDraft>(() => normalizeTutorialDraft(settings.tutorialDraft));
  const [addition, setAddition] = useState<TutorialAddition>({ kind: 'liquid', nonce: 0 });
  const [editorId, setEditorId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemovedItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [customCategory, setCustomCategory] = useState<IngredientCategory | null>(null);
  const [libraryCategory, setLibraryCategory] = useState<'all' | IngredientCategory | null>(null);
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
  const mixIns = tutorialMixInItems(draft, ingredients);
  const mascotItems = mixIns.length && TUTORIAL_STAGES.indexOf(draft.stage) >= TUTORIAL_STAGES.indexOf('mix-ins') ? [...items, ...mixIns] : items;
  const mascotAmount = estimateVolumeMl(mascotItems);

  if (!ready) return <LoadingScreen />;

  const persist = (next: TutorialDraft, settingsPatch: Partial<UserSettings> = {}) => {
    setDraft(next);
    void updateSettings({ tutorialDraft: next, machineId: next.machineId, ...settingsPatch });
  };

  const patchDraft = (patch: Partial<TutorialDraft>) => persist({ ...draft, ...patch });
  const animateAddition = (kind: TutorialAddition['kind']) => setAddition((current) => ({ kind, nonce: current.nonce + 1 }));
  const saveTutorialIngredient = async (ingredient: Ingredient) => {
    await addCustomIngredient(ingredient);
    if (ingredient.category === 'base') {
      patchDraft({ baseItems: [...draft.baseItems, { ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }] });
    } else {
      patchDraft({ selectedIngredientIds: [...new Set([...draft.selectedIngredientIds, ingredient.id])], itemAmounts: { ...draft.itemAmounts, [ingredient.id]: ingredient.defaultAmount } });
    }
    animateAddition(ingredient.category === 'fruit' ? 'fruit' : ingredient.category === 'mix-in' ? 'mix-in' : ingredient.category === 'base' ? 'liquid' : 'spoon');
    setCustomCategory(null);
  };
  const chooseTutorialIngredient = (ingredient: Ingredient) => {
    if (ingredient.category === 'base') {
      if (!draft.baseItems.some((item) => item.ingredientId === ingredient.id)) patchDraft({ baseItems: [...draft.baseItems, { ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }] });
    } else if (draft.stage === 'mix-ins' && ingredient.category === 'mix-in') {
      patchDraft({ mixInIds: draft.mixInIds.includes(ingredient.id) ? draft.mixInIds : [...draft.mixInIds, ingredient.id], mixInId: ingredient.id });
    } else if (!draft.selectedIngredientIds.includes(ingredient.id)) {
      patchDraft({ selectedIngredientIds: [...draft.selectedIngredientIds, ingredient.id], itemAmounts: { ...draft.itemAmounts, [ingredient.id]: ingredient.defaultAmount } });
    }
    animateAddition(ingredient.category === 'fruit' ? 'fruit' : ingredient.category === 'mix-in' ? 'mix-in' : ingredient.category === 'base' ? 'liquid' : 'spoon');
  };
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
    const templateIndex = draft.dietaryPreferences.includes('vegan') || draft.dietaryPreferences.includes('dairy-free') ? 2 : draft.dietaryPreferences.includes('high-protein') ? 1 : 0;
    const template = tutorialBaseTemplates(machine.capacityMl)[templateIndex];
    patchDraft({ baseItems: template.items.map((item) => ({ ...item })), manualAmountIds: draft.manualAmountIds.filter((id) => !BASE_CHOICES.some((choice) => choice.id === id)) });
    animateAddition('liquid');
  };

  const toggleDietary = (id: string) => {
    const values = draft.dietaryPreferences.includes(id as never)
      ? draft.dietaryPreferences.filter((value) => value !== id)
      : [...draft.dietaryPreferences, id as never];
    patchDraft({ dietaryPreferences: values });
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
    if (libraryCategory) return setLibraryCategory(null);
    if (customCategory) return setCustomCategory(null);
    if (editorId) {
      settleWebFocus();
      return setEditorId(null);
    }
    if (draft.stage === 'machine') return router.replace('/');
    transitionTo(previousStage);
  };

  const handleNext = () => {
    if (libraryCategory) return setLibraryCategory(null);
    if (customCategory) return setCustomCategory(null);
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
    onToggleDietary: toggleDietary,
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
      if (!mixInId) patchDraft({ mixInId: null, mixInIds: [] });
      else {
        const mixInIds = draft.mixInIds.includes(mixInId) ? draft.mixInIds.filter((id) => id !== mixInId) : [...draft.mixInIds, mixInId];
        patchDraft({ mixInId: mixInIds[0] ?? null, mixInIds });
        if (mixInIds.includes(mixInId)) animateAddition('mix-in');
      }
    },
    onFit: () => patchDraft({ baseItems: fitTutorialBaseItems(draft, ingredients, machine.capacityMl) }),
    onTakePhoto: () => { void addPintPhoto('camera'); },
    onChoosePhoto: () => { void addPintPhoto('library'); },
    onCustomIngredient: setCustomCategory,
    onViewMore: setLibraryCategory,
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
        editorOpen={Boolean(editorId || libraryCategory || customCategory)}
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
      {customCategory ? <TutorialCustomIngredient category={customCategory} onClose={() => setCustomCategory(null)} onSave={(ingredient) => { void saveTutorialIngredient(ingredient); }} /> : null}
      {libraryCategory ? <TutorialIngredientPicker category={libraryCategory} ingredients={ingredients} selectedIds={[...draft.baseItems.map((item) => item.ingredientId), ...draft.selectedIngredientIds, ...draft.mixInIds]} onSelect={chooseTutorialIngredient} onClose={() => setLibraryCategory(null)} onCustom={(category) => { setLibraryCategory(null); setCustomCategory(category); }} /> : null}
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
  onToggleDietary: (id: string) => void;
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
  onCustomIngredient: (category: IngredientCategory) => void;
  onViewMore: (category: 'all' | IngredientCategory) => void;
  photoBusy: boolean;
};

function renderStage(props: StageProps) {
  const { draft, compact, ingredients, machine, items, validation, program, timerMessage, onMachine, onToggleDietary, onApplyBase, onToggleBase, onToggleIngredient, onAddFill, onEdit, onDisclosure, onPatch, onMixIn, onFit, onTakePhoto, onChoosePhoto, onCustomIngredient, onViewMore, photoBusy } = props;
  const names = (ids: string[]) => ids.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', ');
  const disclose = (id: string) => draft.disclosures.includes(id);

  if (draft.stage === 'machine') {
    const open = disclose('machines');
    const otherChoices = machines.map((item, index) => ({ id: item.id, title: item.shortName, detail: item.subtitle, icon: index < 3 ? 'ice-cream' as IconName : 'cup' as IconName, tone: (['pink', 'lavender', 'mint', 'gold'][index % 4]) as Choice['tone'] }));
    const orderedChoices = [...otherChoices.filter((choice) => choice.id !== draft.machineId), ...otherChoices.filter((choice) => choice.id === draft.machineId)];
    return <Page icon="ice-cream" eyebrow="ONE QUICK SETUP" title="Which machine do you have?" intro="Choose one machine. We use it to set the correct fill line and program."><MachineChoiceGrid choices={orderedChoices} selected={draft.machineId} open={open} onOpen={() => onDisclosure('machines')} onSelect={onMachine} onClose={() => onDisclosure('machines')} /></Page>;
  }

  if (draft.stage === 'dietary') return <Page icon="leaf" eyebrow="OPTIONAL PREFERENCES" title="Any dietary preferences?" intro="Choose any that apply. Recommendations will follow them."><ChoicePager choices={DIETARY_CHOICES} selected={draft.dietaryPreferences} compact={compact} multi onPress={onToggleDietary} /><Text style={styles.optionalHint}>Optional · you can skip this</Text></Page>;

  if (draft.stage === 'base') {
    const selected = draft.baseItems.map((item) => item.ingredientId);
    const templateIndex = draft.dietaryPreferences.includes('vegan') || draft.dietaryPreferences.includes('dairy-free') ? 2 : draft.dietaryPreferences.includes('high-protein') ? 1 : 0;
    const recommendedTemplate = tutorialBaseTemplates(machine.capacityMl)[templateIndex];
    const recommended = recommendedTemplate.items;
    const recommendedDetail = `${Math.round(recommended[0].amount)} ml dairy milk + ${Math.round(recommended[1].amount)} ml almond milk`;
    const recommendedApplied = recommended.every((item) => selected.includes(item.ingredientId));
    const open = disclose('base-options');
    const choices = [...BASE_CHOICES, { id: 'recommended-base', title: recommendedTemplate.title, detail: recommendedDetail, icon: 'creation' as IconName, tone: 'pink' as const }];
    return <Page icon="cup-water" eyebrow="STEP 1 · BASE" title="Start with your milk" intro="Use our easiest blend or combine any bases you like.">{open ? <><DisclosureButton label="Close base choices" open onPress={() => onDisclosure('base-options')} /><SmoothReveal><ChoicePager choices={choices} selected={[...selected, ...(recommendedApplied ? ['recommended-base'] : [])]} compact={compact} multi recommendedId="recommended-base" onPress={(id) => id === 'recommended-base' ? onApplyBase() : onToggleBase(id)} /><LibraryActions category="base" onCustom={onCustomIngredient} onViewMore={onViewMore} /></SmoothReveal></> : <><RecommendationCard title={recommendedTemplate.title} detail={recommendedDetail} action={recommendedApplied ? 'Recommended base added' : 'Use this base'} active={recommendedApplied} onPress={onApplyBase} /><DisclosureButton label="Other base choices" open={false} onPress={() => onDisclosure('base-options')} /></>}<AdjustButton ids={selected} label={selected.length ? `${selected.length} base${selected.length === 1 ? '' : 's'} selected` : 'No base selected'} names={names(selected)} onPress={() => selected[0] && onEdit(selected[0])} /></Page>;
  }

  if (draft.stage === 'helper') return <IngredientStage draft={draft} compact={compact} title="Add creamy texture" eyebrow="STEP 2 · TEXTURE" intro="Pudding mix is the easiest starting point. This step is optional." recommendedId="jello-vanilla-zero" recommendedTitle="Vanilla pudding mix" recommendedDetail="Adds body with one small measured amount" choices={HELPER_CHOICES} group={groupIds.helper} kind="spoon" ingredients={ingredients} onToggle={onToggleIngredient} onEdit={onEdit} onDisclosure={onDisclosure} onCustom={onCustomIngredient} onViewMore={onViewMore} />;
  if (draft.stage === 'sweetener') { const noAddedSugar = draft.dietaryPreferences.includes('no-added-sugar'); return <IngredientStage draft={draft} compact={compact} title="Choose your sweetness" eyebrow="STEP 3 · SWEETENER" intro="Sweetener also affects how hard the pint freezes." recommendedId={noAddedSugar ? 'monk-fruit' : 'sugar'} recommendedTitle={noAddedSugar ? 'Monk fruit blend' : 'Sugar'} recommendedDetail={noAddedSugar ? 'Sweetness without added sugar' : 'Classic sweetness and scoopability'} choices={SWEETENER_CHOICES} group={groupIds.sweetener} kind="spoon" ingredients={ingredients} onToggle={onToggleIngredient} onEdit={onEdit} onDisclosure={onDisclosure} onCustom={onCustomIngredient} onViewMore={onViewMore} />; }
  if (draft.stage === 'flavor') return <IngredientStage draft={draft} compact={compact} title="Make it taste good" eyebrow="STEP 4 · FLAVOR" intro="Strawberry is forgiving, but you can combine flavors." recommendedId="strawberries" recommendedTitle="Strawberry" recommendedDetail="Bright fruit that blends smoothly" choices={FLAVOR_CHOICES} group={groupIds.flavor} kind="fruit" ingredients={ingredients} onToggle={onToggleIngredient} onEdit={onEdit} onDisclosure={onDisclosure} onCustom={onCustomIngredient} onViewMore={onViewMore} />;

  if (draft.stage === 'blend') {
    const fill = getPintFillState(validation.estimatedVolumeMl, machine.capacityMl);
    const hasRoom = fill.percent < 88 && !validation.errors.length;
    const fillOpen = disclose('fill-options');
    const remaining = Math.max(0, machine.capacityMl - validation.estimatedVolumeMl);
    return <Page icon="blender" eyebrow="MIX + CHECK" title="Blend until completely smooth" intro="Creamy shows the estimated level before anything goes into the freezer."><GlassCard style={[styles.fillCard, fill.status === 'overflow' && styles.dangerCard]}><View style={styles.fillTop}><View><Text style={styles.fillAmount}>{validation.estimatedVolumeMl} ml</Text><Text style={styles.fillLabel}>estimated fill</Text></View><View style={[styles.fillBadge, fill.status === 'overflow' && styles.fillBadgeDanger]}><Text style={styles.fillBadgeText}>{fill.status === 'overflow' ? 'TOO FULL' : `${fill.percent}%`}</Text></View></View><View style={styles.fillTrack}><View style={[styles.fillProgress, { width: `${fill.visualPercent}%` }, fill.status === 'overflow' && styles.fillProgressDanger]} /></View><Text style={styles.fillGuidance}>{fill.guidance}</Text></GlassCard>{validation.errors.length ? <GradientButton title="Fit this container" icon="arrow-collapse" onPress={onFit} /> : null}{hasRoom ? <>{fillOpen ? <><DisclosureButton label="Close add-ins" open onPress={() => onDisclosure('fill-options')} /><SmoothReveal><Text style={styles.roomText}>About {remaining} ml remains below the fill line.</Text><ChoicePager choices={FILL_CHOICES} selected={selectedFrom(draft, FILL_CHOICES.map((choice) => choice.id))} compact={compact} multi onPress={(id) => onAddFill(id, id === 'strawberries' || id === 'banana' ? 'fruit' : 'spoon')} /><LibraryActions category="all" onCustom={onCustomIngredient} onViewMore={onViewMore} /></SmoothReveal></> : <DisclosureButton label="There is room — add something" open={false} onPress={() => onDisclosure('fill-options')} />}</> : null}<DisclosureButton label="See what you added" open={disclose('blend-summary')} onPress={() => onDisclosure('blend-summary')} />{disclose('blend-summary') ? <SmoothReveal><Text style={styles.summaryText}>{items.map((item) => ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name).filter(Boolean).join(' · ')}</Text></SmoothReveal> : null}</Page>;
  }

  if (draft.stage === 'freeze') { const freezeOpen = disclose('freeze-why'); return <Page icon="snowflake" eyebrow="FREEZE FLAT" title="Freeze for 24 hours" intro="Put the storage lid on and keep the pint upright on a level shelf."><DisclosureButton label="Why a full 24 hours?" open={freezeOpen} onPress={() => onDisclosure('freeze-why')} /><CollapsibleInstructions open={freezeOpen} steps={['Blend the base completely smooth before freezing.', 'Seal the pint with its storage lid.', 'Keep the pint upright on a flat, level freezer shelf.', 'Freeze for the full 24 hours so the center becomes completely solid.', 'Before processing, confirm the surface is firm and did not freeze at an angle.', 'If the pint is tilted or partly soft, level it and continue freezing before using the machine.']} /></Page>; }

  if (draft.stage === 'first-spin') {
    const displayTime = `${String(draft.spinMinutes).padStart(2, '0')}:00`;
    const machineSteps = ['Remove the storage lid and confirm the frozen surface is level.', 'Place the pint in the outer container and install the paddle lid.', 'Lock the container into the machine.', `Press ${program.program.name}, then wait until the machine stops before opening it.`];
    const stepsOpen = disclose('spin-steps');
    return <Page icon="record-circle-outline" eyebrow="FIRST SPIN" title={`Press ${program.program.name}`} intro="Set the guide timer, start the machine program, then check the texture."><View style={styles.spinPanel}><Text style={styles.lcdLabel}>GUIDE TIMER</Text><View style={styles.lcdRow}><Pressable onPress={() => onPatch({ spinMinutes: Math.max(1, draft.spinMinutes - 1) })} disabled={draft.spinMinutes <= 1} accessibilityRole="button" accessibilityLabel="Decrease spin timer by one minute" style={[styles.lcdButton, draft.spinMinutes <= 1 && styles.disabled]}><Icon name="minus" size={24} color={palette.cyan} /></Pressable><View style={styles.lcdDisplay}><Text style={styles.lcdDigits}>{displayTime}</Text><Text style={styles.lcdUnit}>MIN : SEC</Text></View><Pressable onPress={() => onPatch({ spinMinutes: Math.min(10, draft.spinMinutes + 1) })} disabled={draft.spinMinutes >= 10} accessibilityRole="button" accessibilityLabel="Increase spin timer by one minute" style={[styles.lcdButton, draft.spinMinutes >= 10 && styles.disabled]}><Icon name="plus" size={24} color={palette.cyan} /></Pressable></View><Text style={styles.lcdNote}>Your machine controls its actual cycle. This adjustable timer is only a visual guide.</Text></View><GlassCard style={styles.programCompact}><View style={styles.programIconSmall}><Icon name="tune-vertical" size={28} color={palette.pink} /></View><View style={styles.flex}><Text style={styles.programName}>{program.program.name}</Text><Text style={styles.programReason}>{program.reason}</Text></View></GlassCard>{timerMessage ? <Text style={styles.detailText}>{timerMessage}</Text> : null}<DisclosureButton label="Machine steps" open={false} onPress={() => onDisclosure('spin-steps')} /><FullInstructionOverlay open={stepsOpen} label="Machine steps" steps={[...machineSteps, 'Remove the outer bowl only after the machine has stopped completely.', 'Open the pint and inspect the center and edges before deciding whether to Re-Spin.']} onClose={() => onDisclosure('spin-steps')} /></Page>;
  }

  if (draft.stage === 'evaluate') {
    const toggleResult = (id: string) => onPatch({ textureResult: draft.textureResult === id ? null : id as TutorialTextureResult });
    if (draft.textureResult && draft.textureResult !== 'perfect') return <TextureFixPage result={draft.textureResult} onLooksGood={() => onPatch({ textureResult: 'perfect' })} onChooseDifferent={() => onPatch({ textureResult: null })} />;
    return <Page icon="eye-outline" eyebrow="FIRST RESULT" title="How did the first spin turn out?" intro="Choose the closest answer. Tap the selected answer again to clear it."><TextureChoiceList selected={draft.textureResult} onPress={toggleResult} /></Page>;
  }

  if (draft.stage === 'mix-ins') {
    const selected = draft.mixInIds.length ? draft.mixInIds : ['no-mix-ins'];
    const open = disclose('mix-in-options');
    const choices = [...MIX_IN_CHOICES, { id: 'no-mix-ins', title: 'No mix-ins', detail: 'Keep the texture as-is', icon: 'check-circle-outline' as IconName, tone: 'mint' as const }];
    return <Page icon="cookie-outline" eyebrow="OPTIONAL MIX-INS" title="Want chunks or crunch?" intro={draft.mixInIds.length ? 'Add one small combined handful, make a hole in the center, then press the Mix-In button once.' : 'Skip this when you like the pint exactly as it is.'}>{open ? <><DisclosureButton label="Close mix-in choices" open onPress={() => onDisclosure('mix-in-options')} /><SmoothReveal><ChoicePager choices={choices} selected={selected} compact={compact} multi recommendedId="no-mix-ins" onPress={(id) => onMixIn(id === 'no-mix-ins' ? null : id)} /><LibraryActions category="mix-in" onCustom={onCustomIngredient} onViewMore={onViewMore} /></SmoothReveal></> : <><RecommendationCard title="No mix-ins" detail="Scoop the pint exactly as it is" action={!draft.mixInIds.length ? 'Selected' : 'Choose no mix-ins'} active={!draft.mixInIds.length} onPress={() => onMixIn(null)} /><DisclosureButton label="Show mix-in choices" open={false} onPress={() => onDisclosure('mix-in-options')} /></>}{draft.mixInIds.length ? <View style={styles.mixInstruction}><Icon name="gesture-tap-button" color={palette.cyan} /><Text style={styles.mixInstructionText}>{draft.mixInIds.length} mix-in{draft.mixInIds.length === 1 ? '' : 's'} selected. Add one small combined handful, then press Mix-In once.</Text></View> : null}</Page>;
  }

  if (draft.stage === 'respin') {
    const finalGuidance = draft.finalTextureResult ? tutorialTextureGuidance[draft.finalTextureResult] : null;
    const toggleResult = (id: string) => onPatch({ finalTextureResult: draft.finalTextureResult === id ? null : id as TutorialTextureResult });
    if (draft.finalTextureResult && draft.finalTextureResult !== 'perfect') return <TextureFixPage result={draft.finalTextureResult} onLooksGood={() => onPatch({ finalTextureResult: 'perfect' })} onChooseDifferent={() => onPatch({ finalTextureResult: null })} />;
    return <Page icon="eye-outline" eyebrow="FINAL TEXTURE CHECK" title="How did it come out?" intro="Choose what you see now. Tap the selected answer again to clear it."><TextureChoiceList selected={draft.finalTextureResult} onPress={toggleResult} />{draft.finalTextureResult && draft.finalTextureResult !== 'perfect' && finalGuidance ? <GlassCard style={styles.troubleshootCard}><Text style={styles.nextLabel}>TRY THIS NEXT</Text><Text style={styles.troubleshootAction}>{finalGuidance.next}</Text><Text style={styles.troubleshootDetail}>{correctionDetail(draft.finalTextureResult)}</Text></GlassCard> : draft.finalTextureResult === 'perfect' ? <Text style={styles.perfectNote}>Perfect — stop processing and enjoy it.</Text> : null}</Page>;
  }

  const presentation = tutorialRecipePresentation(draft);
  return <Page icon="party-popper" eyebrow="CONGRATULATIONS!" title="Your pint is complete" intro="Give it a name, save a photo, or continue without one."><TextInput value={draft.recipeName} onChangeText={(recipeName) => onPatch({ recipeName })} placeholder="Name this pint" placeholderTextColor={palette.textFaint} style={styles.recipeNameInput} accessibilityLabel="Recipe name" /><View style={styles.photoCard}>{draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={styles.pintPhoto} accessibilityLabel="Your finished pint photo" /> : <LinearGradient colors={['rgba(241,78,155,0.28)', 'rgba(78,217,232,0.16)']} style={styles.photoPlaceholder}>{photoBusy ? <ActivityIndicator color={palette.cyan} size="large" /> : <Icon name="camera-plus-outline" size={52} color={palette.white} />}<Text style={styles.celebrationTitle}>{photoBusy ? 'Preparing photo…' : presentation.name}</Text></LinearGradient>}<Text style={styles.celebrationCopy}>{photoBusy ? 'Compressing and saving your photo' : draft.photoUri ? 'Photo added to your saved recipe' : props.recipes.some((recipe) => recipe.id === draft.recipeId) ? 'Recipe saved locally' : 'Ready to save locally'}</Text></View><View style={styles.photoActions}><Pressable disabled={photoBusy} onPress={onTakePhoto} accessibilityRole="button" style={[styles.photoAction, photoBusy && styles.disabled]}><Icon name="camera-outline" color={palette.cyan} /><Text style={styles.photoActionText}>{photoBusy ? 'Adding…' : draft.photoUri ? 'Retake' : 'Take photo'}</Text></Pressable><Pressable disabled={photoBusy} onPress={onChoosePhoto} accessibilityRole="button" style={[styles.photoAction, photoBusy && styles.disabled]}><Icon name="image-outline" color={palette.lavender} /><Text style={styles.photoActionText}>{photoBusy ? 'Please wait' : 'Choose photo'}</Text></Pressable></View></Page>;
}

function IngredientStage({ draft, compact, title, eyebrow, intro, recommendedId, recommendedTitle, recommendedDetail, choices, group, kind, ingredients, onToggle, onEdit, onDisclosure, onCustom, onViewMore }: {
  draft: TutorialDraft; compact: boolean; title: string; eyebrow: string; intro: string; recommendedId: string; recommendedTitle: string; recommendedDetail: string; choices: Choice[]; group: string[]; kind: TutorialAddition['kind']; ingredients: Ingredient[]; onToggle: (id: string, kind: TutorialAddition['kind']) => void; onEdit: (id: string) => void; onDisclosure: (id: string) => void; onCustom: (category: IngredientCategory) => void; onViewMore: (category: 'all' | IngredientCategory) => void;
}) {
  const selected = selectedFrom(draft, group);
  const disclosureId = `${draft.stage}-options`;
  const open = draft.disclosures.includes(disclosureId);
  const names = selected.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', ');
  const orderedChoices = [...choices.filter((choice) => choice.id !== recommendedId), ...choices.filter((choice) => choice.id === recommendedId)];
  const category = ingredients.find((item) => item.id === recommendedId)?.category ?? 'all';
  return <Page icon={choices[0].icon} eyebrow={eyebrow} title={title} intro={intro}>{open ? <><DisclosureButton label="Close other choices" open onPress={() => onDisclosure(disclosureId)} /><SmoothReveal><ChoicePager choices={orderedChoices} selected={selected} compact={compact} multi recommendedId={recommendedId} onPress={(id) => onToggle(id, kind)} /><LibraryActions category={category} onCustom={onCustom} onViewMore={onViewMore} /></SmoothReveal></> : <><RecommendationCard title={recommendedTitle} detail={recommendedDetail} action={selected.includes(recommendedId) ? 'Recommended added' : 'Use recommendation'} active={selected.includes(recommendedId)} onPress={() => { if (!selected.includes(recommendedId)) onToggle(recommendedId, kind); }} /><DisclosureButton label="Other choices" open={false} onPress={() => onDisclosure(disclosureId)} /></>}{selected.length ? <AdjustButton ids={selected} label={`${selected.length} selected`} names={names} onPress={() => onEdit(selected[0])} /> : <Text style={styles.optionalHint}>Optional · tap Continue to skip</Text>}</Page>;
}

function LibraryActions({ category, onCustom, onViewMore }: { category: 'all' | IngredientCategory; onCustom: (category: IngredientCategory) => void; onViewMore: (category: 'all' | IngredientCategory) => void }) {
  return <View style={styles.libraryActions}><Text style={styles.libraryTitle}>Need something else?</Text><View style={styles.libraryButtons}><Pressable onPress={() => onViewMore(category)} accessibilityRole="button" accessibilityLabel="View more ingredients" style={styles.libraryButton}><Icon name="bookshelf" size={20} color={palette.cyan} /><Text style={styles.libraryButtonText}>View more</Text></Pressable><Pressable onPress={() => onCustom(category === 'all' ? 'flavoring' : category)} accessibilityRole="button" accessibilityLabel="Enter a custom ingredient" style={styles.libraryButton}><Icon name="pencil-plus-outline" size={20} color={palette.lavender} /><Text style={styles.libraryButtonText}>Enter my own</Text></Pressable></View></View>;
}

function TutorialCustomIngredient({ category, onClose, onSave }: { category: IngredientCategory; onClose: () => void; onSave: (ingredient: Ingredient) => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState<Unit>(category === 'base' ? 'ml' : category === 'fruit' ? 'g' : 'g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [sugar, setSugar] = useState('');
  const [fat, setFat] = useState('');
  const submit = () => {
    const referenceAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(referenceAmount) || referenceAmount <= 0) return;
    onSave({ id: `custom-${Date.now()}`, name: name.trim(), subtitle: 'Custom label data', category, defaultUnit: unit, defaultAmount: referenceAmount, referenceAmount, nutrition: { calories: Number(calories) || 0, protein: Number(protein) || 0, carbs: Number(carbs) || 0, sugar: Number(sugar) || 0, addedSugar: Number(sugar) || 0, fat: Number(fat) || 0, fiber: 0 }, isCustom: true });
  };
  return <View style={styles.customOverlay}><View style={styles.customSheet}><View style={styles.overlayHeading}><View><Text style={styles.eyebrow}>ADD TO THIS PINT</Text><Text style={styles.overlayTitle}>Enter your own</Text></View><Pressable onPress={onClose} style={styles.closeFix} accessibilityRole="button" accessibilityLabel="Close custom ingredient"><Icon name="close" color={palette.text} size={22} /></Pressable></View><ScrollView style={styles.customScroll} contentContainerStyle={styles.customContent}><TextInput value={name} onChangeText={setName} placeholder="Ingredient name" placeholderTextColor={palette.textFaint} style={styles.customInput} accessibilityLabel="Custom ingredient name" /><View style={styles.customUnits}>{(['g', 'ml', 'tsp'] as Unit[]).map((option) => <Pressable key={option} onPress={() => setUnit(option)} style={[styles.customUnit, unit === option && styles.customUnitActive]} accessibilityRole="radio" accessibilityState={{ selected: unit === option }}><Text style={styles.customUnitText}>{option}</Text></Pressable>)}</View><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Reference amount" placeholderTextColor={palette.textFaint} style={styles.customInput} accessibilityLabel="Custom ingredient reference amount" /><View style={styles.customNutrients}>{[['Calories', calories, setCalories], ['Protein g', protein, setProtein], ['Carbs g', carbs, setCarbs], ['Sugar g', sugar, setSugar], ['Fat g', fat, setFat]].map(([label, value, setter]) => <TextInput key={String(label)} value={String(value)} onChangeText={setter as (value: string) => void} keyboardType="decimal-pad" placeholder={String(label)} placeholderTextColor={palette.textFaint} style={styles.customNutrient} accessibilityLabel={String(label)} />)}</View><Text style={styles.customNote}>The tutorial will keep the Back, Creamy, and Continue controls visible.</Text><GradientButton title="Add to this pint" icon="plus" disabled={!name.trim()} onPress={submit} /></ScrollView></View></View>;
}

function TutorialIngredientPicker({ category, ingredients, selectedIds, onSelect, onClose, onCustom }: { category: 'all' | IngredientCategory; ingredients: Ingredient[]; selectedIds: string[]; onSelect: (ingredient: Ingredient) => void; onClose: () => void; onCustom: (category: IngredientCategory) => void }) {
  const [query, setQuery] = useState('');
  const visible = ingredients.filter((ingredient) => {
    const matchesCategory = category === 'all' || ingredient.category === category;
    const needle = query.trim().toLowerCase();
    return matchesCategory && (!needle || `${ingredient.name} ${ingredient.subtitle} ${ingredient.brand ?? ''}`.toLowerCase().includes(needle));
  });
  return <View style={styles.libraryOverlay}><View style={styles.librarySheet}><View style={styles.overlayHeading}><View><Text style={styles.eyebrow}>INGREDIENT LIBRARY</Text><Text style={styles.overlayTitle}>Add more ingredients</Text></View><Pressable onPress={onClose} style={styles.closeFix} accessibilityRole="button" accessibilityLabel="Close ingredient library"><Icon name="close" color={palette.text} size={22} /></Pressable></View><SearchField value={query} onChangeText={setQuery} placeholder="Search ingredients" /><Text style={styles.libraryScrollHint}>Scroll this list · tutorial controls stay below</Text><ScrollView style={styles.libraryScroll} contentContainerStyle={styles.libraryScrollContent} showsVerticalScrollIndicator persistentScrollbar>{visible.map((ingredient) => { const selected = selectedIds.includes(ingredient.id); return <Pressable key={ingredient.id} onPress={() => onSelect(ingredient)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${selected ? 'Added' : 'Add'} ${ingredient.name}`} style={[styles.pickerIngredient, selected && styles.pickerIngredientSelected]}><View style={styles.pickerIngredientIcon}><Icon name={ingredientIcon(ingredient)} color={selected ? palette.success : palette.lavender} /></View><View style={styles.flex}><Text style={styles.pickerIngredientName}>{ingredient.name}</Text><Text style={styles.pickerIngredientMeta}>{ingredient.subtitle || ingredient.category.replace('-', ' ')}</Text></View><Icon name={selected ? 'check-circle' : 'plus-circle-outline'} color={selected ? palette.success : palette.cyan} /></Pressable>; })}{!visible.length ? <Text style={styles.emptyLibrary}>No matching ingredients. Try another search.</Text> : null}<Pressable onPress={() => onCustom(category === 'all' ? 'flavoring' : category)} style={styles.inlineCustomButton} accessibilityRole="button"><Icon name="pencil-plus-outline" color={palette.lavender} /><Text style={styles.inlineCustomText}>Enter my own ingredient</Text></Pressable></ScrollView></View></View>;
}

function InstructionList({ steps }: { steps: string[] }) {
  return <GlassCard style={styles.instructionList}>{steps.map((step, index) => <View key={step} style={styles.instructionRow}><View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{index + 1}</Text></View><Text style={styles.instructionText}>{step}</Text></View>)}</GlassCard>;
}

function CollapsibleInstructions({ open, steps }: { open: boolean; steps: string[] }) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: reducedMotion ? 0 : 260, useNativeDriver: false }).start();
  }, [open, progress, reducedMotion]);
  return <Animated.View pointerEvents={open ? 'auto' : 'none'} style={{ overflow: 'hidden', opacity: progress, maxHeight: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 620] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}><ScrollView style={styles.inlineInstructionScroll} contentContainerStyle={styles.inlineInstructionContent} showsVerticalScrollIndicator><InstructionList steps={steps} /></ScrollView></Animated.View>;
}

function FullInstructionOverlay({ open, label, steps, onClose }: { open: boolean; label: string; steps: string[]; onClose: () => void }) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: reducedMotion ? 0 : 260, useNativeDriver: true }).start();
  }, [open, progress, reducedMotion]);
  return <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.fullInstructionOverlay, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}><DisclosureButton label={label} open onPress={onClose} /><ScrollView style={styles.overlayScroll} contentContainerStyle={styles.overlayScrollContent} showsVerticalScrollIndicator><InstructionList steps={steps} /><Text style={styles.overlayHint}>When the cycle stops, open the pint and continue to the texture check.</Text></ScrollView></Animated.View>;
}

function TextureChoiceList({ selected, onPress }: { selected: TutorialTextureResult | null; onPress: (id: string) => void }) {
  return <View style={styles.textureList} accessibilityRole="radiogroup">{TEXTURE_CHOICES.map((choice) => {
    const active = selected === choice.id;
    return <Pressable key={choice.id} onPress={() => onPress(choice.id)} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${choice.title}. ${choice.detail}${choice.id === 'perfect' ? '. Recommended' : ''}`} style={[styles.textureChoice, active && styles.textureChoiceActive]}><View style={[styles.textureIcon, toneStyle[choice.tone]]}><Icon name={choice.icon} size={23} color={active ? palette.white : palette.text} /></View><View style={styles.flex}><View style={styles.textureTitleRow}><Text style={styles.textureTitle}>{choice.title}</Text>{choice.id === 'perfect' ? <Text style={styles.textureRecommended}>RECOMMENDED</Text> : null}</View><Text style={styles.textureDetail}>{choice.detail}</Text></View>{active ? <Icon name="check-circle" size={22} color={palette.cyan} /> : null}</Pressable>;
  })}</View>;
}

function TextureFixPage({ result, onLooksGood, onChooseDifferent }: { result: TutorialTextureResult; onLooksGood: () => void; onChooseDifferent: () => void }) {
  const guidance = tutorialTextureGuidance[result];
  const steps = result === 'too-soft'
    ? ['Put the pint back in the freezer with the lid on.', 'Freeze it level until the surface is firm again.', 'Do not run another cycle while it is melting.']
    : ['Pack the surface down so the paddle can reach the mixture.', 'Run Re-Spin once using the machine controls.', result === 'icy' ? 'If it is still icy, review the base and sweetener balance before adding liquid.' : 'If it is still dry, add only a small splash of milk and Re-Spin once more.'];
  return <View style={styles.textureFixPage}><View style={styles.overlayHeading}><View><Text style={styles.eyebrow}>TEXTURE HELP</Text><Text style={styles.overlayTitle}>{guidance.title}</Text></View><Pressable onPress={onChooseDifferent} accessibilityRole="button" style={styles.closeFix}><Icon name="close" color={palette.text} size={22} /></Pressable></View><ScrollView style={styles.overlayScroll} contentContainerStyle={styles.overlayScrollContent} showsVerticalScrollIndicator><GlassCard style={styles.fixHero}><Icon name="auto-fix" color={palette.cyan} size={34} /><Text style={styles.fixHeroText}>{guidance.detail}</Text></GlassCard><Text style={styles.fixSectionTitle}>Try this first</Text><InstructionList steps={steps} /><GlassCard style={styles.friendHelp}><Icon name="account-group-outline" color={palette.lavender} size={28} /><View style={styles.flex}><Text style={styles.friendHelpTitle}>Need another opinion?</Text><Text style={styles.friendHelpText}>Ask a friend, or contact mshaner@shanerstrong.com for additional help.</Text></View></GlassCard><View style={styles.fixActions}><GradientButton title="Looks good now" icon="check" onPress={onLooksGood} /><Pressable onPress={onChooseDifferent} accessibilityRole="button" style={styles.secondaryFixAction}><Text style={styles.secondaryFixText}>Choose a different issue</Text></Pressable></View></ScrollView></View>;
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

function MachineChoiceGrid({ choices, selected, open, onOpen, onSelect, onClose }: { choices: Choice[]; selected: string; open: boolean; onOpen: () => void; onSelect: (id: string) => void; onClose: () => void }) {
  if (!open) return <><RecommendationCard title={choices.find((choice) => choice.id === selected)?.title ?? 'Choose your machine'} detail={choices.find((choice) => choice.id === selected)?.detail ?? ''} action="Selected machine" active onPress={onOpen} /><DisclosureButton label="Choose a different machine" open={false} onPress={onOpen} /></>;
  return <View style={styles.machineGridWrap}><DisclosureButton label="Close machine choices" open onPress={onClose} /><View style={styles.machineGrid}>{choices.map((choice) => <Pressable key={choice.id} onPress={() => onSelect(choice.id)} accessibilityRole="radio" accessibilityState={{ selected: selected === choice.id }} accessibilityLabel={`${choice.title}. ${choice.detail}`} style={[styles.machineChoice, selected === choice.id && styles.machineChoiceActive]}><View style={[styles.machineChoiceIcon, toneStyle[choice.tone]]}><Icon name={choice.icon} color={selected === choice.id ? palette.white : palette.text} size={25} /></View><Text style={styles.machineChoiceTitle}>{choice.title}</Text><Text style={styles.machineChoiceDetail}>{choice.detail}</Text>{selected === choice.id ? <View style={styles.machineCheck}><Icon name="check-circle" color={palette.success} size={18} /></View> : null}</Pressable>)}</View></View>;
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
  const mixIns = tutorialMixInItems(draft, ingredients);
  const recipe = generateRecipe({ name: presentation.name, style: 'ice-cream', items: mixIns.length ? [...items, ...mixIns] : items, ingredients, existingId: draft.recipeId || undefined, imageKey: presentation.imageKey, photoUri: draft.photoUri });
  recipe.directions = [
    'Blend the base ingredients until completely smooth.',
    'Pour into the correct container without exceeding its MAX line.',
    'Freeze upright and level with the storage lid for at least 24 hours.',
    'Run the recommended first-spin program and inspect the texture.',
    draft.mixInIds.length ? 'Make a hole with a spoon, add one small combined handful of mix-ins, then run Mix-In once.' : 'If powdery or crumbly, pack it down and use Re-Spin once.',
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
  machineGridWrap: { gap: spacing.xs },
  machineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  machineChoice: { width: '32%', minHeight: 104, padding: 7, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, alignItems: 'center' },
  machineChoiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.12)' },
  machineChoiceIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  machineChoiceTitle: { color: palette.text, fontSize: 13, lineHeight: 17, fontWeight: '900', textAlign: 'center' },
  machineChoiceDetail: { color: palette.textMuted, fontSize: 11, lineHeight: 14, textAlign: 'center', marginTop: 2 },
  machineCheck: { position: 'absolute', top: 5, right: 5 },
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
  libraryActions: { gap: 5, marginTop: 2 },
  libraryTitle: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  libraryButtons: { flexDirection: 'row', gap: spacing.xs },
  libraryButton: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.xs },
  libraryButtonText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  instructionList: { borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.28)', backgroundColor: 'rgba(78,217,232,0.06)', padding: spacing.md, gap: spacing.md },
  instructionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  instructionNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(78,217,232,0.18)', alignItems: 'center', justifyContent: 'center' },
  instructionNumberText: { color: palette.cyan, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  instructionText: { flex: 1, color: palette.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  inlineInstructionScroll: { maxHeight: 420 },
  inlineInstructionContent: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
  textureList: { gap: 4 },
  textureChoice: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, paddingVertical: 4 },
  textureChoiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.11)' },
  textureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  textureTitle: { color: palette.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  textureRecommended: { color: palette.success, fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 0.4 },
  textureDetail: { color: palette.textMuted, fontSize: 12, lineHeight: 16 },
  detailText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: spacing.xs },
  machineStepsOverlay: { flex: 1, minHeight: 0, backgroundColor: palette.ink, zIndex: 10, paddingTop: spacing.xs },
  fullInstructionOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 25, backgroundColor: palette.ink, gap: spacing.xs, paddingTop: spacing.xs },
  textureFixPage: { flex: 1, minHeight: 0, backgroundColor: palette.ink, zIndex: 10 },
  overlayHeading: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.border, paddingBottom: spacing.xs },
  overlayTitle: { color: palette.text, fontSize: 21, lineHeight: 26, fontWeight: '900', marginTop: 1 },
  closeFix: { width: 46, height: 46, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: palette.border },
  overlayScroll: { flex: 1, minHeight: 0 },
  overlayScrollContent: { paddingVertical: spacing.sm, gap: spacing.sm, paddingBottom: spacing.lg },
  overlayHint: { color: palette.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center', paddingHorizontal: spacing.sm },
  fixHero: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(78,217,232,0.38)' },
  fixHeroText: { flex: 1, color: palette.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  fixSectionTitle: { color: palette.cyan, fontSize: 15, lineHeight: 20, fontWeight: '900', letterSpacing: 0.5 },
  additionalAdvice: { padding: spacing.sm, borderColor: 'rgba(246,197,106,0.42)' },
  friendHelp: { padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(174,134,255,0.35)' },
  friendHelpTitle: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  friendHelpText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 2 },
  moreAdviceButton: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.30)', backgroundColor: 'rgba(78,217,232,0.08)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  moreAdviceText: { color: palette.cyan, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  fixActions: { gap: spacing.xs },
  secondaryFixAction: { minHeight: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised },
  secondaryFixText: { color: palette.textMuted, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  customOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, backgroundColor: 'rgba(5,9,24,0.96)', padding: spacing.sm },
  customSheet: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center', backgroundColor: palette.ink, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.sm },
  customScroll: { flex: 1 },
  customContent: { gap: spacing.sm, paddingVertical: spacing.sm, paddingBottom: spacing.lg },
  customInput: { minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 16 },
  customUnits: { flexDirection: 'row', gap: spacing.xs },
  customUnit: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft },
  customUnitActive: { borderColor: palette.pink, backgroundColor: 'rgba(241,78,155,0.14)' },
  customUnitText: { color: palette.text, fontSize: 15, fontWeight: '900' },
  customNutrients: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  customNutrient: { width: '48.5%', minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 14 },
  customNote: { color: palette.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  libraryOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 29, backgroundColor: 'rgba(5,9,24,0.98)', padding: spacing.sm },
  librarySheet: { flex: 1, minHeight: 0, maxWidth: 560, width: '100%', alignSelf: 'center', gap: spacing.xs },
  libraryScrollHint: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  libraryScroll: { flex: 1, minHeight: 0, borderTopWidth: 1, borderTopColor: palette.border },
  libraryScrollContent: { gap: spacing.xs, paddingVertical: spacing.xs, paddingBottom: spacing.lg },
  pickerIngredient: { minHeight: 58, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  pickerIngredientSelected: { borderColor: palette.success, backgroundColor: 'rgba(80,210,160,0.10)' },
  pickerIngredientIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(174,134,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  pickerIngredientName: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  pickerIngredientMeta: { color: palette.textMuted, fontSize: 13, lineHeight: 18, marginTop: 1 },
  emptyLibrary: { color: palette.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center', paddingVertical: spacing.lg },
  inlineCustomButton: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(174,134,255,0.35)', backgroundColor: 'rgba(174,134,255,0.09)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  inlineCustomText: { color: palette.lavender, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  programCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: 'rgba(241,78,155,0.42)' },
  programIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: 'rgba(241,78,155,0.15)', alignItems: 'center', justifyContent: 'center' },
  programName: { color: palette.text, fontSize: 24, lineHeight: 29, fontWeight: '900' },
  programReason: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  spinPanel: { borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(78,217,232,0.42)', backgroundColor: '#070D18', padding: spacing.sm },
  lcdLabel: { color: palette.textMuted, fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  lcdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: 5 },
  lcdButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(78,217,232,0.38)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111D2A' },
  lcdDisplay: { minWidth: 120, borderRadius: 10, borderWidth: 2, borderColor: '#284D4C', backgroundColor: '#071614', paddingHorizontal: spacing.xs, paddingVertical: 3, alignItems: 'center', shadowColor: '#63FFC9', shadowOpacity: 0.28, shadowRadius: 8 },
  lcdDigits: { color: '#8FFFD5', fontSize: 30, lineHeight: 34, fontWeight: '900', fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', web: 'monospace' }), letterSpacing: 2, textShadowColor: 'rgba(143,255,213,0.55)', textShadowRadius: 6 },
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
  recipeNameInput: { minHeight: 50, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 17, fontWeight: '800' },
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
