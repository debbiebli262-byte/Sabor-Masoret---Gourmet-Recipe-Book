
import { Language, TranslationStrings, Category } from './types';

export const UI_STRINGS: Record<Language, TranslationStrings> = {
  [Language.HE]: {
    appName: 'Sabor & Masoret',
    addRecipe: 'הוספת מתכון חדש',
    title: 'שם המתכון',
    description: 'תיאור קצר',
    ingredients: 'מצרכים',
    instructions: 'אופן ההכנה',
    notes: 'הערות',
    oven: 'הוראות חימום בתנור',
    save: 'שמור מתכון',
    cancel: 'ביטול',
    generateImage: 'צור תמונה ב-AI',
    uploadImage: 'העלה תמונה',
    promptPlaceholder: 'תאר את המנה כדי ליצור תמונה...',
    bonAppetit: 'בתאבון!',
    exportPdf: 'ייצוא ל-PDF',
    category: 'קטגוריה',
    amount: 'כמות',
    unit: 'יחידה',
    addIngredient: 'הוסף מצרך',
    addStep: 'הוסף שלב',
    translateLoading: 'מתרגם את המתכון...',
    noRecipes: 'אין עדיין מתכונים. הגיע הזמן לבשל!',
    imageDescription: 'תיאור לתמונה',
    ingredientCategories: ['כללי', 'ירקות', 'בשר', 'חלבי', 'תבלינים', 'מאפים'],
    importFromUrl: 'ייבוא מכתובת URL',
    urlPlaceholder: 'הדבק כאן כתובת אתר עם מתכון...',
    importing: 'מייבא מתכון...',
    importError: 'שגיאה בייבוא המתכון. וודא שהכתובת תקינה.',
    manageCategories: 'ניהול קטגוריות',
    categoryNameHe: 'שם קטגוריה (עברית)',
    allCategories: 'הכל',
    uncategorized: 'ללא קטגוריה',
    servings: 'כמות מנות',
    fullPortion: 'מנה מלאה',
    halfPortion: 'חצי מנה',
    fifthPortion: 'חמישית מנה',
    quarterPortion: 'רבע מנה',
    doublePortion: 'מנה כפולה'
  }
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-desserts', [Language.HE]: 'קינוחים' },
  { id: 'cat-main', [Language.HE]: 'מנות עיקריות' },
  { id: 'cat-bakery', [Language.HE]: 'מאפים' },
  { id: 'cat-salads', [Language.HE]: 'סלטים' },
];

export const UNITS: Record<string, Record<Language, string>> = {
  gram: { [Language.HE]: 'גרם' },
  kg: { [Language.HE]: 'ק"ג' },
  tsp: { [Language.HE]: 'כפית' },
  tbsp: { [Language.HE]: 'כף' },
  cup: { [Language.HE]: 'כוס' },
  pinch: { [Language.HE]: 'קורט' },
  drizzle: { [Language.HE]: 'זילוף' },
  units: { [Language.HE]: 'יחידות' },
  ml: { [Language.HE]: 'מ"ל' },
  liters: { [Language.HE]: 'ליטר' },
};
