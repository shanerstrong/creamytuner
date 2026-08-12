import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { TUTORIAL_CREAMY_FRAMES } from '@/src/components/creamy/mascot-assets';
import { CREAMY_DAD_JOKES } from '@/src/components/creamy/dad-jokes';
import { FooterCreamy } from '@/src/components/tutorial/footer-creamy';
import { OverflowAwareScroll } from '@/src/components/tutorial/overflow-aware-scroll';
import { TutorialAmountEditor } from '@/src/components/tutorial/tutorial-amount-editor';
import { seededIngredients } from '@/src/data/ingredients';
import { machineById, machines } from '@/src/data/machines';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { CURRENT_ONBOARDING_VERSION, TUTORIAL_STAGES, fitTutorialBaseItems, initializeTutorialStageRecommendations, normalizeTutorialDraft, tutorialBaseTemplates, tutorialFinalProgram, tutorialItems, tutorialMixInItem, tutorialRecipePresentation, tutorialRecommendation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { tutorialDraftSchema, userSettingsSchema } from '@/src/types';

describe('first-pint tutorial', () => {
  test('existing settings default into the new welcome and tutorial', () => {
    const settings = userSettingsSchema.parse({ onboarded: true });
    expect(settings.onboardingVersion).toBeLessThan(CURRENT_ONBOARDING_VERSION);
    expect(settings.tutorialDraft.stage).toBe('machine');
  });

  test('food settings and Creamy coaching preferences persist through schema parsing', () => {
    const settings = userSettingsSchema.parse({ dietaryPreferences: ['vegan'], foodAllergies: ['peanuts', 'soy'], customAvoidFoods: ['kiwi'], creamyTipsEnabled: false, creamyMotionEnabled: false, dismissedCreamyTipIds: ['tutorial-base'], profileDisplayName: 'Alex', profilePhotoUri: 'file:///profile.jpg' });
    expect(settings.dietaryPreferences).toEqual(['vegan']);
    expect(settings.foodAllergies).toEqual(['peanuts', 'soy']);
    expect(settings.customAvoidFoods).toEqual(['kiwi']);
    expect(settings.creamyTipsEnabled).toBe(false);
    expect(settings.creamyMotionEnabled).toBe(false);
    expect(settings.dismissedCreamyTipIds).toEqual(['tutorial-base']);
    expect(settings.profileDisplayName).toBe('Alex');
    expect(settings.profilePhotoUri).toBe('file:///profile.jpg');
  });

  test('old single-base drafts migrate without losing the amount', () => {
    const oldDraft = tutorialDraftSchema.parse({ version: 1, baseAdded: true, baseId: 'soy-milk', baseAmountMl: 325 });
    const migrated = normalizeTutorialDraft(oldDraft);
    expect(migrated.version).toBe(5);
    expect(migrated.baseItems).toEqual([{ ingredientId: 'soy-milk', amount: 325, unit: 'ml' }]);
  });

  test('versionless legacy drafts migrate without losing their progress', () => {
    const migrated = tutorialDraftSchema.parse({ step: 3, baseAdded: true, baseId: 'soy-milk', baseAmountMl: 325 });
    expect(migrated).toMatchObject({ version: 5, stage: 'taste' });
    expect(migrated.baseItems).toContainEqual({ ingredientId: 'soy-milk', amount: 325, unit: 'ml' });
  });

  test('migrates the fifteen-page flow into nine visible stages', () => {
    expect(TUTORIAL_STAGES).toHaveLength(9);
    expect(TUTORIAL_STAGES).toEqual(['machine', 'food-needs', 'base', 'taste', 'review', 'freeze', 'first-cycle', 'final-cycle', 'complete']);
    expect(TUTORIAL_STAGES).not.toContain('correction');
    expect(TUTORIAL_STAGES).not.toContain('mix-ins');
    expect(TUTORIAL_STAGES).not.toContain('respin');
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'dietary' }).stage).toBe('food-needs');
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'helper' }).stage).toBe('base');
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'sweetener' }).stage).toBe('taste');
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'blend' }).stage).toBe('review');
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'evaluate' })).toMatchObject({ stage: 'first-cycle', firstCycleState: 'check' });
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'correction' })).toMatchObject({ stage: 'final-cycle', finalCycleState: 'prepare' });
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'second-cycle' })).toMatchObject({ stage: 'final-cycle', finalCycleState: 'ready' });
    expect(tutorialDraftSchema.parse({ version: 3, stage: 'respin' })).toMatchObject({ stage: 'final-cycle', finalCycleState: 'check' });
  });

  test('texture answers support an unselected state', () => {
    const draft = tutorialDraftSchema.parse({ textureResult: null, finalTextureResult: null });
    expect(draft.textureResult).toBeNull();
    expect(draft.finalTextureResult).toBeNull();
  });

  test('a kitchen-unit minus reaches zero and removes the ingredient', async () => {
    const ingredient = seededIngredients.find((item) => item.id === 'milk-2');
    expect(ingredient).toBeTruthy();
    const onRemove = jest.fn();
    const screen = await render(<TutorialAmountEditor item={{ ingredientId: 'milk-2', amount: 60, unit: 'ml' }} ingredient={ingredient!} settings={userSettingsSchema.parse({ units: 'us', measurementMode: 'kitchen' })} recommendedAmount={100} onChange={jest.fn()} onRemove={onRemove} />);
    await fireEvent.press(screen.getByLabelText('Decrease 2% Milk'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('liquid sweeteners open with friendly spoon amounts and a clear portion note', async () => {
    const ingredient = seededIngredients.find((item) => item.id === 'honey');
    expect(ingredient).toBeTruthy();
    const onChange = jest.fn();
    const screen = await render(<TutorialAmountEditor item={{ ingredientId: 'honey', amount: 3, unit: 'tsp' }} ingredient={ingredient!} settings={userSettingsSchema.parse({ units: 'us', measurementMode: 'kitchen' })} recommendedAmount={3} onChange={onChange} />);
    expect(screen.getByLabelText('Honey amount in teaspoons').props.value).toBe('3');
    expect(screen.getByText('Precise')).toBeTruthy();
    expect(screen.getByText('1 tbsp (3 tsp) is roughly 21 g')).toBeTruthy();
  });

  test('editable cups stay consistent with the canonical recommended amount', async () => {
    const ingredient = seededIngredients.find((item) => item.id === 'coconut-milk');
    expect(ingredient).toBeTruthy();
    const screen = await render(<TutorialAmountEditor item={{ ingredientId: ingredient!.id, amount: 400, unit: 'ml' }} ingredient={ingredient!} settings={userSettingsSchema.parse({ units: 'us', measurementMode: 'kitchen' })} recommendedAmount={400} onChange={jest.fn()} />);
    expect(screen.getByLabelText(`${ingredient!.name} amount in cups`).props.value).toBe('1.67');
    expect(screen.getByText(/1.*cup/)).toBeTruthy();
  });

  test('Creamy starts empty, then every selected base and ingredient fills him', () => {
    expect(tutorialItems(tutorialDraftSchema.parse({}), seededIngredients)).toEqual([]);
    const draft = tutorialDraftSchema.parse({
      baseItems: [
        { ingredientId: 'milk-2', amount: 100, unit: 'ml' },
        { ingredientId: 'almond-milk', amount: 300, unit: 'ml' },
      ],
      selectedIngredientIds: ['whey-vanilla', 'jello-vanilla-zero', 'allulose', 'strawberries'],
      itemAmounts: { 'whey-vanilla': 35, strawberries: 80 },
      mixInId: 'cookie-pieces',
    });
    const baseItems = tutorialItems(draft, seededIngredients);
    expect(baseItems.map((item) => item.ingredientId)).toEqual(expect.arrayContaining(['milk-2', 'almond-milk', 'whey-vanilla', 'jello-vanilla-zero', 'allulose', 'strawberries']));
    expect(baseItems.find((item) => item.ingredientId === 'whey-vanilla')?.amount).toBe(35);
    expect(baseItems.some((item) => item.ingredientId === 'cookie-pieces')).toBe(false);
    expect(tutorialMixInItem(draft, seededIngredients)?.ingredientId).toBe('cookie-pieces');
  });

  test.each(machines.map((machine) => [machine.id, machine.capacityMl] as const))('base templates fit %s', (machineId, capacityMl) => {
    const templates = tutorialBaseTemplates(capacityMl);
    expect(templates).toHaveLength(3);
    for (const template of templates) {
      expect(estimateVolumeMl(template.items)).toBeLessThanOrEqual(Math.floor(machineById(machineId).capacityMl * 0.88));
      expect(template.items).toHaveLength(2);
    }
  });

  test('Fit this container preserves the base ratio and reaches the safe target', () => {
    const draft = tutorialDraftSchema.parse({
      machineId: 'classic',
      baseItems: [
        { ingredientId: 'milk-2', amount: 300, unit: 'ml' },
        { ingredientId: 'almond-milk', amount: 300, unit: 'ml' },
      ],
      selectedIngredientIds: ['whey-vanilla', 'allulose', 'strawberries'],
    });
    const capacity = machineById('classic').capacityMl;
    const fitted = { ...draft, baseItems: fitTutorialBaseItems(draft, seededIngredients, capacity) };
    expect(estimateVolumeMl(tutorialItems(fitted, seededIngredients))).toBeLessThanOrEqual(Math.floor(capacity * 0.88));
    expect(fitted.baseItems[0].amount).toBeCloseTo(fitted.baseItems[1].amount, 0);
  });

  test('recommendations react to the chosen base', () => {
    const plantDraft = tutorialDraftSchema.parse({ baseItems: tutorialBaseTemplates(709)[2].items });
    const dairyDraft = tutorialDraftSchema.parse({ baseItems: tutorialBaseTemplates(709)[1].items });
    expect(tutorialRecommendation(plantDraft, seededIngredients, 'helper')?.ingredientId).toBe('xanthan-gum');
    expect(tutorialRecommendation(dairyDraft, seededIngredients, 'helper')?.ingredientId).toBe('jello-vanilla-zero');
  });

  test('combined stages preselect only eligible recommendations once', () => {
    const restricted = tutorialDraftSchema.parse({
      stage: 'base',
      dietaryPreferences: ['vegan', 'gluten-free', 'high-protein'],
      foodAllergies: ['milk', 'tree-nuts', 'wheat', 'soy'],
      customAvoidFoods: ['banana'],
    });
    const base = initializeTutorialStageRecommendations(restricted, seededIngredients, 709, 'base');
    expect(base.baseItems.map((item) => item.ingredientId)).toEqual(['coconut-milk']);
    expect(base.selectedIngredientIds).toContain('xanthan-gum');
    expect(base.initializedRecommendationStages).toContain('base');
    const taste = initializeTutorialStageRecommendations({ ...base, stage: 'taste' }, seededIngredients, 709, 'taste');
    expect(taste.selectedIngredientIds).toContain('strawberries');
    expect(taste.selectedIngredientIds).not.toContain('banana');
    expect(initializeTutorialStageRecommendations(taste, seededIngredients, 709, 'taste')).toEqual(taste);
  });

  test('tutorial copy routes each result to a clear next action', () => {
    expect(tutorialTextureGuidance.powdery.next).toBe('Prepare the final cycle');
    expect(tutorialTextureGuidance.powdery.detail).toContain('Mix-In instead');
    expect(tutorialTextureGuidance.chalky.detail).toContain('Mix-In when adding chunks');
    expect(tutorialTextureGuidance['too-soft'].next).toBe('Refreeze before the final cycle');
    expect(tutorialRecipePresentation(tutorialDraftSchema.parse({ version: 1, flavorId: 'cocoa' })).imageKey).toBe('chocolate');
  });

  test('persists an explicit correction decision and final program', () => {
    const draft = tutorialDraftSchema.parse({ correctionDecision: 'apply', correctiveIngredientIds: ['milk-2'], secondCycleProgram: 'respin' });
    expect(draft.correctionDecision).toBe('apply');
    expect(draft.correctiveIngredientIds).toEqual(['milk-2']);
    expect(draft.secondCycleProgram).toBe('respin');
  });

  test('uses Mix-In instead of stacking Re-Spin when chunks are selected', () => {
    expect(tutorialFinalProgram(tutorialDraftSchema.parse({ textureResult: 'powdery', mixInIds: ['dark-chocolate'] }))).toBe('mix-in');
    expect(tutorialFinalProgram(tutorialDraftSchema.parse({ textureResult: 'powdery', mixInIds: [] }))).toBe('respin');
    expect(tutorialFinalProgram(tutorialDraftSchema.parse({ textureResult: 'perfect', mixInIds: [] }))).toBeNull();
  });

  test('migrates the old two-minute guide into machine-led cycle states', () => {
    const migrated = tutorialDraftSchema.parse({ version: 4, spinMinutes: 7, firstCycleState: 'instructions', finalCycleState: 'run' });
    expect(migrated).toMatchObject({ version: 5, firstCycleState: 'ready', finalCycleState: 'ready' });
    expect(migrated).not.toHaveProperty('spinMinutes');
    expect(tutorialDraftSchema.parse({ version: 5, firstCycleState: 'running', finalCycleState: 'running' })).toMatchObject({ firstCycleState: 'running', finalCycleState: 'running' });
  });

  test('footer Creamy keeps fill state accessible without visible status text', async () => {
    const addition = { kind: 'liquid' as const, nonce: 0 };
    const screen = await render(<FooterCreamy amountMl={0} capacityMl={473} addition={addition} />);
    expect(screen.queryByText('Empty')).toBeNull();
    expect(screen.getByRole('button', { name: 'Creamy mascot' }).props.accessibilityValue).toEqual({ text: 'Empty' });
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[0]]);
    expect(screen.getByTestId('creamy-mascot-talking-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[1]]);
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.accessible).toBe(false);
    const mascotStage = StyleSheet.flatten(screen.getByTestId('creamy-mascot-stage').props.style);
    expect(mascotStage.backgroundColor).toBeUndefined();
    expect(mascotStage.overflow).not.toBe('hidden');
    await screen.rerender(<FooterCreamy amountMl={240} capacityMl={473} addition={{ kind: 'fruit', nonce: 1 }} />);
    expect(screen.queryByText('Room left')).toBeNull();
    expect(screen.getByRole('button', { name: 'Creamy mascot' }).props.accessibilityValue).toEqual({ text: 'Room left' });
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[4]]);
    await screen.rerender(<FooterCreamy amountMl={426} capacityMl={473} addition={{ kind: 'fruit', nonce: 1 }} motionEnabled={false} />);
    expect(screen.queryByText('Near max')).toBeNull();
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[10]]);
    await screen.rerender(<FooterCreamy amountMl={500} capacityMl={473} addition={{ kind: 'spoon', nonce: 2 }} />);
    expect(screen.queryByText('Too full')).toBeNull();
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[12]]);
    expect(screen.getByRole('button', { name: 'Creamy mascot' })).toBeTruthy();
    expect(screen.queryByLabelText(/mascot frame/i)).toBeNull();
  });

  test('Creamy reserves layout space for a dismissible contextual tip and can replay it', async () => {
    const onDismiss = jest.fn();
    const screen = await render(<FooterCreamy amountMl={0} capacityMl={473} addition={{ kind: 'liquid', nonce: 0 }} tip={{ id: 'tutorial-base', text: 'Combine bases.', detail: 'This balances texture.', provenance: 'creamytuner' }} tipEnabled tipLifted motionEnabled={false} onDismissTip={onDismiss} />);
    expect(screen.getByText('Combine bases.')).toBeTruthy();
    expect(screen.getByText('CreamyTuner suggestion')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('creamy-tip').props.style).position).not.toBe('absolute');
    expect(StyleSheet.flatten(screen.getByTestId('creamy-mascot-stage').props.style).width).toBe(74);
    await fireEvent.press(screen.getByLabelText('Why is Creamy suggesting this?'));
    expect(screen.getByText('This balances texture.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Dismiss Creamy tip'));
    expect(onDismiss).toHaveBeenCalledWith('tutorial-base');
    await fireEvent.press(screen.getByLabelText('Creamy mascot'));
    expect(screen.getByText('Combine bases.')).toBeTruthy();
  });

  test('Creamy keeps ingredient, celebration, and twenty-tap dad-joke reactions available', async () => {
    jest.useFakeTimers();
    const addition = { kind: 'mix-in' as const, nonce: 1 };
    const screen = await render(<FooterCreamy amountMl={240} capacityMl={473} addition={addition} celebrate motionEnabled={false} />);
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[14]]);
    expect(screen.getByTestId('creamy-ingredient-effect')).toBeTruthy();
    await screen.rerender(<FooterCreamy amountMl={0} capacityMl={473} addition={addition} motionEnabled={false} />);
    const mascot = screen.getByRole('button', { name: 'Creamy mascot' });
    for (let tap = 0; tap < 20; tap += 1) await fireEvent.press(mascot);
    expect(screen.getByTestId('creamy-mascot-resting-frame').props.source).toEqual([TUTORIAL_CREAMY_FRAMES[15]]);
    await act(async () => { jest.advanceTimersByTime(700); });
    expect(screen.getByTestId('creamy-dad-joke')).toBeTruthy();
    expect(CREAMY_DAD_JOKES).toHaveLength(50);
    expect(new Set(CREAMY_DAD_JOKES).size).toBe(50);
    jest.useRealTimers();
  });

  test('overflow-aware tutorial content shows a cue until the user reaches the end', async () => {
    const screen = await render(<OverflowAwareScroll testID="responsive-tutorial"><Text>Long tutorial content</Text></OverflowAwareScroll>);
    const scroll = screen.getByTestId('responsive-tutorial-scroll');
    expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
    expect(scroll.props.persistentScrollbar).toBe(false);

    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 200, width: 320, x: 0, y: 0 } } });
    await fireEvent(scroll, 'contentSizeChange', 320, 520);
    expect(screen.getByText('More below ↓')).toBeTruthy();

    await fireEvent(scroll, 'scroll', { nativeEvent: { contentOffset: { x: 0, y: 320 }, contentSize: { width: 320, height: 520 }, layoutMeasurement: { width: 320, height: 200 } } });
    expect(screen.queryByText('More below ↓')).toBeNull();
  });
});
