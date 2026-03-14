
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Recipe, Language, RecipeContent, Category } from './types';
import { UI_STRINGS, DEFAULT_CATEGORIES } from './constants';
import LanguageToggle from './components/LanguageToggle';
import RecipeForm from './components/RecipeForm';
import RecipeView from './components/RecipeView';
import CategoryManager from './components/CategoryManager';
import ScrollToTop from './components/ScrollToTop';
import { INITIAL_RECIPES } from './seedData';
import { importRecipeFromUrl, generateRecipeImage } from './services/geminiService';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import Auth from './components/Auth';

type SortOption = 'newest' | 'oldest' | 'alphabetical';

const RecipeCard = React.memo(({ recipe, language, onClick, categories, onUpdate }: { recipe: Recipe, language: Language, onClick: () => void, categories: Category[], onUpdate: (r: Recipe) => void }) => {
  const content = recipe[language];
  const fallbackContent = recipe[language === Language.HE ? Language.ES : Language.HE];
  const displayContent = content || fallbackContent;
  const category = categories.find(c => c.id === recipe.categoryId);
  const catLabel = category ? category[language] : UI_STRINGS[language].uncategorized;
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!content && fallbackContent && !isTranslating) {
      const doTranslate = async () => {
        setIsTranslating(true);
        try {
          const { translateRecipe } = await import('./services/geminiService');
          const translated = await translateRecipe(fallbackContent, language);
          if (translated) {
            onUpdate({ ...recipe, [language]: translated });
          }
        } catch (e) {
          console.error("Card translation failed", e);
        } finally {
          setIsTranslating(false);
        }
      };
      doTranslate();
    }
  }, [language, content, fallbackContent, isTranslating, onUpdate, recipe]);

  return (
    <div onClick={onClick} className="group cursor-pointer flex flex-col items-center">
      <div className="relative w-full aspect-[4/5] overflow-hidden mb-8 grayscale hover:grayscale-0 transition-all duration-700 shadow-sm will-change-transform">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" 
            alt={displayContent?.title} 
          />
        ) : (
          <div className="w-full h-full bg-[#F5F5F0] flex items-center justify-center text-[#1C1C1C]/10 uppercase text-[10px] tracking-[0.5em]">Sans Image</div>
        )}
        <div className="absolute inset-0 bg-[#1C1C1C]/0 group-hover:bg-[#1C1C1C]/5 transition-colors duration-700"></div>
        {isTranslating && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="w-4 h-4 border border-[#1C1C1C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <div className="text-center space-y-3">
        <p className="text-[9px] uppercase tracking-[0.4em] text-[#8B7355] font-bold">{catLabel}</p>
        <h3 className="serif text-3xl text-[#1C1C1C] group-hover:italic transition-all">
          {isTranslating ? '...' : (displayContent?.title || 'Untitled')}
        </h3>
        <div className="w-8 h-[1px] bg-[#1C1C1C]/10 mx-auto mt-4 group-hover:w-20 transition-all"></div>
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [language, setLanguage] = useState<Language>(Language.HE);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');

  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showImportBar, setShowImportBar] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchInTitle, setSearchInTitle] = useState(true);
  const [searchInIngredients, setSearchInIngredients] = useState(true);
  const [onlyCurrentLanguage, setOnlyCurrentLanguage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedRecipe, showForm, editingRecipe, selectedCategoryId]);

  // Firestore Listeners
  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setCategories([]);
      return;
    }

    const recipesQuery = query(
      collection(db, `users/${user.uid}/recipes`),
      orderBy('createdAt', 'desc')
    );
    const unsubRecipes = onSnapshot(recipesQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Recipe));
      setRecipes(docs);
    });

    const categoriesQuery = query(collection(db, `users/${user.uid}/categories`));
    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Category));
      // Merge with default categories if needed, or just use user ones
      if (docs.length === 0) {
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(docs);
      }
    });

    return () => {
      unsubRecipes();
      unsubCategories();
    };
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSaveRecipe = useCallback(async (recipeData: Partial<Recipe>) => {
    if (!user) return;

    try {
      if (editingRecipe) {
        const recipeRef = doc(db, `users/${user.uid}/recipes`, editingRecipe.id);
        await setDoc(recipeRef, { ...recipeData, userId: user.uid }, { merge: true });
        setEditingRecipe(null);
      } else {
        const recipesCol = collection(db, `users/${user.uid}/recipes`);
        const newRecipe = {
          ...recipeData,
          createdAt: Date.now(),
          userId: user.uid,
          [Language.HE]: language === Language.HE ? recipeData[Language.HE] : null,
          [Language.ES]: language === Language.ES ? recipeData[Language.ES] : null,
        };
        await addDoc(recipesCol, newRecipe);
      }
      setShowForm(false);
    } catch (e) {
      console.error("Error saving recipe:", e);
    }
  }, [editingRecipe, language, user]);

  const handleAddCategory = useCallback(async (cat: Omit<Category, 'id'>) => {
    if (!user) return null as any;
    try {
      const categoriesCol = collection(db, `users/${user.uid}/categories`);
      const docRef = await addDoc(categoriesCol, { ...cat, userId: user.uid });
      return { ...cat, id: docRef.id, userId: user.uid } as Category;
    } catch (e) {
      console.error("Error adding category:", e);
      return null as any;
    }
  }, [user]);

  const handleUpdateCategory = async (cat: Category) => {
    if (!user) return;
    try {
      const catRef = doc(db, `users/${user.uid}/categories`, cat.id);
      await setDoc(catRef, cat, { merge: true });
    } catch (e) {
      console.error("Error updating category:", e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
    if (window.confirm('Delete category? Recipes will become uncategorized.')) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/categories`, id));
        // Recipes update will be handled by the app state if we want, 
        // but Firestore rules or a batch would be better.
        // For now, let's just delete the category.
      } catch (e) {
        console.error("Error deleting category:", e);
      }
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl || !user) return;
    setIsImporting(true);
    try {
      const scrapedContent = await importRecipeFromUrl(importUrl, language);
      if (scrapedContent) {
        const imageUrl = await generateRecipeImage(scrapedContent.title);
        const recipesCol = collection(db, `users/${user.uid}/recipes`);
        const newRecipe = {
          createdAt: Date.now(),
          image: imageUrl || undefined,
          userId: user.uid,
          [Language.HE]: language === Language.HE ? scrapedContent : null,
          [Language.ES]: language === Language.ES ? scrapedContent : null,
        };
        await addDoc(recipesCol, newRecipe);
        setImportUrl('');
        setShowImportBar(false);
      } else {
        alert(UI_STRINGS[language].importError);
      }
    } catch (e) {
      alert(UI_STRINGS[language].importError);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!user) return;
    if (window.confirm(language === Language.HE ? 'האם אתה בטוח שברצונך למחוק מתכון זה?' : '¿Estás seguro de que quieres eliminar esta receta?')) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/recipes`, id));
        setSelectedRecipe(null);
      } catch (e) {
        console.error("Error deleting recipe:", e);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const t = UI_STRINGS[language];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="w-12 h-12 border-2 border-[#1C1C1C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth language={language} />;
  }

  const processedRecipes = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(t => t.length > 0);

    let filtered = recipes.filter(recipe => {
      // Category Filter
      if (selectedCategoryId !== 'all' && recipe.categoryId !== selectedCategoryId) return false;

      // Text Filter
      if (terms.length === 0) return true;
      const contents = [recipe[Language.HE], recipe[Language.ES]].filter(Boolean);
      return terms.every(term => contents.some(content => {
        const titleMatch = searchInTitle && content.title.toLowerCase().includes(term);
        const ingredientMatch = searchInIngredients && content.ingredients.some(ing => ing.name.toLowerCase().includes(term));
        return titleMatch || ingredientMatch;
      }));
    });

    return filtered.sort((a, b) => {
      if (sortOption === 'newest') return b.createdAt - a.createdAt;
      if (sortOption === 'oldest') return a.createdAt - b.createdAt;
      if (sortOption === 'alphabetical') {
        const titleA = (a[language]?.title || a[Language.HE]?.title || '').toLowerCase();
        const titleB = (b[language]?.title || b[Language.HE]?.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [recipes, debouncedQuery, searchInTitle, searchInIngredients, language, sortOption, selectedCategoryId]);

  return (
    <div className={`min-h-screen pb-32 px-4 md:px-12 transition-colors duration-700 ${language === Language.HE ? 'rtl font-heebo' : 'ltr font-inter'}`}>
      <header className="glass-header sticky top-0 z-50 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center lg:items-start">
            <h1 
              className="serif text-3xl md:text-4xl font-light tracking-widest text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity uppercase"
              onClick={() => { setSelectedRecipe(null); setShowForm(false); setEditingRecipe(null); setSearchQuery(''); setSelectedCategoryId('all'); }}
            >
              SABOR & MASORET
            </h1>
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mt-1 font-semibold">L'Art de la Cuisine</span>
          </div>
          
          <div className="flex-1 max-w-xl w-full">
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === Language.HE ? 'חפש מתכון...' : 'Buscar...'}
                className="w-full bg-[#F5F5F0] border-b border-[#1C1C1C]/10 py-3 px-4 outline-none focus:border-[#8B7355] transition-all text-sm tracking-wide"
              />
              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-4 ${language === Language.HE ? 'left-2' : 'right-2'}`}>
                <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 transition-colors ${showFilters ? 'text-[#8B7355]' : 'text-[#1C1C1C]/30 hover:text-[#1C1C1C]'}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M6 12h12m-9 6h6" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="absolute mt-4 w-full bg-white premium-border p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 z-50">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] uppercase tracking-[0.1em] font-bold text-[#1C1C1C]/60">
                  <div className="space-y-4">
                    <p className="text-[#8B7355] border-b border-[#8B7355]/10 pb-2">Options</p>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-3 cursor-pointer hover:text-[#1C1C1C]">
                        <input type="checkbox" checked={searchInTitle} onChange={() => setSearchInTitle(!searchInTitle)} className="accent-[#1C1C1C]" />
                        <span>{t.title}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer hover:text-[#1C1C1C]">
                        <input type="checkbox" checked={searchInIngredients} onChange={() => setSearchInIngredients(!searchInIngredients)} className="accent-[#1C1C1C]" />
                        <span>{t.ingredients}</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[#8B7355] border-b border-[#8B7355]/10 pb-2">Trier</p>
                    <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="bg-transparent border-none outline-none cursor-pointer hover:text-[#1C1C1C] w-full">
                      <option value="newest">{language === Language.HE ? 'חדש ביותר' : 'Más Reciente'}</option>
                      <option value="oldest">{language === Language.HE ? 'ישן ביותר' : 'Más Antiguo'}</option>
                      <option value="alphabetical">{language === Language.HE ? 'א-ת' : 'Alfabético'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 mr-4">
              <span className="text-[10px] uppercase tracking-widest text-[#1C1C1C]/40 font-bold">{user.email}</span>
              <button onClick={handleLogout} className="text-[#8B7355] hover:text-[#1C1C1C] text-[10px] font-bold uppercase tracking-widest transition-colors">
                {language === Language.HE ? 'התנתק' : 'Salir'}
              </button>
            </div>
            <LanguageToggle current={language} onChange={setLanguage} />
            <button 
              onClick={() => setShowImportBar(!showImportBar)} 
              className={`p-2 transition-colors ${showImportBar ? 'text-[#8B7355]' : 'text-[#1C1C1C]/40 hover:text-[#1C1C1C]'}`}
              title={t.importFromUrl}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => setShowCategoryManager(true)} className="p-2 text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors" title={t.manageCategories}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button onClick={() => { setShowForm(true); setSelectedRecipe(null); setEditingRecipe(null); }} className="bg-[#1C1C1C] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#8B7355] transition-all">
              {t.addRecipe}
            </button>
          </div>
        </div>
      </header>

      {showImportBar && (
        <div className="max-w-7xl mx-auto mb-12 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white premium-border p-6 flex flex-col md:flex-row gap-4 items-center shadow-xl">
            <input 
              type="text" 
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder={t.urlPlaceholder}
              className="flex-1 w-full bg-[#F5F5F0] border-none py-3 px-4 outline-none text-sm"
            />
            <button 
              onClick={handleUrlImport}
              disabled={isImporting || !importUrl}
              className="bg-[#8B7355] text-white px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] disabled:opacity-50 min-w-[180px] flex items-center justify-center gap-2"
            >
              {isImporting && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
              {isImporting ? t.importing : t.importFromUrl}
            </button>
            <button onClick={() => setShowImportBar(false)} className="text-[#1C1C1C]/30 hover:text-[#1C1C1C] p-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      {!showForm && !editingRecipe && !selectedRecipe && (
        <div className="max-w-7xl mx-auto mb-16 overflow-x-auto">
          <div className="flex gap-8 border-b border-[#1C1C1C]/5 pb-4 min-w-max items-center">
            <button 
              onClick={() => setSelectedCategoryId('all')}
              className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${selectedCategoryId === 'all' ? 'text-[#1C1C1C] border-b border-[#1C1C1C] pb-4 -mb-[17px]' : 'text-[#1C1C1C]/30 hover:text-[#1C1C1C]'}`}
            >
              {t.allCategories}
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${selectedCategoryId === cat.id ? 'text-[#1C1C1C] border-b border-[#1C1C1C] pb-4 -mb-[17px]' : 'text-[#1C1C1C]/30 hover:text-[#1C1C1C]'}`}
              >
                {cat[language]}
              </button>
            ))}
            <button 
              onClick={() => setShowCategoryManager(true)}
              className="text-[#8B7355] hover:text-[#1C1C1C] transition-colors p-2 flex items-center justify-center border border-[#8B7355]/20 rounded-full w-6 h-6 ml-4"
              title={t.manageCategories}
            >
              <span className="text-xs font-bold">+</span>
            </button>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <CategoryManager 
          categories={categories} 
          language={language} 
          onAdd={handleAddCategory} 
          onUpdate={handleUpdateCategory} 
          onDelete={handleDeleteCategory} 
          onClose={() => setShowCategoryManager(false)} 
        />
      )}

      <main className="max-w-7xl mx-auto">
        {(showForm || editingRecipe) ? (
          <RecipeForm 
            language={language} 
            categories={categories}
            initialRecipe={editingRecipe || undefined}
            onSave={handleSaveRecipe} 
            onCancel={() => { setShowForm(false); setEditingRecipe(null); }} 
            onAddCategory={handleAddCategory}
          />
        ) : selectedRecipe ? (
          <div className="animate-in fade-in duration-700">
            <button onClick={() => setSelectedRecipe(null)} className="mb-12 text-[#1C1C1C]/40 hover:text-[#8B7355] text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-4 transition-all">
              <span className="text-lg">←</span> {language === Language.HE ? 'חזרה לגלריה' : 'Volver'}
            </button>
            <RecipeView 
              recipe={selectedRecipe} 
              language={language} 
              onUpdate={(updated) => setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r))}
              onEdit={() => { setEditingRecipe(selectedRecipe); setSelectedRecipe(null); }}
              onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 animate-in fade-in duration-1000">
            {processedRecipes.length === 0 ? (
              <div className="col-span-full py-40 text-center text-[#1C1C1C]/20 serif italic text-3xl">La cuisine est vide...</div>
            ) : (
              processedRecipes.map(recipe => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  language={language} 
                  onClick={() => setSelectedRecipe(recipe)} 
                  categories={categories} 
                  onUpdate={(updated) => setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r))}
                />
              ))
            )}
          </div>
        )}
      </main>
      <ScrollToTop />
    </div>
  );
};

export default App;
