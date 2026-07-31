import type { SQLiteDatabase } from 'expo-sqlite';
import { ingredientSchema, recipeSchema, userSettingsSchema, type Ingredient, type Recipe, type SpinSession, type UserSettings } from '@/src/types';

type PayloadRow = { payload: string };

export async function loadRecipes(db: SQLiteDatabase): Promise<Recipe[]> {
  const rows = await db.getAllAsync<PayloadRow>('SELECT payload FROM recipes ORDER BY updated_at DESC');
  return rows.map((row) => recipeSchema.parse(JSON.parse(row.payload)));
}

export async function upsertRecipe(db: SQLiteDatabase, recipe: Recipe) {
  const parsed = recipeSchema.parse(recipe);
  await db.runAsync(
    `INSERT INTO recipes (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    parsed.id,
    JSON.stringify(parsed),
    parsed.createdAt,
    parsed.updatedAt,
  );
}

export const removeRecipe = (db: SQLiteDatabase, id: string) => db.runAsync('DELETE FROM recipes WHERE id = ?', id);

export async function loadSettings(db: SQLiteDatabase): Promise<UserSettings> {
  const row = await db.getFirstAsync<PayloadRow>('SELECT payload FROM settings WHERE id = 1');
  return userSettingsSchema.parse(row ? JSON.parse(row.payload) : {});
}

export async function saveSettings(db: SQLiteDatabase, settings: UserSettings) {
  const parsed = userSettingsSchema.parse(settings);
  await db.runAsync(
    'INSERT INTO settings (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
    JSON.stringify(parsed),
  );
}

export async function loadCustomIngredients(db: SQLiteDatabase): Promise<Ingredient[]> {
  const rows = await db.getAllAsync<PayloadRow>('SELECT payload FROM custom_ingredients ORDER BY created_at DESC');
  return rows.map((row) => ingredientSchema.parse(JSON.parse(row.payload)));
}

export async function insertCustomIngredient(db: SQLiteDatabase, ingredient: Ingredient) {
  const parsed = ingredientSchema.parse({ ...ingredient, isCustom: true });
  await db.runAsync(
    'INSERT INTO custom_ingredients (id, payload, created_at) VALUES (?, ?, ?)',
    parsed.id,
    JSON.stringify(parsed),
    new Date().toISOString(),
  );
}

export async function insertSpinSession(db: SQLiteDatabase, session: SpinSession) {
  await db.runAsync(
    'INSERT OR REPLACE INTO spin_sessions (id, payload, created_at) VALUES (?, ?, ?)',
    session.id,
    JSON.stringify(session),
    session.startedAt,
  );
}

export async function resetUserData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM custom_ingredients');
    await db.runAsync('DELETE FROM spin_sessions');
    await db.runAsync('DELETE FROM recipes');
  });
}
