import type { SQLiteDatabase } from 'expo-sqlite';
import { seededRecipes } from '@/src/data/recipes';
import { recipeSchema, userSettingsSchema } from '@/src/types';

const DATABASE_VERSION = 1;

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS custom_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS spin_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM recipes');
    if (!count?.count) {
      await db.withTransactionAsync(async () => {
        for (const recipe of seededRecipes) {
          await db.runAsync(
            'INSERT INTO recipes (id, payload, created_at, updated_at) VALUES (?, ?, ?, ?)',
            recipe.id,
            JSON.stringify(recipe),
            recipe.createdAt,
            recipe.updatedAt,
          );
        }
      });
    }
    const settings = userSettingsSchema.parse({});
    await db.runAsync('INSERT OR IGNORE INTO settings (id, payload) VALUES (1, ?)', JSON.stringify(settings));
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export const parseRecipePayload = (payload: string) => recipeSchema.parse(JSON.parse(payload));
