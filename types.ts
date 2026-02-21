
export enum Language {
  HE = 'he',
  ES = 'es'
}

export type Unit = 'gram' | 'kg' | 'tsp' | 'tbsp' | 'cup' | 'pinch' | 'drizzle' | 'units' | 'ml' | 'liters';

export interface Category {
  id: string;
  [Language.HE]: string;
  [Language.ES]: string;
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
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: PrepStep[];
  notes?: string;
  ovenInstructions?: string;
}

export interface Recipe {
  id: string;
  image?: string;
  createdAt: number;
  categoryId?: string;
  [Language.HE]: RecipeContent;
  [Language.ES]: RecipeContent;
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
  categoryNameEs: string;
  allCategories: string;
  uncategorized: string;
}
