
import { Recipe, Language, Unit } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'van-stapele',
    createdAt: Date.now() - 1000,
    categoryId: 'cat-desserts',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=1000&auto=format&fit=crop',
    [Language.HE]: {
      title: 'עוגיות ואן-סטאפל',
      description: 'העוגיות המפורסמות מאמסטרדם - מעטפת קקאו עשירה עם לב שוקולד לבן נמס.',
      ingredients: [
        { id: generateId(), name: 'קמח', amount: 250, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'אבקת קקאו', amount: 60, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'אבקת חלב', amount: 10, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'קורנפלור', amount: 30, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'סודה לשתייה', amount: 1, unit: 'tsp', category: 'בצק' },
        { id: generateId(), name: 'קפה נמס', amount: 1, unit: 'tsp', category: 'בצק' },
        { id: generateId(), name: 'חמאה', amount: 170, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'סוכר לבן', amount: 85, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'סוכר חום', amount: 112.5, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'ביצים', amount: 2, unit: 'units', category: 'בצק' },
        { id: generateId(), name: 'תמצית וניל', amount: 1, unit: 'units', category: 'בצק' },
        { id: generateId(), name: 'מטבעות שוקולד מריר/חלב', amount: 100, unit: 'gram', category: 'תוספות' },
        { id: generateId(), name: 'שוקולד לבן איכותי', amount: 200, unit: 'gram', category: 'ליבה' }
      ],
      instructions: [
        { id: generateId(), text: 'ממיסים 200 גרם שוקולד לבן בפולסים של 15 שניות עד המסה מלאה.', category: 'מטבעות שוקולד לבן' },
        { id: generateId(), text: 'מעבירים לתבניות סיליקון קטנות ומקפיאים לחצי שעה.', category: 'מטבעות שוקולד לבן' },
        { id: generateId(), text: 'מערבבים חמאה רכה עם שני סוגי הסוכר עד תערובת הומוגנית.', category: 'בצק העוגיה' },
        { id: generateId(), text: 'מוסיפים ביצים בטמפרטורת החדר ומערבבים היטב.', category: 'בצק העוגיה' },
        { id: generateId(), text: 'מוסיפים וניל ומנפים פנימה את כל המצרכים היבשים.', category: 'בצק העוגיה' },
        { id: generateId(), text: 'יוצרים כדורים, מכניסים פנימה את מטבעות השוקולד הלבן הקפואים.', category: 'הרכבה' },
        { id: generateId(), text: 'מקררים את הכדורים ל-15 דקות.', category: 'אפייה' },
        { id: generateId(), text: 'אופים ב-180 מעלות כ-10 דקות.', category: 'אפייה' }
      ],
      ovenInstructions: '180 מעלות צלזיוס למשך כ-10 דקות.'
    },
    [Language.ES]: null as any
  },
  {
    id: 'tiramisu',
    createdAt: Date.now() - 2000,
    categoryId: 'cat-desserts',
    image: 'https://images.unsplash.com/photo-1571877223202-5362df505319?q=80&w=1000&auto=format&fit=crop',
    [Language.HE]: {
      title: 'טירמיסו',
      description: 'קינוח איטלקי קלאסי המבוסס על בישקוטים ספוגים בקפה וקרם מסקרפונה עשיר.',
      ingredients: [
        { id: generateId(), name: 'אבקת קקאו', amount: 200, unit: 'gram', category: 'עיטור' },
        { id: generateId(), name: 'סוכר לבן', amount: 100, unit: 'gram', category: 'קרם' },
        { id: generateId(), name: 'בישקוטים', amount: 20, unit: 'units', category: 'בסיס' },
        { id: generateId(), name: 'גבינת מסקרפונה', amount: 500, unit: 'gram', category: 'קרם' },
        { id: generateId(), name: 'ביצים', amount: 4, unit: 'units', category: 'קרם' },
        { id: generateId(), name: 'שמנת מתוקה', amount: 250, unit: 'ml', category: 'קרם' },
        { id: generateId(), name: 'תמצית וניל', amount: 1, unit: 'tbsp', category: 'קרם' }
      ],
      instructions: [
        { id: generateId(), text: 'מקציפים ביצים וסוכר כ-10 דקות עד לקבלת קרם סמיך.', category: 'הכנת הקרם' },
        { id: generateId(), text: 'מקציפים שמנת מתוקה, מוסיפים מסקרפונה ווניל ומקפלים לתערובת הביצים.', category: 'הכנת הקרם' },
        { id: generateId(), text: 'טובלים בישקוטים בקפה חם מעורבב עם ליקר.', category: 'הרכבה' },
        { id: generateId(), text: 'מסדרים שכבות של קרם ובישקוטים רטובים.', category: 'הרכבה' },
        { id: generateId(), text: 'מפזרים קקאו מעל כל שכבה ובסיום.', category: 'גימור' },
        { id: generateId(), text: 'מקררים לפחות 3 שעות לפני ההגשה.', category: 'גימור' }
      ],
      notes: 'ניתן להשתמש בליקר קפה לטעם עמוק יותר.'
    },
    [Language.ES]: null as any
  },
  {
    id: 'garlic-rolls',
    createdAt: Date.now() - 3000,
    categoryId: 'cat-bakery',
    image: 'https://images.unsplash.com/photo-1619531006503-4f96446e109d?q=80&w=1000&auto=format&fit=crop',
    [Language.HE]: {
      title: 'לחמניות שום-שמיר',
      description: 'לחמניות רכות ואווריריות עם ציפוי שום, פטרוזיליה ושמיר בניחוח משכר.',
      ingredients: [
        { id: generateId(), name: 'קמח לבן', amount: 500, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'שמרים יבשים', amount: 1, unit: 'tbsp', category: 'בצק' },
        { id: generateId(), name: 'סוכר לבן', amount: 12, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'דבש', amount: 1, unit: 'tsp', category: 'בצק' },
        { id: generateId(), name: 'שמן זית', amount: 50, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'מלח', amount: 6, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'מים פושרים', amount: 300, unit: 'gram', category: 'בצק' },
        { id: generateId(), name: 'שום כתוש', amount: 2, unit: 'units', category: 'ציפוי' },
        { id: generateId(), name: 'פטרוזיליה קצוצה', amount: 30, unit: 'gram', category: 'ציפוי' },
        { id: generateId(), name: 'שמיר קצוץ', amount: 17.5, unit: 'gram', category: 'ציפוי' }
      ],
      instructions: [
        { id: generateId(), text: 'מערבבים קמח, שמרים, סוכר ודבש במיקסר.', category: 'לישה' },
        { id: generateId(), text: 'מוסיפים מים, שמן ומלח ולשים 10 דקות.', category: 'לישה' },
        { id: generateId(), text: 'מתפיחים 45 דקות עד הכפלת הנפח.', category: 'התפחה' },
        { id: generateId(), text: 'יוצרים כדורים קטנים ומניחים בתבנית להתפחה נוספת של 50 דקות.', category: 'עיצוב' },
        { id: generateId(), text: 'מברישים בביצה ואופים ב-190 מעלות עד הזהבה.', category: 'אפייה' },
        { id: generateId(), text: 'מיד ביציאה מהתנור מברישים בתערובת השום והתבלינים.', category: 'ציפוי' }
      ],
      ovenInstructions: '190 מעלות עד להזהבה.'
    },
    [Language.ES]: null as any
  }
];
