import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { seededIngredients } from '@/src/data/ingredients';
import { seededRecipes } from '@/src/data/recipes';
import {
  insertCustomIngredient,
  insertSpinSession,
  loadCustomIngredients,
  loadRecipes,
  loadSettings,
  removeRecipe,
  resetUserData,
  saveSettings,
  upsertRecipe,
} from '@/src/db/repository';
import { userSettingsSchema, type Ingredient, type Recipe, type SpinSession, type UserSettings } from '@/src/types';

type AppContextValue = {
  ready: boolean;
  recipes: Recipe[];
  customIngredients: Ingredient[];
  ingredients: Ingredient[];
  settings: UserSettings;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  duplicateRecipe: (id: string) => Promise<Recipe | undefined>;
  toggleFavorite: (id: string) => Promise<void>;
  addCustomIngredient: (ingredient: Ingredient) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  startSpinSession: (session: SpinSession) => Promise<void>;
  exportData: () => Promise<void>;
  resetData: () => Promise<void>;
};

const defaultSettings = userSettingsSchema.parse({});
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: React.PropsWithChildren) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  const refresh = useCallback(async () => {
    const [storedRecipes, storedIngredients, storedSettings] = await Promise.all([
      loadRecipes(db),
      loadCustomIngredients(db),
      loadSettings(db),
    ]);
    setRecipes(storedRecipes);
    setCustomIngredients(storedIngredients);
    const migratedSettings = userSettingsSchema.parse({
      ...storedSettings,
      dietaryPreferences: storedSettings.dietaryPreferences.length ? storedSettings.dietaryPreferences : storedSettings.tutorialDraft.dietaryPreferences,
      foodAllergies: storedSettings.foodAllergies.length ? storedSettings.foodAllergies : storedSettings.tutorialDraft.foodAllergies,
      customAvoidFoods: storedSettings.customAvoidFoods.length ? storedSettings.customAvoidFoods : storedSettings.tutorialDraft.customAvoidFoods,
    });
    setSettings(migratedSettings);
    setReady(true);
  }, [db]);

  useEffect(() => {
    refresh().catch((error) => {
      console.error('Failed to load Creamy Tuner data', error);
      setReady(true);
    });
  }, [refresh]);

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    const updated = { ...recipe, updatedAt: new Date().toISOString() };
    await upsertRecipe(db, updated);
    setRecipes((current) => [updated, ...current.filter((candidate) => candidate.id !== updated.id)]);
  }, [db]);

  const deleteRecipe = useCallback(async (id: string) => {
    await removeRecipe(db, id);
    setRecipes((current) => current.filter((recipe) => recipe.id !== id));
  }, [db]);

  const duplicateRecipe = useCallback(async (id: string) => {
    const source = recipes.find((recipe) => recipe.id === id);
    if (!source) return undefined;
    const now = new Date().toISOString();
    const copy: Recipe = { ...source, id: `recipe-${Date.now()}`, name: `${source.name} Copy`, favorite: false, createdAt: now, updatedAt: now };
    await upsertRecipe(db, copy);
    setRecipes((current) => [copy, ...current]);
    return copy;
  }, [db, recipes]);

  const toggleFavorite = useCallback(async (id: string) => {
    const recipe = recipes.find((candidate) => candidate.id === id);
    if (!recipe) return;
    await saveRecipe({ ...recipe, favorite: !recipe.favorite });
  }, [recipes, saveRecipe]);

  const addCustomIngredient = useCallback(async (ingredient: Ingredient) => {
    await insertCustomIngredient(db, ingredient);
    setCustomIngredients((current) => [ingredient, ...current]);
  }, [db]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    const next = userSettingsSchema.parse({ ...settings, ...patch });
    await saveSettings(db, next);
    setSettings(next);
  }, [db, settings]);

  const startSpinSession = useCallback(async (session: SpinSession) => {
    await insertSpinSession(db, session);
  }, [db]);

  const exportData = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Export on device', 'Install the beta on iOS or Android to share a local JSON export.');
      return;
    }
    const exportFile = new File(Paths.cache, `creamytuner-export-${Date.now()}.json`);
    exportFile.create({ overwrite: true });
    exportFile.write(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings, recipes, customIngredients }, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(exportFile.uri, { mimeType: 'application/json', dialogTitle: 'Export Creamy Tuner data' });
    }
  }, [customIngredients, recipes, settings]);

  const resetData = useCallback(async () => {
    await resetUserData(db);
    for (const recipe of seededRecipes) await upsertRecipe(db, recipe);
    await saveSettings(db, defaultSettings);
    setRecipes(seededRecipes);
    setCustomIngredients([]);
    setSettings(defaultSettings);
  }, [db]);

  const ingredients = useMemo(() => [...seededIngredients, ...customIngredients], [customIngredients]);
  const value = useMemo<AppContextValue>(() => ({
    ready,
    recipes,
    customIngredients,
    ingredients,
    settings,
    saveRecipe,
    deleteRecipe,
    duplicateRecipe,
    toggleFavorite,
    addCustomIngredient,
    updateSettings,
    startSpinSession,
    exportData,
    resetData,
  }), [addCustomIngredient, customIngredients, deleteRecipe, duplicateRecipe, exportData, ingredients, ready, recipes, resetData, saveRecipe, settings, startSpinSession, toggleFavorite, updateSettings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}
