import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { seededIngredients } from '@/src/data/ingredients';
import { seededRecipes } from '@/src/data/recipes';
import {
  ingredientSchema,
  recipeSchema,
  userSettingsSchema,
  type Ingredient,
  type Recipe,
  type SpinSession,
  type UserSettings,
} from '@/src/types';

type StoredDemoData = {
  recipes: Recipe[];
  customIngredients: Ingredient[];
  settings: UserSettings;
  spinSessions: SpinSession[];
};

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

const STORAGE_KEY = 'creamytuner.demo.v1';
const defaultSettings = userSettingsSchema.parse({});
const AppContext = createContext<AppContextValue | null>(null);

function readDemoData(): StoredDemoData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('No saved demo data');
    const parsed = JSON.parse(raw) as Partial<StoredDemoData>;
    return {
      recipes: recipeSchema.array().parse(parsed.recipes),
      customIngredients: ingredientSchema.array().parse(parsed.customIngredients ?? []),
      settings: userSettingsSchema.parse(parsed.settings),
      spinSessions: Array.isArray(parsed.spinSessions) ? parsed.spinSessions : [],
    };
  } catch {
    return { recipes: seededRecipes, customIngredients: [], settings: defaultSettings, spinSessions: [] };
  }
}

export function AppProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>(seededRecipes);
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [spinSessions, setSpinSessions] = useState<SpinSession[]>([]);

  useEffect(() => {
    const stored = readDemoData();
    setRecipes(stored.recipes);
    setCustomIngredients(stored.customIngredients);
    setSettings(stored.settings);
    setSpinSessions(stored.spinSessions);
    setReady(true);
  }, []);

  const persist = useCallback((data: StoredDemoData) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    const updated = recipeSchema.parse({ ...recipe, updatedAt: new Date().toISOString() });
    const next = [updated, ...recipes.filter((candidate) => candidate.id !== updated.id)];
    setRecipes(next);
    persist({ recipes: next, customIngredients, settings, spinSessions });
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const deleteRecipe = useCallback(async (id: string) => {
    const next = recipes.filter((recipe) => recipe.id !== id);
    setRecipes(next);
    persist({ recipes: next, customIngredients, settings, spinSessions });
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const duplicateRecipe = useCallback(async (id: string) => {
    const source = recipes.find((recipe) => recipe.id === id);
    if (!source) return undefined;
    const now = new Date().toISOString();
    const copy = recipeSchema.parse({ ...source, id: `recipe-${Date.now()}`, name: `${source.name} Copy`, favorite: false, createdAt: now, updatedAt: now });
    const next = [copy, ...recipes];
    setRecipes(next);
    persist({ recipes: next, customIngredients, settings, spinSessions });
    return copy;
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const toggleFavorite = useCallback(async (id: string) => {
    const next = recipes.map((recipe) => recipe.id === id ? { ...recipe, favorite: !recipe.favorite, updatedAt: new Date().toISOString() } : recipe);
    setRecipes(next);
    persist({ recipes: next, customIngredients, settings, spinSessions });
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const addCustomIngredient = useCallback(async (ingredient: Ingredient) => {
    const parsed = ingredientSchema.parse({ ...ingredient, isCustom: true });
    const next = [parsed, ...customIngredients];
    setCustomIngredients(next);
    persist({ recipes, customIngredients: next, settings, spinSessions });
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    const next = userSettingsSchema.parse({ ...settings, ...patch });
    setSettings(next);
    persist({ recipes, customIngredients, settings: next, spinSessions });
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const startSpinSession = useCallback(async (session: SpinSession) => {
    const next = [session, ...spinSessions.filter((item) => item.id !== session.id)];
    setSpinSessions(next);
    persist({ recipes, customIngredients, settings, spinSessions: next });
  }, [customIngredients, persist, recipes, settings, spinSessions]);

  const exportData = useCallback(async () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings, recipes, customIngredients }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `creamytuner-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [customIngredients, recipes, settings]);

  const resetData = useCallback(async () => {
    const reset = { recipes: seededRecipes, customIngredients: [], settings: defaultSettings, spinSessions: [] };
    setRecipes(reset.recipes);
    setCustomIngredients(reset.customIngredients);
    setSettings(reset.settings);
    setSpinSessions(reset.spinSessions);
    persist(reset);
  }, [persist]);

  const ingredients = useMemo(() => [...seededIngredients, ...customIngredients], [customIngredients]);
  const value = useMemo<AppContextValue>(() => ({
    ready, recipes, customIngredients, ingredients, settings, saveRecipe, deleteRecipe, duplicateRecipe,
    toggleFavorite, addCustomIngredient, updateSettings, startSpinSession, exportData, resetData,
  }), [addCustomIngredient, customIngredients, deleteRecipe, duplicateRecipe, exportData, ingredients, ready, recipes, resetData, saveRecipe, settings, startSpinSession, toggleFavorite, updateSettings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}
