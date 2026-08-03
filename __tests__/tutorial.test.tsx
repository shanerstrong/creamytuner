import { render } from '@testing-library/react-native';

import { FooterCreamy } from '@/src/components/tutorial/footer-creamy';
import { seededIngredients } from '@/src/data/ingredients';
import { machineById, machines } from '@/src/data/machines';
import { estimateVolumeMl } from '@/src/domain/nutrition';
import { CURRENT_ONBOARDING_VERSION, fitTutorialBaseItems, normalizeTutorialDraft, tutorialBaseTemplates, tutorialItems, tutorialMixInItem, tutorialRecipePresentation, tutorialRecommendation, tutorialTextureGuidance } from '@/src/domain/tutorial';
import { tutorialDraftSchema, userSettingsSchema } from '@/src/types';

describe('first-pint tutorial', () => {
  test('existing settings default into the new welcome and tutorial', () => {
    const settings = userSettingsSchema.parse({ onboarded: true });
    expect(settings.onboardingVersion).toBeLessThan(CURRENT_ONBOARDING_VERSION);
    expect(settings.tutorialDraft.step).toBe(0);
  });

  test('old single-base drafts migrate without losing the amount', () => {
    const oldDraft = tutorialDraftSchema.parse({ version: 1, baseAdded: true, baseId: 'soy-milk', baseAmountMl: 325 });
    const migrated = normalizeTutorialDraft(oldDraft);
    expect(migrated.version).toBe(2);
    expect(migrated.baseItems).toEqual([{ ingredientId: 'soy-milk', amount: 325, unit: 'ml' }]);
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

  test('tutorial copy routes each result to a clear next action', () => {
    expect(tutorialTextureGuidance.powdery.next).toBe('Re-Spin');
    expect(tutorialTextureGuidance.powdery.detail).toContain('before adding liquid');
    expect(tutorialTextureGuidance.chalky.detail).toContain('spoon or silicone spatula');
    expect(tutorialTextureGuidance['too-soft'].next).toBe('Back to freezer');
    expect(tutorialRecipePresentation(tutorialDraftSchema.parse({ flavorId: 'cocoa' })).imageKey).toBe('chocolate');
  });

  test('footer Creamy announces empty, progress, and overflow states', async () => {
    const addition = { kind: 'liquid' as const, nonce: 0 };
    const screen = await render(<FooterCreamy amountMl={0} capacityMl={473} addition={addition} />);
    expect(screen.getByText('EMPTY')).toBeTruthy();
    await screen.rerender(<FooterCreamy amountMl={240} capacityMl={473} addition={{ kind: 'fruit', nonce: 1 }} />);
    expect(screen.getByText('51%')).toBeTruthy();
    await screen.rerender(<FooterCreamy amountMl={500} capacityMl={473} addition={{ kind: 'spoon', nonce: 2 }} />);
    expect(screen.getByText('TOO FULL')).toBeTruthy();
  });
});
