
export enum Language {
  HE = 'he',
  ES = 'es'
}

export type Unit = 'gram' | 'kg' | 'tsp' | 'tbsp' | 'cup' | 'pinch' | 'drizzle' | 'units' | 'ml' | 'liters';

export interface Category {
  id: string;
  es?: string;
  [Language.HE]: string;
  userId?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: Unit;
  category: string;
}

export interface PrepStep {
  id: string;
  text: string;
  category: string;
}

export interface RecipeContent {
  sourceLanguage?: 'he'|'es';
  suggestedCategory?: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: PrepStep[];
  notes?: string;
  ovenInstructions?: string;
}

export interface Recipe {
  originalLanguage?: 'he'|'es';
  sourceUrl?: string;
  id: string;
  image?: string;
  createdAt: number;
  deletedAt?: number|null;
  es?: RecipeContent | null;
  categoryId?: string;
  [Language.HE]: RecipeContent;
  userId?: string;
}

export interface TranslationStrings {
  appName: string;
  addRecipe: string;
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  notes: string;
  oven: string;
  save: string;
  cancel: string;
  generateImage: string;
  uploadImage: string;
  promptPlaceholder: string;
  bonAppetit: string;
  exportPdf: string;
  category: string;
  amount: string;
  unit: string;
  addIngredient: string;
  addStep: string;
  translateLoading: string;
  noRecipes: string;
  imageDescription: string;
  ingredientCategories: string[];
  importFromUrl: string;
  urlPlaceholder: string;
  importing: string;
  importError: string;
  manageCategories: string;
  categoryNameHe: string;
  allCategories: string;
  uncategorized: string;
  servings: string;
  fullPortion: string;
  halfPortion: string;
  fifthPortion: string;
  quarterPortion: string;
  doublePortion: string;
}
