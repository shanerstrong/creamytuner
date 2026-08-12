import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { FooterCreamy, type CreamyTip, type TutorialAddition } from '@/src/components/tutorial/footer-creamy';
import { OverflowAwareScroll } from '@/src/components/tutorial/overflow-aware-scroll';
import { TutorialAmountEditor } from '@/src/components/tutorial/tutorial-amount-editor';
import { GlassCard, GradientButton, Icon, LoadingScreen, Screen, SearchField, type IconName } from '@/src/components/ui';
import { machineById, machines } from '@/src/data/machines';
import { createFreezeTimer } from '@/src/domain/freeze-timer';
import { ALLERGY_SAFETY_NOTICE, filterIngredientsForPreferences, foodAllergenLabels, getIngredientEligibility, ingredientMatchesPreferences } from '@/src/domain/dietary';
import { generateRecipe, recommendProgram, validateRecipe } from '@/src/domain/generator';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { CURRENT_ONBOARDING_VERSION, TUTORIAL_STAGES, initializeTutorialStageRecommendations, normalizeTutorialDraft, tutorialBaseTemplates, tutorialFinalProgram, tutorialItems, tutorialMixInItems, tutorialRecipePresentation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { useApp } from '@/src/providers/app-provider';
import { scheduleFreezeReminder } from '@/src/services/freeze-reminder';
import { PhotoPermissionError, choosePintPhoto, openPhotoPermissionSettings, type PintPhotoSource } from '@/src/services/pint-photo';
import { palette, radii, spacing } from '@/src/theme';
import type { DietaryPreference, FoodAllergen, Ingredient, IngredientCategory, RecipeIngredient, TutorialDraft, TutorialStage, TutorialTextureResult, Unit, UserSettings } from '@/src/types';

type Choice = { id: string; title: string; detail: string; icon: IconName; tone: 'pink' | 'lavender' | 'mint' | 'gold' };
type RemovedItem = { item: RecipeIngredient; fromBase: boolean };
type LibraryRequest = { category: 'all' | IngredientCategory; allowedIds?: string[]; title?: string; customCategory?: IngredientCategory };

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

const ALLERGY_CHOICES: Choice[] = (Object.entries(foodAllergenLabels) as [FoodAllergen, string][]).map(([id, title], index) => ({
  id,
  title,
  detail: id === 'tree-nuts' ? 'Almonds, cashews, and other tree nuts' : id === 'crustacean-shellfish' ? 'Shrimp, crab, lobster, and related shellfish' : `Avoid ingredients containing ${title.toLowerCase()}`,
  icon: 'shield-alert-outline' as IconName,
  tone: (['pink', 'lavender', 'mint', 'gold'][index % 4]) as Choice['tone'],
}));

const HELPER_CHOICES: Choice[] = [
  { id: 'jello-vanilla-zero', title: 'Pudding mix', detail: 'Easy body and flavor', icon: 'cup', tone: 'pink' },
  { id: 'cottage-cheese-low-fat', title: 'Cottage cheese', detail: 'Dense and creamy', icon: 'bowl-mix', tone: 'lavender' },
  { id: 'cream-cheese', title: 'Cream cheese', detail: 'Rich, smooth texture', icon: 'cheese', tone: 'gold' },
  { id: 'xanthan-gum', title: 'Xanthan gum', detail: 'A tiny amount goes far', icon: 'spoon-sugar', tone: 'mint' },
];

const SWEETENER_CHOICES: Choice[] = [
  { id: 'sugar', title: 'Sugar', detail: 'Classic sweetness', icon: 'shaker', tone: 'lavender' },
  { id: 'brown-sugar', title: 'Brown sugar', detail: 'Caramel-like flavor', icon: 'shaker-outline', tone: 'gold' },
  { id: 'honey', title: 'Honey', detail: 'Warm liquid sweetness', icon: 'beehive-outline', tone: 'mint' },
  { id: 'maple-syrup', title: 'Maple syrup', detail: 'Rich maple sweetness', icon: 'bottle-tonic-outline', tone: 'gold' },
  { id: 'allulose', title: 'Allulose', detail: 'Softer lower-calorie freeze', icon: 'shaker-outline', tone: 'pink' },
  { id: 'monk-fruit', title: 'Monk fruit blend', detail: 'Check the package conversion', icon: 'leaf', tone: 'mint' },
];

const FLAVOR_CHOICES: Choice[] = [
  { id: 'strawberries', title: 'Strawberry', detail: 'Bright and beginner-friendly', icon: 'fruit-cherries', tone: 'pink' },
  { id: 'cocoa', title: 'Cacao powder', detail: 'Unsweetened chocolate flavor', icon: 'food-variant', tone: 'lavender' },
  { id: 'vanilla', title: 'Vanilla', detail: 'Simple and flexible', icon: 'flower-outline', tone: 'gold' },
  { id: 'banana', title: 'Banana', detail: 'Sweet with extra body', icon: 'food-apple-outline', tone: 'mint' },
  { id: 'blueberries', title: 'Blueberries', detail: 'Bright berry flavor', icon: 'fruit-cherries', tone: 'lavender' },
  { id: 'pb2-original', title: 'PB2 peanut powder', detail: 'Nutty flavor with protein', icon: 'peanut-outline', tone: 'gold' },
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

const creamyTips: Partial<Record<TutorialStage, Omit<CreamyTip, 'id'>>> = {
  machine: { text: 'Pick the model printed on your machine.', detail: 'The machine choice controls capacity and which programs CreamyTuner suggests.', provenance: 'creamytuner' },
  'food-needs': { text: 'Choose everything that matters to you.', detail: 'These filters improve suggestions, but always check the current package label.', provenance: 'creamytuner' },
  base: { text: 'I picked a balanced starting base.', detail: 'You can adjust, replace, or combine bases without leaving this step.', provenance: 'creamytuner' },
  taste: { text: 'Sweetener affects softness as well as flavor.', detail: 'The suggested sweetener and flavor can both be changed or removed.', provenance: 'creamytuner' },
  review: { text: 'Blend until no lumps remain.', detail: 'A smooth, level base freezes and processes more evenly.', provenance: 'creamytuner' },
  freeze: { text: 'Keep the pint upright and level.', detail: 'Only process it when the center and surface are completely solid.', provenance: 'manufacturer' },
  'first-cycle': { text: 'Your machine controls the cycle and stops itself.', detail: 'Wait for the machine to stop completely, then tell CreamyTuner how the center and edges look.', provenance: 'manufacturer' },
  'final-cycle': { text: 'This is the last machine cycle.', detail: 'The beginner tutorial never recommends a third machine cycle.', provenance: 'creamytuner' },
};
const proactiveCreamyStages = new Set<TutorialStage>(['food-needs', 'base', 'freeze']);

export default function TutorialScreen() {
  const { ready, ingredients, recipes, settings, saveRecipe, updateSettings, addCustomIngredient } = useApp();
  const [draft, setDraft] = useState<TutorialDraft>(() => {
    const initial = normalizeTutorialDraft({ ...settings.tutorialDraft, dietaryPreferences: settings.dietaryPreferences.length ? settings.dietaryPreferences : settings.tutorialDraft.dietaryPreferences, foodAllergies: settings.foodAllergies, customAvoidFoods: settings.customAvoidFoods });
    return initializeTutorialStageRecommendations(initial, ingredients, machineById(initial.machineId).capacityMl);
  });
  const [addition, setAddition] = useState<TutorialAddition>({ kind: 'liquid', nonce: 0 });
  const [editorId, setEditorId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemovedItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [customCategory, setCustomCategory] = useState<IngredientCategory | null>(null);
  const [libraryRequest, setLibraryRequest] = useState<LibraryRequest | null>(null);
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
    const loaded = normalizeTutorialDraft({ ...settings.tutorialDraft, dietaryPreferences: settings.dietaryPreferences.length ? settings.dietaryPreferences : settings.tutorialDraft.dietaryPreferences, foodAllergies: settings.foodAllergies, customAvoidFoods: settings.customAvoidFoods });
    const next = initializeTutorialStageRecommendations(loaded, ingredients, machineById(loaded.machineId).capacityMl);
    setDraft(next);
    if (next !== loaded) void updateSettings({ tutorialDraft: next });
    initialized.current = true;
  }, [ingredients, ready, settings.customAvoidFoods, settings.dietaryPreferences, settings.foodAllergies, settings.tutorialDraft, updateSettings]);

  useEffect(() => {
    if (!removed) return;
    undoOpacity.setValue(1);
    const animation = Animated.sequence([
      Animated.delay(3500),
      Animated.timing(undoOpacity, { toValue: 0, duration: 350, useNativeDriver: Platform.OS !== 'web' }),
    ]);
    animation.start(({ finished }) => { if (finished) setRemoved(null); });
    return () => animation.stop();
  }, [removed, undoOpacity]);

  const machine = machineById(draft.machineId);
  const eligibleIngredients = useMemo(() => filterIngredientsForPreferences(ingredients, draft.dietaryPreferences, draft.foodAllergies, draft.customAvoidFoods), [draft.customAvoidFoods, draft.dietaryPreferences, draft.foodAllergies, ingredients]);
  const items = useMemo(() => tutorialItems(draft, ingredients), [draft, ingredients]);
  const validation = useMemo(() => validateRecipe(items, ingredients, machine.id), [ingredients, items, machine.id]);
  const previewRecipe = useMemo(() => makeTutorialRecipe(draft, items, ingredients), [draft, ingredients, items]);
  const program = useMemo(() => recommendProgram(previewRecipe, machine.id), [machine.id, previewRecipe]);
  const mixIns = tutorialMixInItems(draft, ingredients);
  const mascotItems = mixIns.length && TUTORIAL_STAGES.indexOf(draft.stage) >= TUTORIAL_STAGES.indexOf('final-cycle') ? [...items, ...mixIns] : items;
  const mascotAmount = estimateVolumeMl(mascotItems);

  if (!ready) return <LoadingScreen />;

  const persist = (next: TutorialDraft, settingsPatch: Partial<UserSettings> = {}) => {
    setDraft(next);
    void updateSettings({ tutorialDraft: next, machineId: next.machineId, ...settingsPatch });
  };

  const patchDraft = (patch: Partial<TutorialDraft>) => persist({ ...draft, ...patch });
  const animateAddition = (kind: TutorialAddition['kind']) => setAddition((current) => ({ kind, nonce: current.nonce + 1 }));
  const addCustomToDraft = async (ingredient: Ingredient) => {
    await addCustomIngredient(ingredient);
    if (ingredient.category === 'base') patchDraft({ baseItems: [...draft.baseItems, { ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }] });
    else if (draft.stage === 'final-cycle' && ingredient.category === 'mix-in') patchDraft({ mixInIds: [...new Set([...draft.mixInIds, ingredient.id])], mixInId: draft.mixInId ?? ingredient.id });
    else patchDraft({ selectedIngredientIds: [...new Set([...draft.selectedIngredientIds, ingredient.id])], itemAmounts: { ...draft.itemAmounts, [ingredient.id]: ingredient.defaultAmount } });
    animateAddition(ingredient.category === 'fruit' ? 'fruit' : ingredient.category === 'mix-in' ? 'mix-in' : ingredient.category === 'base' ? 'liquid' : 'spoon');
    setCustomCategory(null);
  };
  const saveTutorialIngredient = async (ingredient: Ingredient) => {
    const eligibility = getIngredientEligibility(ingredient, draft.dietaryPreferences, draft.foodAllergies, draft.customAvoidFoods);
    if (eligibility.status === 'label-check-required') {
      Alert.alert('Check the current label', eligibility.reasons[0], [{ text: 'Cancel', style: 'cancel' }, { text: 'I checked the label', onPress: () => { void addCustomToDraft({ ...ingredient, allergenDataStatus: 'user-confirmed', allergenVerifiedAt: new Date().toISOString().slice(0, 10), allergenStatement: ingredient.allergenStatement || 'User checked the current package label.' }); } }]);
      return;
    }
    if (!eligibility.allowed) { Alert.alert('Ingredient is restricted', eligibility.reasons.join('\n')); return; }
    await addCustomToDraft(ingredient);
  };
  const chooseTutorialIngredient = (ingredient: Ingredient) => {
    if (!ingredientMatchesPreferences(ingredient, draft.dietaryPreferences, draft.foodAllergies, draft.customAvoidFoods)) {
      Alert.alert('Ingredient is restricted', getIngredientEligibility(ingredient, draft.dietaryPreferences, draft.foodAllergies, draft.customAvoidFoods).reasons.join('\n'));
      return;
    }
    if (ingredient.category === 'base') {
      if (draft.baseItems.some((item) => item.ingredientId === ingredient.id)) patchDraft({ baseItems: draft.baseItems.filter((item) => item.ingredientId !== ingredient.id) });
      else patchDraft({ baseItems: [...draft.baseItems, { ingredientId: ingredient.id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit }] });
    } else if (draft.stage === 'final-cycle' && ingredient.category === 'mix-in') {
      const mixInIds = draft.mixInIds.includes(ingredient.id) ? draft.mixInIds.filter((id) => id !== ingredient.id) : [...draft.mixInIds, ingredient.id];
      patchDraft({ mixInIds, mixInId: mixInIds[0] ?? null });
    } else if (draft.selectedIngredientIds.includes(ingredient.id)) {
      patchDraft({ selectedIngredientIds: draft.selectedIngredientIds.filter((id) => id !== ingredient.id) });
    } else {
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
    const next = initializeTutorialStageRecommendations({ ...draft, ...patch, stage }, ingredients, machine.capacityMl, stage);
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

  const toggleDietary = (id: string) => {
    const values = draft.dietaryPreferences.includes(id as never)
      ? draft.dietaryPreferences.filter((value) => value !== id)
      : [...draft.dietaryPreferences, id as DietaryPreference];
    const allowed = (ingredientId: string) => {
      const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);
      return ingredient ? ingredientMatchesPreferences(ingredient, values, draft.foodAllergies, draft.customAvoidFoods) : false;
    };
    const baseItems = draft.baseItems.filter((item) => allowed(item.ingredientId));
    const selectedIngredientIds = draft.selectedIngredientIds.filter(allowed);
    const mixInIds = draft.mixInIds.filter(allowed);
    const removedIds = [...draft.baseItems.map((item) => item.ingredientId), ...draft.selectedIngredientIds, ...draft.mixInIds].filter((ingredientId) => !allowed(ingredientId));
    const retainedIds = new Set([...baseItems.map((item) => item.ingredientId), ...selectedIngredientIds, ...mixInIds]);
    persist({ ...draft,
      dietaryPreferences: values,
      baseItems,
      selectedIngredientIds,
      mixInIds,
      mixInId: mixInIds[0] ?? null,
      itemAmounts: Object.fromEntries(Object.entries(draft.itemAmounts).filter(([ingredientId]) => retainedIds.has(ingredientId))),
      manualAmountIds: draft.manualAmountIds.filter((ingredientId) => retainedIds.has(ingredientId)),
      initializedRecommendationStages: [],
    }, { dietaryPreferences: values });
    if (removedIds.length) Alert.alert('Ingredients removed', removedIds.map((ingredientId) => ingredients.find((item) => item.id === ingredientId)?.name).filter(Boolean).join(', '));
  };

  const applyAllergyRestrictions = (foodAllergies: FoodAllergen[], customAvoidFoods = draft.customAvoidFoods) => {
    const eligibilityFor = (ingredientId: string) => {
      const ingredient = ingredients.find((candidate) => candidate.id === ingredientId);
      return ingredient ? getIngredientEligibility(ingredient, draft.dietaryPreferences, foodAllergies, customAvoidFoods).allowed : false;
    };
    const allIds = [...draft.baseItems.map((item) => item.ingredientId), ...draft.selectedIngredientIds, ...draft.mixInIds];
    const removedIds = [...new Set(allIds.filter((id) => !eligibilityFor(id)))];
    const baseItems = draft.baseItems.filter((item) => eligibilityFor(item.ingredientId));
    const selectedIngredientIds = draft.selectedIngredientIds.filter(eligibilityFor);
    const mixInIds = draft.mixInIds.filter(eligibilityFor);
    const retained = new Set([...baseItems.map((item) => item.ingredientId), ...selectedIngredientIds, ...mixInIds]);
    const next = {
      ...draft, foodAllergies, customAvoidFoods, baseItems, selectedIngredientIds, mixInIds, mixInId: mixInIds[0] ?? null,
      itemAmounts: Object.fromEntries(Object.entries(draft.itemAmounts).filter(([id]) => retained.has(id))),
      manualAmountIds: draft.manualAmountIds.filter((id) => retained.has(id)),
      initializedRecommendationStages: [],
    };
    persist(next, { foodAllergies, customAvoidFoods });
    if (removedIds.length) Alert.alert('Ingredients removed for your safety settings', removedIds.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', '));
  };

  const toggleAllergy = (id: string) => {
    const allergen = id as FoodAllergen;
    const values = draft.foodAllergies.includes(allergen) ? draft.foodAllergies.filter((value) => value !== allergen) : [...draft.foodAllergies, allergen];
    applyAllergyRestrictions(values);
  };

  const addCustomAvoid = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    applyAllergyRestrictions(draft.foodAllergies, [...new Set([...draft.customAvoidFoods, trimmed])]);
  };

  const addFillIngredient = (id: string, kind: TutorialAddition['kind']) => {
    if (draft.selectedIngredientIds.includes(id)) return;
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    if (!ingredient || !ingredientMatchesPreferences(ingredient, draft.dietaryPreferences, draft.foodAllergies, draft.customAvoidFoods)) return;
    const remaining = Math.max(1, machine.capacityMl - validation.estimatedVolumeMl - 20);
    const amount = Math.min(ingredient.defaultAmount, remaining);
    patchDraft({
      selectedIngredientIds: [...draft.selectedIngredientIds, id],
      itemAmounts: { ...draft.itemAmounts, [id]: amount },
    });
    animateAddition(kind);
  };

  const applyCorrection = () => {
    if (draft.correctionDecision === 'apply') return;
    if (draft.textureResult === 'too-soft') {
      patchDraft({ correctionDecision: 'apply', correctiveIngredientIds: [] });
      return;
    }
    const base = draft.baseItems[0];
    if (!base) return;
    patchDraft({
      baseItems: draft.baseItems.map((item, index) => index === 0 ? { ...item, amount: item.amount + 15 } : item),
      correctionDecision: 'apply',
      correctiveIngredientIds: [base.ingredientId],
    });
    animateAddition('liquid');
  };

  const skipCorrection = () => {
    const correctiveId = draft.correctiveIngredientIds[0];
    patchDraft({
      baseItems: draft.correctionDecision === 'apply' && correctiveId
        ? draft.baseItems.map((item) => item.ingredientId === correctiveId ? { ...item, amount: Math.max(1, item.amount - 15) } : item)
        : draft.baseItems,
      correctionDecision: 'skip',
      correctiveIngredientIds: [],
    });
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
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (error instanceof PhotoPermissionError && error.canOpenSettings) {
        Alert.alert('Photo access needed', message, [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => { void openPhotoPermissionSettings(); } }]);
      } else if (!(error instanceof PhotoPermissionError && !error.canOpenSettings && message === 'Photo selection was canceled.')) {
        Alert.alert('Could not add photo', message);
      }
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
    transitionTo('first-cycle', { recipeId: recipe.id, freezeTimerStartedAt: null, firstCycleState: 'ready' });
  };

  const startFreezeTimer = async () => {
    setBusy(true);
    const recipe = await saveCurrentRecipe();
    const timer = createFreezeTimer(recipe);
    const reminder = await scheduleFreezeReminder(timer).catch(() => ({ scheduled: false, notificationId: undefined, message: 'The in-app timer is active. A device reminder could not be scheduled.' }));
    setTimerMessage(reminder.message);
    setBusy(false);
    transitionTo('first-cycle', { recipeId: recipe.id, freezeTimerStartedAt: timer.startedAt, firstCycleState: 'ready' }, {
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
    || (draft.stage === 'review' && validation.errors.length > 0)
    || (draft.stage === 'first-cycle' && draft.firstCycleState === 'check' && !draft.textureResult)
    || (draft.stage === 'final-cycle' && draft.finalCycleState === 'prepare' && draft.textureResult !== 'perfect' && draft.correctionDecision === 'pending')
    || (draft.stage === 'final-cycle' && draft.finalCycleState === 'check' && !draft.finalTextureResult);
  const editorIngredient = editorId ? ingredients.find((ingredient) => ingredient.id === editorId) : undefined;
  const editorItem = editorId ? itemFor(draft, ingredients, editorId) : undefined;
  const editorIds = draft.stage === 'base'
    ? [...draft.baseItems.map((item) => item.ingredientId), ...selectedFrom(draft, groupIds.helper)]
    : draft.stage === 'taste'
      ? selectedFrom(draft, [...groupIds.sweetener, ...groupIds.flavor])
      : [];
  const editorIndex = editorId ? editorIds.indexOf(editorId) : -1;

  const handleBack = () => {
    if (libraryRequest) return setLibraryRequest(null);
    if (customCategory) return setCustomCategory(null);
    if (editorId) {
      settleWebFocus();
      return setEditorId(null);
    }
    if (draft.stage === 'machine') return router.replace('/');
    if (draft.stage === 'first-cycle' && draft.firstCycleState === 'check') return patchDraft({ firstCycleState: 'running' });
    if (draft.stage === 'first-cycle' && draft.firstCycleState === 'running') return patchDraft({ firstCycleState: 'ready' });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'check') return patchDraft({ finalCycleState: draft.secondCycleProgram ? 'running' : 'prepare', finalTextureResult: null });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'running') return patchDraft({ finalCycleState: 'ready' });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'ready') return patchDraft({ finalCycleState: 'prepare' });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'prepare' && draft.correctionDecision === 'apply' && draft.correctiveIngredientIds[0]) {
      const correctiveId = draft.correctiveIngredientIds[0];
      return transitionTo('first-cycle', {
        baseItems: draft.baseItems.map((item) => item.ingredientId === correctiveId ? { ...item, amount: Math.max(1, item.amount - 15) } : item),
        correctionDecision: 'pending',
        correctiveIngredientIds: [],
        firstCycleState: 'check',
      });
    }
    transitionTo(previousStage);
  };

  const handleNext = () => {
    if (libraryRequest) return setLibraryRequest(null);
    if (customCategory) return setCustomCategory(null);
    if (editorId) {
      settleWebFocus();
      return setEditorId(null);
    }
    if (draft.stage === 'complete') return void finishTutorial();
    if (draft.stage === 'first-cycle' && draft.firstCycleState === 'ready') return patchDraft({ firstCycleState: 'running' });
    if (draft.stage === 'first-cycle' && draft.firstCycleState === 'running') return patchDraft({ firstCycleState: 'check' });
    if (draft.stage === 'first-cycle' && draft.firstCycleState === 'check') return transitionTo('final-cycle', { finalCycleState: 'prepare', finalTextureResult: null });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'prepare') {
      const secondCycleProgram = tutorialFinalProgram(draft);
      return patchDraft({ secondCycleProgram, finalCycleState: secondCycleProgram ? 'ready' : 'check', finalTextureResult: secondCycleProgram ? null : 'perfect' });
    }
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'ready') return patchDraft({ finalCycleState: 'running' });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'running') return patchDraft({ finalCycleState: 'check' });
    if (draft.stage === 'final-cycle' && draft.finalCycleState === 'check') return transitionTo('complete');
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
    eligibleIngredients,
    machine,
    items,
    validation,
    program,
    timerMessage,
    recipes,
    onMachine: (machineId) => patchDraft({ machineId }),
    onToggleDietary: toggleDietary,
    onToggleAllergy: toggleAllergy,
    onAddCustomAvoid: addCustomAvoid,
    onRemoveCustomAvoid: (value) => applyAllergyRestrictions(draft.foodAllergies, draft.customAvoidFoods.filter((item) => item !== value)),
    onAddFill: addFillIngredient,
    onToggleMixIn: (id) => {
      const ingredient = ingredients.find((candidate) => candidate.id === id);
      if (ingredient) chooseTutorialIngredient(ingredient);
    },
    onEdit: (id) => {
      settleWebFocus();
      setEditorId(id);
    },
    onDisclosure: toggleDisclosure,
    onPatch: patchDraft,
    onApplyCorrection: applyCorrection,
    onSkipCorrection: skipCorrection,
    onTakePhoto: () => { void addPintPhoto('camera'); },
    onChoosePhoto: () => { void addPintPhoto('library'); },
    onCustomIngredient: setCustomCategory,
    onViewMore: (category) => setLibraryRequest({ category }),
    onOpenChoices: (category, allowedIds, title, customCategory) => setLibraryRequest({ category, allowedIds, title, customCategory }),
    photoBusy,
  });

  return (
    <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen scroll={false} resetKey={`${draft.stage}-${draft.firstCycleState}-${draft.finalCycleState}`} contentStyle={styles.content} footer={
      <TutorialFooter
        stage={draft.stage}
        busy={busy}
        disabled={blocked}
        amountMl={mascotAmount}
        capacityMl={machine.capacityMl}
        addition={addition}
        creamyEnabled={settings.creamyHelperEnabled}
        tipsEnabled={settings.creamyTipsEnabled}
        motionEnabled={settings.creamyMotionEnabled}
        dismissedTipIds={settings.dismissedCreamyTipIds}
        onDismissTip={(tipId) => { if (!settings.dismissedCreamyTipIds.includes(tipId)) void updateSettings({ dismissedCreamyTipIds: [...settings.dismissedCreamyTipIds, tipId] }); }}
        editorOpen={Boolean(editorId || libraryRequest || customCategory)}
        actionTitle={draft.stage === 'first-cycle' && draft.firstCycleState === 'ready' ? 'Start machine' : draft.stage === 'first-cycle' && draft.firstCycleState === 'running' ? 'Cycle finished' : draft.stage === 'final-cycle' && draft.finalCycleState === 'prepare' ? 'Final cycle' : draft.stage === 'final-cycle' && draft.finalCycleState === 'ready' ? 'Start machine' : draft.stage === 'final-cycle' && draft.finalCycleState === 'running' ? 'Cycle finished' : draft.stage === 'final-cycle' && draft.finalCycleState === 'check' ? 'Finish' : undefined}
        onBack={handleBack}
        onNext={handleNext}
        onFreezeNow={() => { void startFreezeTimer(); }}
        onFreezeLater={() => { void freezeLater(); }}
      />
    }>
      {!compact ? <Text style={styles.tutorialHeader}>Your first pint</Text> : null}
      <TutorialProgress stage={draft.stage} />
      <Animated.View key={`${draft.stage}-${draft.firstCycleState}-${draft.finalCycleState}`} style={[styles.animatedPage, Platform.OS === 'web' ? undefined : { transform: [{ translateX: slide }] }]}>{page}</Animated.View>
      {removed ? <Animated.View style={[styles.undo, { opacity: undoOpacity }]}><Pressable onPress={undoRemove} accessibilityRole="button" accessibilityLabel={`Undo removing ${ingredients.find((item) => item.id === removed.item.ingredientId)?.name ?? 'ingredient'}`} style={styles.undoButton}><Text style={styles.undoText}>Ingredient removed</Text><Text style={styles.undoAction}>Undo</Text></Pressable></Animated.View> : null}
      {customCategory ? <TutorialCustomIngredient category={customCategory} onClose={() => setCustomCategory(null)} onSave={(ingredient) => { void saveTutorialIngredient(ingredient); }} /> : null}
      {libraryRequest ? <TutorialIngredientPicker category={libraryRequest.category} customCategory={libraryRequest.customCategory} allowedIds={libraryRequest.allowedIds} title={libraryRequest.title} ingredients={eligibleIngredients} selectedIds={[...draft.baseItems.map((item) => item.ingredientId), ...draft.selectedIngredientIds, ...draft.mixInIds]} onSelect={chooseTutorialIngredient} onClose={() => setLibraryRequest(null)} onCustom={(category) => { setLibraryRequest(null); setCustomCategory(category); }} /> : null}
    </Screen>
    </KeyboardAvoidingView>
  );
}

type StageProps = {
  draft: TutorialDraft;
  compact: boolean;
  ingredients: Ingredient[];
  eligibleIngredients: Ingredient[];
  machine: ReturnType<typeof machineById>;
  items: RecipeIngredient[];
  validation: ReturnType<typeof validateRecipe>;
  program: ReturnType<typeof recommendProgram>;
  timerMessage: string;
  recipes: ReturnType<typeof useApp>['recipes'];
  onMachine: (id: string) => void;
  onToggleDietary: (id: string) => void;
  onToggleAllergy: (id: string) => void;
  onAddCustomAvoid: (value: string) => void;
  onRemoveCustomAvoid: (value: string) => void;
  onAddFill: (id: string, kind: TutorialAddition['kind']) => void;
  onToggleMixIn: (id: string) => void;
  onEdit: (id: string) => void;
  onDisclosure: (id: string) => void;
  onPatch: (patch: Partial<TutorialDraft>) => void;
  onApplyCorrection: () => void;
  onSkipCorrection: () => void;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  onCustomIngredient: (category: IngredientCategory) => void;
  onViewMore: (category: 'all' | IngredientCategory) => void;
  onOpenChoices: (category: 'all' | IngredientCategory, allowedIds: string[] | undefined, title: string, customCategory?: IngredientCategory) => void;
  photoBusy: boolean;
};

function renderStage(props: StageProps) {
  const { draft, compact, ingredients, eligibleIngredients, machine, items, validation, program, timerMessage, onMachine, onToggleDietary, onToggleAllergy, onAddCustomAvoid, onRemoveCustomAvoid, onAddFill, onToggleMixIn, onEdit, onDisclosure, onPatch, onApplyCorrection, onSkipCorrection, onTakePhoto, onChoosePhoto, onCustomIngredient, onViewMore, onOpenChoices, photoBusy } = props;
  const names = (ids: string[]) => ids.map((id) => ingredients.find((item) => item.id === id)?.name).filter(Boolean).join(', ');
  const disclose = (id: string) => draft.disclosures.includes(id);
  const eligibleIds = new Set(eligibleIngredients.map((ingredient) => ingredient.id));
  const eligibleChoices = (choices: Choice[]) => choices.filter((choice) => eligibleIds.has(choice.id));

  if (draft.stage === 'machine') {
    const otherChoices = machines.map((item, index) => ({ id: item.id, title: item.shortName, detail: item.subtitle, icon: index < 3 ? 'ice-cream' as IconName : 'cup' as IconName, tone: (['pink', 'lavender', 'mint', 'gold'][index % 4]) as Choice['tone'] }));
    return <Page icon="ice-cream" eyebrow="ONE QUICK SETUP" title="Which machine do you have?"><MachineChoiceGrid choices={otherChoices} selected={draft.machineId} onSelect={onMachine} /></Page>;
  }

  if (draft.stage === 'food-needs') return <FoodNeedsStage dietaryPreferences={draft.dietaryPreferences} foodAllergies={draft.foodAllergies} customAvoidFoods={draft.customAvoidFoods} compact={compact} onToggleDietary={onToggleDietary} onToggleAllergy={onToggleAllergy} onAddCustom={onAddCustomAvoid} onRemoveCustom={onRemoveCustomAvoid} />;

  if (draft.stage === 'base') {
    const baseIds = draft.baseItems.map((item) => item.ingredientId);
    const helperIds = selectedFrom(draft, groupIds.helper);
    const selectedItems = items.filter((item) => baseIds.includes(item.ingredientId) || helperIds.includes(item.ingredientId));
    const allIds = [...baseIds, ...helperIds];
    return <Page icon="cup-water" eyebrow="BUILD · RECOMMENDED" title="Build the base"><Text style={styles.preselectedNote}>Selected for you · change anything</Text><IngredientSummary items={selectedItems} ingredients={ingredients} /><AdjustButton ids={allIds} label={`${allIds.length} ingredient${allIds.length === 1 ? '' : 's'} selected`} names={names(allIds)} onPress={() => allIds[0] && onEdit(allIds[0])} /><BundleActions primaryLabel="Change or add base" secondaryLabel="Change texture helper" onPrimary={() => onOpenChoices('base', undefined, 'Choose bases', 'base')} onSecondary={() => onOpenChoices('all', groupIds.helper, 'Choose a texture helper', 'stabilizer')} /></Page>;
  }

  if (draft.stage === 'taste') {
    const sweetenerIds = selectedFrom(draft, groupIds.sweetener);
    const flavorIds = selectedFrom(draft, groupIds.flavor);
    const allIds = [...sweetenerIds, ...flavorIds];
    const selectedItems = items.filter((item) => allIds.includes(item.ingredientId));
    return <Page icon="fruit-cherries" eyebrow="BUILD · RECOMMENDED" title="Add taste"><Text style={styles.preselectedNote}>Sweetness and flavor are already selected</Text><IngredientSummary items={selectedItems} ingredients={ingredients} /><AdjustButton ids={allIds} label={`${allIds.length} ingredient${allIds.length === 1 ? '' : 's'} selected`} names={names(allIds)} onPress={() => allIds[0] && onEdit(allIds[0])} /><BundleActions primaryLabel="Change sweetness" secondaryLabel="Change or add flavor" onPrimary={() => onOpenChoices('all', groupIds.sweetener, 'Choose sweetness', 'sweetener')} onSecondary={() => onOpenChoices('all', groupIds.flavor, 'Choose flavors', 'flavoring')} /></Page>;
  }

  if (draft.stage === 'review') {
    const hasRoom = validation.estimatedVolumeMl < machine.capacityMl * 0.88 && !validation.errors.length;
    const fillOpen = disclose('fill-options');
    const lastItem = items[items.length - 1];
    return <Page icon="blender" eyebrow="MIX + CHECK" title="Blend until completely smooth">{validation.errors.length ? <GlassCard style={styles.overflowAlert}><Icon name="alert-circle-outline" color={palette.danger} size={28} /><View style={styles.flex}><Text style={styles.overflowTitle}>Creamy is too full</Text><Text style={styles.overflowText}>Lower one amount before freezing.</Text></View></GlassCard> : null}{validation.errors.length && lastItem ? <GradientButton title="Remove something" icon="minus-circle-outline" onPress={() => onEdit(lastItem.ingredientId)} /> : null}{hasRoom ? <>{fillOpen ? <><DisclosureButton label="Close add-ins" open onPress={() => onDisclosure('fill-options')} /><SmoothReveal><LibraryActions category="all" onCustom={onCustomIngredient} onViewMore={onViewMore} /><ChoicePager choices={eligibleChoices(FILL_CHOICES)} selected={selectedFrom(draft, FILL_CHOICES.map((choice) => choice.id))} compact={compact} multi allVisible dense onPress={(id) => onAddFill(id, id === 'strawberries' || id === 'banana' ? 'fruit' : 'spoon')} /></SmoothReveal></> : <DisclosureButton label="Add something else" open={false} onPress={() => onDisclosure('fill-options')} />}</> : null}<DisclosureButton label="See what you added" open={disclose('blend-summary')} onPress={() => onDisclosure('blend-summary')} />{disclose('blend-summary') ? <SmoothReveal><IngredientSummary items={items} ingredients={ingredients} /></SmoothReveal> : null}</Page>;
  }

  if (draft.stage === 'freeze') { const freezeOpen = disclose('freeze-why'); return <Page icon="snowflake" eyebrow="FREEZE FLAT" title="Freeze for 24 hours" overlay={<FullInstructionOverlay open={freezeOpen} label="Why a full 24 hours?" steps={['Blend the base completely smooth before freezing.', 'Seal the pint with its storage lid.', 'Keep the pint upright on a flat, level freezer shelf.', 'Freeze for the full 24 hours recommended by the manufacturer.', 'Before processing, confirm the center and surface are completely solid.', 'If the pint is tilted or partly soft, level it and continue freezing before using the machine.']} onClose={() => onDisclosure('freeze-why')} />}><GlassCard style={styles.freezeGuidance}><Text style={styles.freezeGuidanceTitle}>Official guidance: 24 hours</Text><Text style={styles.freezeGuidanceText}>Some users try 15–24 hours, but shorter freezes are unofficial and results vary by freezer. Only process a pint that is completely solid and level.</Text></GlassCard><DisclosureButton label="Why a full 24 hours?" open={false} onPress={() => onDisclosure('freeze-why')} /></Page>; }

  if (draft.stage === 'first-cycle') {
    const machineSteps = ['Remove the storage lid and confirm the frozen surface is level.', 'Place the pint in the outer container and install the paddle lid.', 'Lock the container into the machine.', `Press ${program.program.name}, then wait until the machine stops before opening it.`, 'Remove the outer bowl only after the machine has stopped completely.', 'Open the pint and inspect the center and edges before choosing the result.'];
    const stepsOpen = disclose('spin-steps');
    const running = draft.firstCycleState === 'running';
    const checking = draft.firstCycleState === 'check';
    const toggleResult = (id: string) => onPatch({ textureResult: draft.textureResult === id ? null : id as TutorialTextureResult, correctionDecision: 'pending', correctiveIngredientIds: [], mixInIds: [], mixInId: null, secondCycleProgram: null });
    return <Page icon="record-circle-outline" eyebrow="FIRST SPIN + CHECK" title="Run the first cycle" overlay={<FullInstructionOverlay open={stepsOpen} label="Machine steps" steps={machineSteps} onClose={() => onDisclosure('spin-steps')} />}><GlassCard style={[styles.machineStatus, running && styles.machineStatusActive]}><View style={styles.machineStatusIcon}><Icon name={checking ? 'check-circle-outline' : running ? 'progress-clock' : 'play-circle-outline'} size={32} color={checking ? palette.success : running ? palette.cyan : palette.pink} /></View><View style={styles.flex}><Text style={styles.machineStatusTitle}>{checking ? `${program.program.name} finished` : running ? 'Wait for the machine to stop' : `${program.program.name} is ready`}</Text><Text style={styles.machineStatusText}>{checking ? 'Look at the center and edges, then choose the closest result below.' : running ? 'The machine controls the timing and stops automatically. Keep the bowl locked until it is completely still.' : program.reason}</Text></View></GlassCard>{checking ? <><Text style={styles.textureCheckHeading}>How did it turn out?</Text><TextureChoiceList selected={draft.textureResult} onPress={toggleResult} /></> : <><Text style={styles.guidanceSource}>MANUFACTURER GUIDANCE</Text><Text style={styles.machineTimingNote}>{running ? 'Tap Cycle finished only after the machine stops completely.' : 'One-touch programs control their own duration. No separate countdown is needed.'}</Text>{timerMessage ? <Text style={styles.detailText}>{timerMessage}</Text> : null}<DisclosureButton label="Machine steps" open={stepsOpen} onPress={() => onDisclosure('spin-steps')} /></>}</Page>;
  }

  if (draft.stage === 'final-cycle' && draft.finalCycleState === 'prepare') {
    const needsCorrection = draft.textureResult !== 'perfect';
    const guidance = draft.textureResult ? tutorialTextureGuidance[draft.textureResult] : null;
    const correctionAction = draft.textureResult === 'too-soft' ? 'I refroze it solid' : 'Add 1 tbsp only if dry';
    const mixInItems = draft.mixInIds.map((id) => { const ingredient = ingredients.find((item) => item.id === id); return ingredient ? { ingredientId: id, amount: ingredient.defaultAmount, unit: ingredient.defaultUnit } : null; }).filter((item): item is RecipeIngredient => Boolean(item));
    const eligibleMixIns = eligibleIngredients.filter((ingredient) => ingredient.category === 'mix-in').sort((a, b) => (a.popularityRank ?? 999) - (b.popularityRank ?? 999));
    const preferredMixIns = draft.selectedIngredientIds.includes('cocoa') || draft.selectedIngredientIds.includes('pb2-original')
      ? ['dark-chocolate', 'cookie-pieces']
      : draft.selectedIngredientIds.includes('strawberries') || draft.selectedIngredientIds.includes('blueberries')
        ? ['graham-crumbs', 'cookie-pieces']
        : draft.selectedIngredientIds.includes('banana')
          ? ['dark-chocolate', 'cacao-nibs']
          : ['cookie-pieces', 'dark-chocolate'];
    const recommendedMixIn = preferredMixIns.map((id) => eligibleMixIns.find((ingredient) => ingredient.id === id)).find(Boolean) ?? eligibleMixIns[0];
    const recommendationSelected = recommendedMixIn ? draft.mixInIds.includes(recommendedMixIn.id) : false;
    return <Page icon="auto-fix" eyebrow="FINAL TOUCHES" title="Prepare the last cycle">{needsCorrection && guidance ? <><GlassCard style={styles.correctionCard}><Text style={styles.guidanceSource}>{guidance.source === 'manufacturer' ? 'MANUFACTURER GUIDANCE' : guidance.source === 'community' ? 'COMMUNITY TIP' : 'CREAMYTUNER SUGGESTION'}</Text><Text style={styles.correctionTitle}>{guidance.title}</Text><Text style={styles.correctionText}>{guidance.detail}</Text></GlassCard><RecommendationCard title={correctionAction} detail={draft.textureResult === 'too-soft' ? 'Continue only when the pint is completely firm and level.' : 'Optional community technique · adds 15 ml to the saved recipe.'} action={draft.correctionDecision === 'apply' ? 'Confirmed' : 'Confirm correction'} active={draft.correctionDecision === 'apply'} onPress={onApplyCorrection} />{draft.correctionDecision !== 'apply' ? <Pressable onPress={onSkipCorrection} accessibilityRole="button" style={styles.skipCorrection}><Text style={styles.skipCorrectionText}>{draft.correctionDecision === 'skip' ? 'Liquid skipped' : 'Skip liquid'}</Text></Pressable> : null}</> : <GlassCard style={styles.readyCard}><Icon name="check-circle-outline" color={palette.success} size={26} /><Text style={styles.readyCardText}>The texture is ready. Mix-ins are optional.</Text></GlassCard>}{recommendedMixIn ? <RecommendationCard title={`Recommended: ${recommendedMixIn.name}`} detail="Add one small combined handful. This makes Mix-In your second and final machine cycle." action={recommendationSelected ? 'Added' : 'Add recommendation'} active={recommendationSelected} onPress={() => onToggleMixIn(recommendedMixIn.id)} /> : null}{mixInItems.length ? <IngredientSummary items={mixInItems} ingredients={ingredients} /> : <Text style={styles.optionalHint}>No mix-ins selected</Text>}<BundleActions primaryLabel="Choose other mix-ins" secondaryLabel="Enter my own" onPrimary={() => onOpenChoices('mix-in', undefined, 'Choose mix-ins', 'mix-in')} onSecondary={() => onCustomIngredient('mix-in')} />{draft.mixInIds.length ? <Text style={styles.manualFoldNote}>{needsCorrection ? 'Mix-In replaces Re-Spin when chunks are selected. Do not run both after the first program.' : 'Your selected chunks require the Mix-In program as the second and final cycle.'}</Text> : null}</Page>;
  }

  if (draft.stage === 'final-cycle' && (draft.finalCycleState === 'ready' || draft.finalCycleState === 'running')) {
    const label = draft.secondCycleProgram === 'respin' ? 'Re-Spin' : draft.secondCycleProgram === 'mix-in' ? 'Mix-In' : null;
    const running = draft.finalCycleState === 'running';
    return <Page icon="record-circle-outline" eyebrow="FINAL MACHINE CYCLE" title={running ? 'Machine running' : label ? `Press ${label}` : 'No second cycle needed'}>{running ? <GlassCard style={[styles.machineStatus, styles.machineStatusActive]}><View style={styles.machineStatusIcon}><Icon name="progress-clock" size={32} color={palette.cyan} /></View><View style={styles.flex}><Text style={styles.machineStatusTitle}>Wait for the machine to stop</Text><Text style={styles.machineStatusText}>This is the final machine cycle. Open the pint only after the bowl is completely still.</Text></View></GlassCard> : label ? <InstructionList steps={draft.secondCycleProgram === 'respin' ? ['Pack the surface down so the paddle can reach the mixture.', 'If you confirmed corrective liquid, place it in the center.', 'Press Re-Spin once and let the machine stop completely.', draft.mixInIds.length ? 'Fold selected hard chunks in by hand after the cycle.' : 'Open the pint and check the final texture.'] : ['Make a narrow hole down the center of the pint.', 'Add one small combined handful of your selected mix-ins.', 'Press Mix-In once and let the machine stop completely.', 'Open the pint and check the final texture.']} /> : <GlassCard style={styles.readyCard}><Icon name="check-circle-outline" color={palette.success} size={28} /><Text style={styles.readyCardText}>Your first spin was perfect and no mix-ins were selected.</Text></GlassCard>}<Text style={styles.finalCycleNote}>{running ? 'Tap Cycle finished after the machine stops.' : 'This is the last machine cycle in the tutorial.'}</Text></Page>;
  }

  if (draft.stage === 'final-cycle') {
    const toggleResult = (id: string) => onPatch({ finalTextureResult: draft.finalTextureResult === id ? null : id as TutorialTextureResult });
    return <Page icon="eye-outline" eyebrow="FINAL TEXTURE CHECK" title="How did it come out?"><TextureChoiceList selected={draft.finalTextureResult} onPress={toggleResult} />{draft.finalTextureResult && draft.finalTextureResult !== 'perfect' ? <GlassCard style={styles.friendHelp}><Icon name="account-group-outline" color={palette.lavender} size={28} /><View style={styles.flex}><Text style={styles.friendHelpTitle}>Stop the machine here</Text><Text style={styles.friendHelpText}>Do not run a third cycle. Note the result for the next recipe, ask a friend, or contact mshaner@shanerstrong.com.</Text></View></GlassCard> : draft.finalTextureResult === 'perfect' ? <Text style={styles.perfectNote}>Perfect — stop processing and enjoy it.</Text> : null}</Page>;
  }

  const presentation = tutorialRecipePresentation(draft);
  return <Page icon="party-popper" eyebrow="CONGRATULATIONS!" title="Your pint is complete" intro="Give it a name, save a photo, or continue without one."><TextInput value={draft.recipeName} onChangeText={(recipeName) => onPatch({ recipeName })} placeholder="Name this pint" placeholderTextColor={palette.textFaint} style={styles.recipeNameInput} accessibilityLabel="Recipe name" /><View style={styles.photoCard}>{draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={styles.pintPhoto} accessibilityLabel="Your finished pint photo" /> : <LinearGradient colors={['rgba(241,78,155,0.28)', 'rgba(78,217,232,0.16)']} style={styles.photoPlaceholder}>{photoBusy ? <ActivityIndicator color={palette.cyan} size="large" /> : <Icon name="camera-plus-outline" size={52} color={palette.white} />}<Text style={styles.celebrationTitle}>{photoBusy ? 'Preparing photo…' : presentation.name}</Text></LinearGradient>}<Text style={styles.celebrationCopy}>{photoBusy ? 'Compressing and saving your photo' : draft.photoUri ? 'Photo added to your saved recipe' : props.recipes.some((recipe) => recipe.id === draft.recipeId) ? 'Recipe saved locally' : 'Ready to save locally'}</Text></View><View style={styles.photoActions}><Pressable disabled={photoBusy} onPress={onTakePhoto} accessibilityRole="button" style={[styles.photoAction, photoBusy && styles.disabled]}><Icon name="camera-outline" color={palette.cyan} /><Text style={styles.photoActionText}>{photoBusy ? 'Adding…' : draft.photoUri ? 'Retake' : 'Take photo'}</Text></Pressable><Pressable disabled={photoBusy} onPress={onChoosePhoto} accessibilityRole="button" style={[styles.photoAction, photoBusy && styles.disabled]}><Icon name="image-outline" color={palette.lavender} /><Text style={styles.photoActionText}>{photoBusy ? 'Please wait' : 'Choose photo'}</Text></Pressable></View></Page>;
}

function SafetyNotice() {
  return <View style={styles.safetyNotice} accessibilityRole="summary"><Icon name="shield-alert-outline" color={palette.warning} size={20} /><Text style={styles.safetyNoticeText}>{ALLERGY_SAFETY_NOTICE}</Text></View>;
}

function FoodNeedsStage({ dietaryPreferences, foodAllergies, customAvoidFoods, compact, onToggleDietary, onToggleAllergy, onAddCustom, onRemoveCustom }: { dietaryPreferences: DietaryPreference[]; foodAllergies: FoodAllergen[]; customAvoidFoods: string[]; compact: boolean; onToggleDietary: (id: string) => void; onToggleAllergy: (id: string) => void; onAddCustom: (value: string) => void; onRemoveCustom: (value: string) => void }) {
  const [custom, setCustom] = useState('');
  const submit = () => { if (!custom.trim()) return; onAddCustom(custom); setCustom(''); };
  return <Page icon="shield-check-outline" eyebrow="SETUP · FOOD NEEDS" title="What should we filter out?"><View style={styles.foodNeedsContent}><View style={styles.foodSectionHeading}><View><Text style={styles.foodSectionTitle}>Dietary preferences</Text><Text style={styles.foodSectionCount}>{dietaryPreferences.length ? `${dietaryPreferences.length} selected` : 'None selected'}</Text></View><Icon name="leaf" color={palette.success} /></View><ChoicePager choices={DIETARY_CHOICES} selected={dietaryPreferences} compact={compact} multi allVisible dense onPress={onToggleDietary} /><View style={styles.foodSectionDivider} /><View style={styles.foodSectionHeading}><View><Text style={styles.foodSectionTitle}>Food allergies</Text><Text style={styles.foodSectionCount}>{foodAllergies.length ? `${foodAllergies.length} selected` : 'None selected'}</Text></View><Icon name="shield-alert-outline" color={palette.warning} /></View><View style={styles.allergyGrid}>{ALLERGY_CHOICES.map((choice) => { const active = foodAllergies.includes(choice.id as FoodAllergen); return <Pressable key={choice.id} onPress={() => onToggleAllergy(choice.id)} style={[styles.allergyChoice, active && styles.allergyChoiceActive]} accessibilityRole="checkbox" accessibilityState={{ checked: active }}><Text style={styles.allergyChoiceText}>{choice.title}</Text>{active ? <Icon name="check-circle" size={17} color={palette.success} /> : null}</Pressable>; })}</View><Text style={styles.customAvoidLabel}>Other foods to avoid</Text><View style={styles.customAvoidRow}><TextInput value={custom} onChangeText={setCustom} onSubmitEditing={submit} returnKeyType="done" placeholder="Example: kiwi" placeholderTextColor={palette.textFaint} style={styles.customAvoidInput} accessibilityLabel="Other food to avoid" /><Pressable onPress={submit} disabled={!custom.trim()} style={[styles.customAvoidAdd, !custom.trim() && styles.disabled]} accessibilityRole="button" accessibilityLabel="Add food to avoid"><Icon name="plus" color={palette.text} /></Pressable></View>{customAvoidFoods.length ? <View style={styles.customAvoidChips}>{customAvoidFoods.map((value) => <Pressable key={value} onPress={() => onRemoveCustom(value)} style={styles.customAvoidChip} accessibilityRole="button" accessibilityLabel={`Remove ${value} from foods to avoid`}><Text style={styles.customAvoidChipText}>{value}</Text><Icon name="close" size={16} color={palette.textMuted} /></Pressable>)}</View> : <Text style={styles.noneSelected}>No other foods added</Text>}<SafetyNotice /></View></Page>;
}

function BundleActions({ primaryLabel, secondaryLabel, onPrimary, onSecondary }: { primaryLabel: string; secondaryLabel: string; onPrimary: () => void; onSecondary: () => void }) {
  return <View style={styles.bundleActions}><Pressable onPress={onPrimary} accessibilityRole="button" style={styles.bundleAction}><Icon name="swap-horizontal" color={palette.cyan} /><Text style={styles.bundleActionText}>{primaryLabel}</Text></Pressable><Pressable onPress={onSecondary} accessibilityRole="button" style={styles.bundleAction}><Icon name="plus-circle-outline" color={palette.lavender} /><Text style={styles.bundleActionText}>{secondaryLabel}</Text></Pressable></View>;
}

function LibraryActions({ category, onCustom, onViewMore }: { category: 'all' | IngredientCategory; onCustom: (category: IngredientCategory) => void; onViewMore: (category: 'all' | IngredientCategory) => void }) {
  return <View style={styles.libraryActions}><Text style={styles.libraryTitle}>Need something else?</Text><View style={styles.libraryButtons}><Pressable onPress={() => onViewMore(category)} accessibilityRole="button" accessibilityLabel="View more ingredients" style={styles.libraryButton}><Icon name="bookshelf" size={20} color={palette.cyan} /><Text style={styles.libraryButtonText}>View more</Text></Pressable><Pressable onPress={() => onCustom(category === 'all' ? 'flavoring' : category)} accessibilityRole="button" accessibilityLabel="Enter a custom ingredient" style={styles.libraryButton}><Icon name="pencil-plus-outline" size={20} color={palette.lavender} /><Text style={styles.libraryButtonText}>Enter my own</Text></Pressable></View></View>;
}

function IngredientSummary({ items, ingredients }: { items: RecipeIngredient[]; ingredients: Ingredient[] }) {
  const visible = items.slice(0, 6);
  return <GlassCard style={styles.summaryCard}><View style={styles.summaryHeadingRow}><Icon name="format-list-checks" color={palette.cyan} size={22} /><Text style={styles.summaryHeading}>{items.length} ingredient{items.length === 1 ? '' : 's'} in your pint</Text></View>{visible.map((item) => { const ingredient = ingredients.find((candidate) => candidate.id === item.ingredientId); if (!ingredient) return null; return <View key={item.ingredientId} style={styles.summaryRow}><View style={styles.summaryIcon}><Icon name={ingredientIcon(ingredient)} color={palette.lavender} size={19} /></View><View style={styles.flex}><Text style={styles.summaryName}>{ingredient.name}</Text><Text style={styles.summaryRole}>{ingredient.subtitle || ingredient.category.replace('-', ' ')}</Text></View><Text style={styles.summaryAmount}>{Number(item.amount.toFixed(1))} {item.unit}</Text></View>; })}{items.length > visible.length ? <Text style={styles.summaryMore}>+{items.length - visible.length} more ingredient{items.length - visible.length === 1 ? '' : 's'}</Text> : null}</GlassCard>;
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
  return <View style={styles.customOverlay}><View style={styles.customSheet}><View style={styles.overlayHeading}><View><Text style={styles.eyebrow}>ADD TO THIS PINT</Text><Text style={styles.overlayTitle}>Enter your own</Text></View><Pressable onPress={onClose} style={styles.closeFix} accessibilityRole="button" accessibilityLabel="Close custom ingredient"><Icon name="close" color={palette.text} size={22} /></Pressable></View><OverflowAwareScroll testID="custom-ingredient-scroll" style={styles.customScroll} contentContainerStyle={styles.customContent} keyboardShouldPersistTaps="handled"><TextInput value={name} onChangeText={setName} placeholder="Ingredient name" placeholderTextColor={palette.textFaint} style={styles.customInput} accessibilityLabel="Custom ingredient name" /><View style={styles.customUnits}>{(['g', 'ml', 'tsp'] as Unit[]).map((option) => <Pressable key={option} onPress={() => setUnit(option)} style={[styles.customUnit, unit === option && styles.customUnitActive]} accessibilityRole="radio" accessibilityState={{ selected: unit === option }}><Text style={styles.customUnitText}>{option}</Text></Pressable>)}</View><TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Reference amount" placeholderTextColor={palette.textFaint} style={styles.customInput} accessibilityLabel="Custom ingredient reference amount" /><View style={styles.customNutrients}>{[['Calories', calories, setCalories], ['Protein g', protein, setProtein], ['Carbs g', carbs, setCarbs], ['Sugar g', sugar, setSugar], ['Fat g', fat, setFat]].map(([label, value, setter]) => <TextInput key={String(label)} value={String(value)} onChangeText={setter as (value: string) => void} keyboardType="decimal-pad" placeholder={String(label)} placeholderTextColor={palette.textFaint} style={styles.customNutrient} accessibilityLabel={String(label)} />)}</View><Text style={styles.customNote}>The tutorial will keep the Back, Creamy, and Continue controls visible.</Text><GradientButton title="Add to this pint" icon="plus" disabled={!name.trim()} onPress={submit} /></OverflowAwareScroll></View></View>;
}

function TutorialIngredientPicker({ category, customCategory, allowedIds, title = 'Add more ingredients', ingredients, selectedIds, onSelect, onClose, onCustom }: { category: 'all' | IngredientCategory; customCategory?: IngredientCategory; allowedIds?: string[]; title?: string; ingredients: Ingredient[]; selectedIds: string[]; onSelect: (ingredient: Ingredient) => void; onClose: () => void; onCustom: (category: IngredientCategory) => void }) {
  const [query, setQuery] = useState('');
  const entrance = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: reducedMotion ? 0 : 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [entrance, reducedMotion]);
  const visible = ingredients.filter((ingredient) => {
    const matchesCategory = (category === 'all' || ingredient.category === category) && (!allowedIds || allowedIds.includes(ingredient.id));
    const needle = query.trim().toLowerCase();
    return matchesCategory && (!needle || `${ingredient.name} ${ingredient.subtitle} ${ingredient.brand ?? ''}`.toLowerCase().includes(needle));
  });
  return <Animated.View style={[styles.libraryOverlay, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [42, 0] }) }] }]}><View style={styles.librarySheet}><View style={styles.overlayHeading}><View><Text style={styles.eyebrow}>INGREDIENT LIBRARY</Text><Text style={styles.overlayTitle}>{title}</Text></View><Pressable onPress={onClose} style={styles.closeFix} accessibilityRole="button" accessibilityLabel="Close ingredient library"><Icon name="close" color={palette.text} size={22} /></Pressable></View><SearchField value={query} onChangeText={setQuery} placeholder="Search ingredients" /><Text style={styles.libraryScrollHint}>Choose any · selected items have a check</Text><OverflowAwareScroll testID="tutorial-library-scroll" style={styles.libraryScroll} contentContainerStyle={styles.libraryScrollContent} keyboardShouldPersistTaps="handled">{visible.map((ingredient) => { const selected = selectedIds.includes(ingredient.id); return <Pressable key={ingredient.id} onPress={() => onSelect(ingredient)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${ingredient.name}`} style={[styles.pickerIngredient, selected && styles.pickerIngredientSelected]}><View style={styles.pickerIngredientIcon}><Icon name={ingredientIcon(ingredient)} color={selected ? palette.success : palette.lavender} /></View><View style={styles.flex}><Text style={styles.pickerIngredientName}>{ingredient.name}</Text><Text style={styles.pickerIngredientMeta}>{ingredient.subtitle || ingredient.category.replace('-', ' ')}</Text></View><Icon name={selected ? 'check-circle' : 'plus-circle-outline'} color={selected ? palette.success : palette.cyan} /></Pressable>; })}{!visible.length ? <Text style={styles.emptyLibrary}>No matching ingredients. Try another search.</Text> : null}<Pressable onPress={() => onCustom(customCategory ?? (category === 'all' ? 'flavoring' : category))} style={styles.inlineCustomButton} accessibilityRole="button"><Icon name="pencil-plus-outline" color={palette.lavender} /><Text style={styles.inlineCustomText}>Enter my own ingredient</Text></Pressable></OverflowAwareScroll></View></Animated.View>;
}

function InstructionList({ steps }: { steps: string[] }) {
  return <GlassCard style={styles.instructionList}>{steps.map((step, index) => <View key={step} style={styles.instructionRow}><View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{index + 1}</Text></View><Text style={styles.instructionText}>{step}</Text></View>)}</GlassCard>;
}

function FullInstructionOverlay({ open, label, steps, onClose }: { open: boolean; label: string; steps: string[]; onClose: () => void }) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const reducedMotion = useReducedMotion();
  const hint = label === 'Why a full 24 hours?'
    ? 'Continue when the pint is completely solid, upright, and level.'
    : 'When the cycle stops, open the pint and continue to the texture check.';
  useEffect(() => {
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: reducedMotion ? 0 : 260, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [open, progress, reducedMotion]);
  return <Animated.View pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'yes' : 'no-hide-descendants'} style={[styles.fullInstructionOverlay, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}><DisclosureButton label={label} open onPress={onClose} /><OverflowAwareScroll testID="tutorial-instructions-scroll" style={styles.overlayScroll} contentContainerStyle={styles.overlayScrollContent}><InstructionList steps={steps} /><Text style={styles.overlayHint}>{hint}</Text></OverflowAwareScroll></Animated.View>;
}

function TextureChoiceList({ selected, onPress }: { selected: TutorialTextureResult | null; onPress: (id: string) => void }) {
  return <View style={styles.textureList} accessibilityRole="radiogroup">{TEXTURE_CHOICES.map((choice) => {
    const active = selected === choice.id;
    return <Pressable key={choice.id} onPress={() => onPress(choice.id)} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`${choice.title}. ${choice.detail}${choice.id === 'perfect' ? '. Recommended' : ''}`} style={[styles.textureChoice, active && styles.textureChoiceActive]}><View style={[styles.textureIcon, toneStyle[choice.tone]]}><Icon name={choice.icon} size={23} color={active ? palette.white : palette.text} /></View><View style={styles.flex}><View style={styles.textureTitleRow}><Text style={styles.textureTitle}>{choice.title}</Text>{choice.id === 'perfect' ? <Text style={styles.textureRecommended}>RECOMMENDED</Text> : null}</View><Text style={styles.textureDetail}>{choice.detail}</Text></View>{active ? <Icon name="check-circle" size={22} color={palette.cyan} /> : null}</Pressable>;
  })}</View>;
}

function FocusedAmountPage({ ingredient, item, settings, compact, recommendedAmount: amount, position, total, onChange, onRemove, onPrevious, onNext }: { ingredient: Ingredient; item: RecipeIngredient; settings: UserSettings; compact: boolean; recommendedAmount: number; position: number; total: number; onChange: (amount: number, manual: boolean) => void; onRemove: () => void; onPrevious: () => void; onNext: () => void }) {
  const pager = total > 1 ? <View style={styles.editorPager}><Pressable disabled={position <= 1} onPress={onPrevious} style={[styles.editorPagerButton, position <= 1 && styles.disabled]} accessibilityRole="button"><Text style={styles.editorPagerText}>Previous</Text></Pressable><Text style={styles.editorPagerCount}>{position} of {total}</Text><Pressable disabled={position >= total} onPress={onNext} style={[styles.editorPagerButton, position >= total && styles.disabled]} accessibilityRole="button"><Text style={styles.editorPagerText}>Next</Text></Pressable></View> : null;
  const editor = <TutorialAmountEditor item={item} ingredient={ingredient} settings={settings} recommendedAmount={amount} onChange={onChange} onRemove={onRemove} />;
  if (compact) return <View style={styles.compactEditorPage}><Text style={styles.compactEditorHint}>Type an amount or use minus and plus. Zero removes it.</Text>{pager}{editor}</View>;
  return <Page icon={ingredientIcon(ingredient)} eyebrow="ADJUST ONE INGREDIENT" title={ingredient.name} intro="Type an amount or use minus and plus. Reaching zero removes it.">{pager}{editor}<Text style={styles.detailText}>Amounts are stored in metric units, so changing the display unit never changes the recipe.</Text></Page>;
}

function Page({ icon, eyebrow, title, children, overlay }: { icon: IconName; eyebrow: string; title: string; intro?: string; children: React.ReactNode; overlay?: React.ReactNode }) {
  return <View style={styles.page}><View style={styles.pageHeading}><View style={styles.pageIcon}><Icon name={icon} size={28} color={palette.pink} /></View><View style={styles.headingCopy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text></View></View><View style={styles.pageBody}><OverflowAwareScroll testID="tutorial-page-scroll" contentContainerStyle={styles.pageBodyContent} keyboardShouldPersistTaps="handled">{children}</OverflowAwareScroll>{overlay}</View></View>;
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

function ChoicePager({ choices, selected, compact, multi = false, allVisible = false, dense = false, recommendedId, onPress }: { choices: Choice[]; selected: string[]; compact: boolean; multi?: boolean; allVisible?: boolean; dense?: boolean; recommendedId?: string; onPress: (id: string) => void }) {
  const pageSize = allVisible ? choices.length : compact ? 2 : 4;
  const [page, setPage] = useState(0);
  const orderedChoices = recommendedId
    ? [...choices.filter((choice) => choice.id !== recommendedId), ...choices.filter((choice) => choice.id === recommendedId)]
    : choices;
  const pages = Math.max(1, Math.ceil(orderedChoices.length / pageSize));
  const visible = orderedChoices.slice(page * pageSize, page * pageSize + pageSize);
  return <View style={styles.choicePager}><View style={styles.choiceGrid}>{visible.map((choice) => {
    const active = selected.includes(choice.id);
    return <Pressable key={choice.id} onPress={() => onPress(choice.id)} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={multi ? { checked: active } : { selected: active }} accessibilityLabel={`${choice.title}. ${choice.detail}${choice.id === recommendedId ? '. Recommended' : ''}`} style={({ pressed }) => [styles.choice, dense && styles.choiceDense, active && styles.choiceActive, pressed && styles.pressed]}><View style={[styles.choiceArt, dense && styles.choiceArtDense, toneStyle[choice.tone]]}><Icon name={choice.icon} size={dense ? 22 : 31} color={active ? palette.white : palette.text} /></View>{choice.id === recommendedId ? <Text style={styles.choiceRecommended}>RECOMMENDED</Text> : null}<Text style={[styles.choiceTitle, dense && styles.choiceTitleDense]}>{choice.title}</Text><Text style={[styles.choiceDetail, dense && styles.choiceDetailDense]}>{choice.detail}</Text>{active ? <View style={styles.check}><Icon name="check" size={15} color={palette.ink} /></View> : null}</Pressable>;
  })}</View>{pages > 1 ? <View style={styles.pagerRow}><Pressable disabled={page === 0} onPress={() => setPage((value) => Math.max(0, value - 1))} style={[styles.pageButton, page === 0 && styles.disabled]} accessibilityRole="button"><Text style={styles.pageButtonText}>Previous</Text></Pressable><Text style={styles.pageCount}>{page + 1} of {pages}</Text><Pressable disabled={page === pages - 1} onPress={() => setPage((value) => Math.min(pages - 1, value + 1))} style={[styles.pageButton, page === pages - 1 && styles.disabled]} accessibilityRole="button"><Text style={styles.pageButtonText}>More</Text></Pressable></View> : null}</View>;
}

function MachineChoiceGrid({ choices, selected, onSelect }: { choices: Choice[]; selected: string; onSelect: (id: string) => void }) {
  return <View style={styles.machineGridWrap}><View style={styles.machineGrid}>{choices.map((choice) => <Pressable key={choice.id} onPress={() => onSelect(choice.id)} accessibilityRole="radio" accessibilityState={{ selected: selected === choice.id }} accessibilityLabel={`${choice.title}. ${choice.detail}`} style={[styles.machineChoice, selected === choice.id && styles.machineChoiceActive]}><View style={[styles.machineChoiceIcon, toneStyle[choice.tone]]}><Icon name={choice.icon} color={selected === choice.id ? palette.white : palette.text} size={25} /></View><Text style={styles.machineChoiceTitle}>{choice.title}</Text><Text style={styles.machineChoiceDetail}>{choice.detail}</Text>{selected === choice.id ? <View style={styles.machineCheck}><Icon name="check-circle" color={palette.success} size={18} /></View> : null}</Pressable>)}</View></View>;
}

function AdjustButton({ ids, label, names, onPress }: { ids: string[]; label: string; names: string; onPress: () => void }) {
  return <Pressable disabled={!ids.length} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Adjust amounts. ${names}`} style={({ pressed }) => [styles.adjust, !ids.length && styles.disabled, pressed && styles.pressed]}><View style={styles.adjustIcon}><Icon name="tune-variant" color={palette.cyan} /></View><View style={styles.flex}><Text style={styles.adjustLabel}>{label}</Text><Text style={styles.adjustNames} numberOfLines={2}>{names || 'Choose at least one option'}</Text></View><Text style={styles.adjustAction}>Adjust amounts</Text></Pressable>;
}

function TutorialProgress({ stage }: { stage: TutorialStage }) {
  const index = TUTORIAL_STAGES.indexOf(stage);
  const phase = index === 0 ? 'Setup' : index === 1 ? 'Your needs' : index <= 4 ? 'Build' : index === 5 ? 'Freeze' : index <= 7 ? 'Finish' : 'Complete';
  return <View style={styles.progress}><View style={styles.progressTop}><Text style={styles.progressPhase}>{phase}</Text><Text style={styles.progressCount}>{index + 1} of {TUTORIAL_STAGES.length}</Text></View><View style={styles.dots}>{TUTORIAL_STAGES.map((value, dotIndex) => <View key={value} style={[styles.dot, dotIndex <= index && styles.dotActive]} />)}</View></View>;
}

function TutorialFooter({ stage, busy, disabled, amountMl, capacityMl, addition, creamyEnabled, tipsEnabled, motionEnabled, dismissedTipIds, onDismissTip, editorOpen, actionTitle, onBack, onNext, onFreezeNow, onFreezeLater }: { stage: TutorialStage; busy: boolean; disabled: boolean; amountMl: number; capacityMl: number; addition: TutorialAddition; creamyEnabled: boolean; tipsEnabled: boolean; motionEnabled: boolean; dismissedTipIds: string[]; onDismissTip: (id: string) => void; editorOpen: boolean; actionTitle?: string; onBack: () => void; onNext: () => void; onFreezeNow: () => void; onFreezeLater: () => void }) {
  const { width, height } = useWindowDimensions();
  const fullTitle = editorOpen ? 'Done' : actionTitle ?? (stage === 'base' && disabled ? 'Choose base' : stage === 'review' && disabled ? 'Fix fill' : stage === 'freeze' ? busy ? 'Starting…' : 'Start timer' : stage === 'complete' ? busy ? 'Saving…' : 'Save pint' : 'Continue');
  const narrow = width < 370;
  const title = narrow ? ({ 'Start machine': 'Start', 'Cycle finished': 'Finished', 'Save pint': 'Save', 'Final cycle': 'Next', 'Choose base': 'Choose', 'Fix fill': 'Fix' }[fullTitle] ?? fullTitle) : fullTitle;
  const primaryAction = stage === 'freeze' ? onFreezeNow : onNext;
  const tip = creamyTips[stage];
  const creamyTip = useMemo(() => tip ? { id: `tutorial-${stage}`, ...tip } : undefined, [stage, tip]);
  const cycleAction = actionTitle === 'Start machine' || actionTitle === 'Cycle finished';
  return (
    <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
      <View style={styles.footer}>
        {stage === 'freeze' ? <Pressable onPress={onFreezeLater} disabled={busy} accessibilityRole="button" accessibilityLabel="Proceed without timer" style={({ pressed }) => [styles.freezeSkipButton, pressed && styles.pressed, busy && styles.disabled]}><Text style={styles.freezeSkipText}>Proceed without timer</Text><Icon name="timer-off-outline" size={18} color={palette.text} /></Pressable> : null}
        <View style={styles.footerControlArea}>
          {creamyEnabled ? <FooterCreamy wide amountMl={amountMl} capacityMl={capacityMl} addition={addition} tip={creamyTip} tipEnabled={tipsEnabled} tipDismissed={dismissedTipIds.includes(`tutorial-${stage}`) || !proactiveCreamyStages.has(stage) || height < 650} tipLifted={stage === 'freeze'} motionEnabled={motionEnabled} celebrate={stage === 'complete'} onDismissTip={onDismissTip} /> : <View style={styles.mascotSpacer} />}
          <View style={styles.footerButtonOverlay} pointerEvents="box-none">
            <View style={styles.footerSide}><Pressable onPress={onBack} disabled={busy} accessibilityRole="button" accessibilityLabel="Previous tutorial page" style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>{!narrow ? <Icon name="arrow-left" /> : null}<Text style={styles.backText}>Back</Text></Pressable></View>
            <View style={styles.footerCenterGap} pointerEvents="none" />
            <View style={styles.footerSide}><GradientButton title={title} accessibilityLabel={fullTitle} icon={narrow ? undefined : stage === 'freeze' ? 'timer-outline' : stage === 'complete' ? 'check' : cycleAction ? 'play-circle-outline' : 'arrow-right'} disabled={disabled} onPress={primaryAction} /></View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
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

function makeTutorialRecipe(draft: TutorialDraft, items: RecipeIngredient[], ingredients: Ingredient[]) {
  const presentation = tutorialRecipePresentation(draft);
  const mixIns = tutorialMixInItems(draft, ingredients);
  const recipe = generateRecipe({ name: presentation.name, style: 'ice-cream', items: mixIns.length ? [...items, ...mixIns] : items, ingredients, existingId: draft.recipeId || undefined, imageKey: presentation.imageKey, photoUri: draft.photoUri });
  recipe.directions = [
    'Blend the base ingredients until completely smooth.',
    'Pour into the correct container without exceeding its MAX line.',
    'Freeze upright and level with the storage lid for at least 24 hours.',
    'Run the recommended first-spin program and inspect the texture.',
    draft.secondCycleProgram === 'mix-in'
      ? 'Make a hole with a spoon, add one small combined handful of mix-ins, then run Mix-In as the final cycle.'
      : draft.secondCycleProgram === 'respin'
        ? 'Add the confirmed correction, then run Re-Spin as the final cycle. Fold hard chunks in by hand afterward.'
        : 'If the first spin is perfect and no mix-ins are selected, stop processing.',
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
  keyboardAvoider: { flex: 1 },
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
  pageBody: { flex: 1, minHeight: 0, marginTop: spacing.sm },
  pageBodyContent: { gap: spacing.xs, paddingBottom: spacing.lg },
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
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  choice: { width: '48%', minHeight: 98, padding: 9, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, overflow: 'hidden' },
  choiceDense: { minHeight: 68, padding: 7, paddingLeft: 43 },
  choiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.10)' },
  choiceArt: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  choiceArtDense: { position: 'absolute', left: 7, top: 9, width: 30, height: 30, borderRadius: 10, marginBottom: 0 },
  choiceTitle: { color: palette.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  choiceTitleDense: { fontSize: 14, lineHeight: 18 },
  choiceDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 17, marginTop: 1 },
  choiceDetailDense: { fontSize: 13, lineHeight: 17 },
  choiceRecommended: { color: palette.pink, fontSize: 13, lineHeight: 17, fontWeight: '900', letterSpacing: 0.4, marginBottom: 2 },
  machineGridWrap: { gap: spacing.xs },
  machineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  machineChoice: { width: '31%', minHeight: 96, padding: 6, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, alignItems: 'center' },
  machineChoiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.12)' },
  machineChoiceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  machineChoiceTitle: { color: palette.text, fontSize: 13, lineHeight: 17, fontWeight: '900', textAlign: 'center' },
  machineChoiceDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 17, textAlign: 'center', marginTop: 2 },
  machineCheck: { position: 'absolute', top: 5, right: 5 },
  check: { position: 'absolute', top: 8, right: 8, width: 23, height: 23, borderRadius: 12, backgroundColor: palette.success, alignItems: 'center', justifyContent: 'center' },
  pagerRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageButton: { minWidth: 80, minHeight: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  pageButtonText: { color: palette.text, fontSize: 13, fontWeight: '900' },
  pageCount: { color: palette.textMuted, fontSize: 13, fontWeight: '800' },
  adjust: { minHeight: 62, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, padding: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  adjustIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(78,217,232,0.10)', alignItems: 'center', justifyContent: 'center' },
  adjustLabel: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  adjustNames: { color: palette.textMuted, fontSize: 13, lineHeight: 17, marginTop: 1 },
  adjustAction: { color: palette.cyan, fontSize: 13, fontWeight: '900' },
  optionalHint: { color: palette.textMuted, fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center', paddingVertical: spacing.xs },
  preselectedNote: { color: palette.success, fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  bundleActions: { flexDirection: 'row', gap: spacing.xs },
  bundleAction: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.28)', backgroundColor: palette.panelRaised, paddingHorizontal: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  bundleActionText: { flexShrink: 1, color: palette.text, fontSize: 13, lineHeight: 17, fontWeight: '900', textAlign: 'center' },
  foodNeedsContent: { gap: spacing.xs, paddingBottom: spacing.lg },
  foodSectionHeading: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foodSectionTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  foodSectionCount: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 1 },
  foodSectionDivider: { height: 1, backgroundColor: palette.border, marginVertical: spacing.xs },
  customAvoidLabel: { color: palette.text, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: spacing.xs },
  safetyNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 8, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(246,197,106,0.4)', backgroundColor: 'rgba(246,197,106,0.08)' },
  safetyNoticeText: { flex: 1, color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  customAvoidRow: { flexDirection: 'row', gap: spacing.xs },
  customAvoidInput: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, color: palette.text, paddingHorizontal: spacing.sm, fontSize: 15 },
  customAvoidAdd: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: palette.panelRaised, borderWidth: 1, borderColor: palette.cyan, alignItems: 'center', justifyContent: 'center' },
  customAvoidChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  customAvoidChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, paddingHorizontal: spacing.xs },
  customAvoidChipText: { color: palette.text, fontSize: 13, fontWeight: '800' },
  noneSelected: { color: palette.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChoice: { width: '31.8%', minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  allergyChoiceActive: { borderColor: palette.cyan, backgroundColor: 'rgba(78,217,232,0.11)' },
  allergyChoiceText: { flexShrink: 1, color: palette.text, fontSize: 13, lineHeight: 17, fontWeight: '800', textAlign: 'center' },
  editorPager: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorPagerButton: { minWidth: 88, minHeight: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  editorPagerText: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  editorPagerCount: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  compactEditorPage: { flex: 1, minHeight: 0, gap: spacing.xs },
  compactEditorHint: { color: palette.textMuted, fontSize: 14, lineHeight: 19, textAlign: 'center' },
  overflowAlert: { padding: spacing.sm, borderColor: palette.danger, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  overflowTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  overflowText: { color: palette.textMuted, fontSize: 14, lineHeight: 19 },
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
  summaryCard: { padding: spacing.sm, gap: 7, borderColor: 'rgba(78,217,232,0.28)' },
  summaryHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: 3 },
  summaryHeading: { color: palette.text, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  summaryRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  summaryIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(174,134,255,0.12)' },
  summaryName: { color: palette.text, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  summaryRole: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
  summaryAmount: { color: palette.cyan, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  summaryMore: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  libraryActions: { gap: 7, marginTop: 4, marginBottom: spacing.xs },
  libraryTitle: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  libraryButtons: { flexDirection: 'row', gap: spacing.sm },
  libraryButton: { flex: 1, minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.xs },
  libraryButtonText: { color: palette.text, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  instructionList: { borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.28)', backgroundColor: 'rgba(78,217,232,0.06)', padding: spacing.md, gap: spacing.md },
  instructionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingBottom: spacing.xs },
  freezeGuidance: { padding: spacing.sm, borderColor: 'rgba(78,217,232,0.35)', gap: 4 },
  freezeGuidanceTitle: { color: palette.cyan, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  freezeGuidanceText: { color: palette.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  instructionNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(78,217,232,0.18)', alignItems: 'center', justifyContent: 'center' },
  instructionNumberText: { color: palette.cyan, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  instructionText: { flex: 1, color: palette.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  inlineInstructionScroll: { maxHeight: 420 },
  inlineInstructionContent: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
  textureList: { gap: 4 },
  textureCheckHeading: { color: palette.text, fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: spacing.xs },
  textureChoice: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelSoft, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, paddingVertical: 4 },
  textureChoiceActive: { borderColor: palette.pink, borderWidth: 2, backgroundColor: 'rgba(241,78,155,0.11)' },
  textureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  textureTitle: { color: palette.text, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  textureRecommended: { color: palette.success, fontSize: 13, lineHeight: 17, fontWeight: '900', letterSpacing: 0.3 },
  textureDetail: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
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
  correctionCard: { padding: spacing.sm, borderColor: 'rgba(246,197,106,0.42)' },
  guidanceSource: { color: palette.cyan, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 0.7, marginBottom: 3 },
  correctionTitle: { color: palette.text, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  correctionText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  skipCorrection: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised },
  skipCorrectionText: { color: palette.textMuted, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  readyCard: { padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(92,224,169,0.38)' },
  readyCardText: { flex: 1, color: palette.text, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  sectionLabel: { color: palette.cyan, fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 2 },
  manualFoldNote: { color: palette.warning, fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  finalCycleNote: { color: palette.cyan, fontSize: 14, lineHeight: 20, fontWeight: '900', textAlign: 'center' },
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
  machineStatus: { minHeight: 104, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(241,78,155,0.42)' },
  machineStatusActive: { borderColor: 'rgba(78,217,232,0.58)', backgroundColor: 'rgba(78,217,232,0.10)' },
  machineStatusIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  machineStatusTitle: { color: palette.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  machineStatusText: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  machineTimingNote: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginTop: -4 },
  runningPulseRow: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: 'rgba(78,217,232,0.32)', backgroundColor: 'rgba(78,217,232,0.08)', paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  runningDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.cyan, shadowColor: palette.cyan, shadowOpacity: 0.7, shadowRadius: 7 },
  runningText: { flex: 1, color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  spinPanel: { borderRadius: radii.lg, borderWidth: 1, borderColor: 'rgba(78,217,232,0.42)', backgroundColor: '#070D18', padding: spacing.sm },
  lcdLabel: { color: palette.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  lcdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: 5 },
  lcdButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(78,217,232,0.38)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111D2A' },
  lcdDisplay: { minWidth: 120, borderRadius: 10, borderWidth: 2, borderColor: '#284D4C', backgroundColor: '#071614', paddingHorizontal: spacing.xs, paddingVertical: 3, alignItems: 'center', shadowColor: '#63FFC9', shadowOpacity: 0.28, shadowRadius: 8 },
  lcdDigits: { color: '#8FFFD5', fontSize: 30, lineHeight: 34, fontWeight: '900', fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', web: 'monospace' }), letterSpacing: 2, textShadowColor: 'rgba(143,255,213,0.55)', textShadowRadius: 6 },
  lcdUnit: { color: '#559C84', fontSize: 13, lineHeight: 17, fontWeight: '900', letterSpacing: 1 },
  lcdNote: { color: palette.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 6 },
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
  footerSafe: { position: 'relative', zIndex: 50, backgroundColor: 'rgba(8,12,31,0.99)', borderTopWidth: 1, borderTopColor: palette.border },
  footer: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 6 },
  freezeSkipButton: { minHeight: 44, marginBottom: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: '#293553', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.md },
  freezeSkipText: { color: palette.text, fontSize: 15, fontWeight: '800' },
  footerControlArea: { position: 'relative', minHeight: 104 },
  footerButtonOverlay: { position: 'absolute', left: 0, right: 0, bottom: 19, zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerSide: { flex: 1, minWidth: 0 },
  footerCenterGap: { width: 86 },
  backButton: { width: '100%', minHeight: 52, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.panelRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  backText: { color: palette.text, fontSize: 15, fontWeight: '900' },
  mascotSpacer: { width: '100%', minHeight: 104 },
});
