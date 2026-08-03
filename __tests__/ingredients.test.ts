import { seededIngredients } from '@/src/data/ingredients';
import { ingredientSchema, userSettingsSchema } from '@/src/types';

describe('ingredient catalog', () => {
  it('ships a broad offline catalog', () => {
    expect(seededIngredients.length).toBeGreaterThanOrEqual(60);
    expect(seededIngredients.length).toBeLessThanOrEqual(75);
  });
  it('includes verified metadata on the requested branded examples', () => {
    const branded = seededIngredients.filter((item) => item.brand);
    expect(branded.length).toBeGreaterThanOrEqual(15);
    for (const ingredient of branded) {
      expect(ingredient.referenceLabel).toBeTruthy();
      expect(ingredient.sourceUrl).toMatch(/^https:\/\//);
      expect(ingredient.sourceCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('fills compatibility defaults for old ingredients and settings', () => {
    const old = ingredientSchema.parse({ id: 'old', name: 'Old item', category: 'base', subtitle: '', defaultUnit: 'ml', defaultAmount: 100, referenceAmount: 100, nutrition: { calories: 1, protein: 0, carbs: 0, sugar: 0, fat: 0 } });
    expect(old.tags).toEqual([]);
    const settings = userSettingsSchema.parse({});
    expect(settings.ingredientLibraryView).toBe('list');
    expect(settings.tutorialMode).toBe(true);
    expect(settings.firstPintCompleted).toBe(false);
    expect(settings.guidedBuilderDraft).toBeNull();
    expect(settings.activeFreezeTimer).toBeNull();
  });
  it('validates resumable guided builder drafts without a database migration', () => {
    const settings = userSettingsSchema.parse({ guidedBuilderDraft: {
      step: 3,
      mode: 'guided',
      name: 'Draft pint',
      preferences: { style: 'ice-cream', flavor: 'vanilla' },
      availableIds: ['milk-2'],
      items: [{ ingredientId: 'milk-2', amount: 240, unit: 'ml' }],
      recommendedIds: ['milk-2'],
      recommendedAmounts: { 'milk-2': 240 },
    } });
    expect(settings.guidedBuilderDraft?.version).toBe(2);
    expect(settings.guidedBuilderDraft?.stage).toBe('customize');
    expect(settings.guidedBuilderDraft?.answers).toEqual({ texture: 'creamy', flavor: 'vanilla', goal: 'classic' });
    expect(settings.guidedBuilderDraft?.items).toEqual([{ ingredientId: 'milk-2', amount: 240, unit: 'ml' }]);
  });
});
