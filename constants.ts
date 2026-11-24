
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
  },
  [Language.ES]: {
    appName:'Sabor & Masoret',addRecipe:'Nueva receta',title:'Nombre de la receta',description:'Descripción breve',ingredients:'Ingredientes',instructions:'Preparación',notes:'Notas',oven:'Indicaciones del horno',save:'Guardar receta',cancel:'Cancelar',generateImage:'Crear imagen con IA',uploadImage:'Subir imagen',promptPlaceholder:'Describí el plato para crear una imagen…',bonAppetit:'¡Buen provecho!',exportPdf:'Exportar a PDF',category:'Categoría',amount:'Cantidad',unit:'Unidad',addIngredient:'Agregar ingrediente',addStep:'Agregar paso',translateLoading:'Traduciendo la receta…',noRecipes:'Todavía no hay recetas. ¡A cocinar!',imageDescription:'Descripción de la imagen',ingredientCategories:['General','Verduras','Carne','Lácteos','Especias','Panadería'],importFromUrl:'Importar receta',urlPlaceholder:'Pegá el enlace de la receta…',importing:'Importando receta…',importError:'No se pudo importar la receta.',manageCategories:'Administrar categorías',categoryNameHe:'Nombre de la categoría (hebreo)',allCategories:'Todas',uncategorized:'Sin categoría',servings:'Porciones',fullPortion:'Porción completa',halfPortion:'Media porción',fifthPortion:'Un quinto',quarterPortion:'Un cuarto',doublePortion:'Doble porción'
  }
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-desserts', [Language.HE]: 'קינוחים' },
  { id: 'cat-main', [Language.HE]: 'מנות עיקריות' },
  { id: 'cat-bakery', [Language.HE]: 'מאפים' },
  { id: 'cat-salads', [Language.HE]: 'סלטים' },
];

export const UNITS: Record<string, Record<Language, string>> = {
  gram: { [Language.HE]: 'גרם', [Language.ES]: 'g' },
  kg: { [Language.HE]: 'ק"ג', [Language.ES]: 'kg' },
  tsp: { [Language.HE]: 'כפית', [Language.ES]: 'cdta.' },
  tbsp: { [Language.HE]: 'כף', [Language.ES]: 'cda.' },
  cup: { [Language.HE]: 'כוס', [Language.ES]: 'taza' },
  pinch: { [Language.HE]: 'קורט', [Language.ES]: 'pizca' },
  drizzle: { [Language.HE]: 'זילוף', [Language.ES]: 'chorrito' },
  units: { [Language.HE]: 'יחידות', [Language.ES]: 'unidades' },
  ml: { [Language.HE]: 'מ"ל', [Language.ES]: 'ml' },
  liters: { [Language.HE]: 'ליטר', [Language.ES]: 'litro' },
};

export const categorySpanish: Record<string,string> = {'קינוחים':'Postres','מנות עיקריות':'Platos principales','מאפים':'Panadería','סלטים':'Ensaladas','ללא קטגוריה':'Sin categoría','מרקים':'Sopas','לחמים':'Panes','עוגות':'Tortas','עוגיות':'Galletitas','פסטות':'Pastas','תוספות':'Guarniciones','רטבים':'Salsas','דגים':'Pescados','ארוחות בוקר':'Desayunos','משקאות':'Bebidas'};
export const categoryLabel=(cat:Category|undefined,language:Language)=>cat?(language===Language.ES?(cat.es||categorySpanish[cat.he]||cat.he):cat.he):UI_STRINGS[language].uncategorized;
