import type { SQLiteDatabase } from 'expo-sqlite';

import { seededRecipes } from '@/src/data/recipes';
import { migrateDatabase, parseRecipePayload } from '@/src/db/database';

function databaseMock(version = 0, recipeCount = 0) {
  const runAsync = jest.fn(async () => ({}));
  const getFirstAsync = jest.fn()
    .mockResolvedValueOnce({ user_version: version })
    .mockResolvedValueOnce({ count: recipeCount });
  const withTransactionAsync = jest.fn(async (work: () => Promise<void>) => work());
  const execAsync = jest.fn(async () => undefined);
  return {
    db: { runAsync, getFirstAsync, withTransactionAsync, execAsync } as unknown as SQLiteDatabase,
    execAsync,
    getFirstAsync,
    runAsync,
    withTransactionAsync,
  };
}

describe('database migrations', () => {
  it('creates version one, seeds recipes, and writes default settings', async () => {
    const mock = databaseMock();

    await migrateDatabase(mock.db);

    expect(mock.execAsync).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS recipes'));
    expect(mock.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(mock.runAsync).toHaveBeenCalledTimes(seededRecipes.length + 1);
    expect(mock.execAsync).toHaveBeenLastCalledWith('PRAGMA user_version = 1');
  });

  it('leaves an up-to-date database untouched after enabling pragmas', async () => {
    const mock = databaseMock(1);

    await migrateDatabase(mock.db);

    expect(mock.execAsync).toHaveBeenCalledTimes(1);
    expect(mock.runAsync).not.toHaveBeenCalled();
  });

  it('validates stored recipe payloads at the repository boundary', () => {
    expect(parseRecipePayload(JSON.stringify(seededRecipes[0]))).toEqual(seededRecipes[0]);
    expect(() => parseRecipePayload('{"id":"broken"}')).toThrow();
  });
});
