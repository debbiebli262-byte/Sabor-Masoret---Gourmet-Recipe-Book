
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Recipe, Language, RecipeContent, Category } from './types';
import { UI_STRINGS, DEFAULT_CATEGORIES, categoryLabel } from './constants';
import { printCookbook } from './services/printCookbook';
import FamilyPlanner from './components/FamilyPlanner';
import RecipeForm from './components/RecipeForm';
import RecipeView from './components/RecipeView';
import CategoryManager from './components/CategoryManager';
import ScrollToTop from './components/ScrollToTop';
import { INITIAL_RECIPES } from './seedData';
import { importRecipeFromUrl, generateRecipeImage, translateRecipe } from './services/geminiService';
import { db, auth } from './firebase';
import { GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut, User } from 'firebase/auth';

const EDITORS = new Set(["debbiebli262@gmail.com","cblinder.cpa@gmail.com","javierblinder@gmail.com"]);
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  orderBy
} from 'firebase/firestore';

type SortOption = 'newest' | 'oldest' | 'alphabetical';

const RecipeCard = React.memo(({ recipe, language, onClick, categories, onUpdate }: { recipe: Recipe, language: Language, onClick: () => void, categories: Category[], onUpdate: (r: Recipe) => void }) => {
  const content = (language===Language.ES?recipe.es:null)||recipe.he;
  const category = categories.find(c => c.id === recipe.categoryId);
  const catLabel = categoryLabel(category,language);
  const L=(he:string,sp:string)=>language===Language.ES?sp:he;

  return (
    <div onClick={onClick} className="mobile-card group cursor-pointer flex flex-col items-center">
      <div className="card-photo relative w-full aspect-[4/5] overflow-hidden mb-8 transition-all duration-700 shadow-sm will-change-transform">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105" 
            alt={content?.title} 
          />
        ) : (
          <div className="w-full h-full bg-[#F5F5F0] flex items-center justify-center text-[#1C1C1C]/10 uppercase text-[10px] tracking-[0.5em]">{L("ללא תמונה","Sin imagen")}</div>
        )}
        <div className="absolute inset-0 bg-[#1C1C1C]/0 group-hover:bg-[#1C1C1C]/5 transition-colors duration-700"></div>
      </div>
      <div className="card-caption text-center space-y-3">
        <p className="text-[9px] uppercase tracking-[0.4em] text-[#8B7355] font-bold">{catLabel}</p>
        <h3 className="serif text-3xl text-[#1C1C1C] group-hover:italic transition-all">
          {content?.title || L('ללא שם','Sin título')}
        </h3>
        <div className="w-8 h-[1px] bg-[#1C1C1C]/10 mx-auto mt-4 group-hover:w-20 transition-all"></div>
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => onIdTokenChanged(auth, async account => {
    setUser(account);
    setCanEdit(false);
    if (!account) return;
    try {
      const token = await account.getIdTokenResult();
      if (auth.currentUser === account) setCanEdit(token.signInProvider === 'google.com' && token.claims.email_verified === true && EDITORS.has(String(token.claims.email)));
    } catch { setCanEdit(false); }
  }), []);
  const login = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch { alert('לא ניתן להתחבר עם Google. בדקי את הגדרות ההתחברות ונסי שוב.'); }
  };
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [language, setLanguage] = useState<Language>(()=>{try{return localStorage.getItem('sabor-language')==='es'?Language.ES:Language.HE}catch{return Language.HE}});
  const es=language===Language.ES;
  const L=(he:string,sp:string)=>es?sp:he;
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=es?'ltr':'rtl';try{localStorage.setItem('sabor-language',language)}catch{}},[language]);
  const [translationProgress,setTranslationProgress]=useState('');
  const translateBook=async()=>{
    if(!canEdit||translationProgress)return;
    const pending=recipes.filter(r=>!r.deletedAt&&!r.es);
    if(!pending.length){alert(L('כל המתכונים מתורגמים','Todas las recetas ya están traducidas'));return}
    if(!confirm(L('לתרגם '+pending.length+' מתכונים באמצעות Gemini? הפעולה משתמשת במכסת ה-API.','¿Traducir '+pending.length+' recetas con Gemini? Se utilizará la cuota de la API.')))return;
    let done=0,failed=0;
    try{for(const recipe of pending){setTranslationProgress((done+failed+1)+' / '+pending.length);try{const translated=await translateRecipe(recipe.he,Language.ES);if(!translated)throw Error();await setDoc(doc(db,'recipes',recipe.id),{es:translated},{merge:true});done++}catch{failed++}}}finally{setTranslationProgress('');alert(L('תורגמו '+done+'; נכשלו '+failed,'Traducidas: '+done+'; errores: '+failed))}
  };
  const printEdition=(items:Recipe[],book=true)=>{
    const active=items.filter(r=>!r.deletedAt);
    if(es&&active.some(r=>!r.es)){alert(L('יש לתרגם את המתכונים לפני ההדפסה','Hay recetas sin traducir. Usá Traducir el libro antes de imprimir.'));return}
    printCookbook(es?active.map(r=>({...r,he:r.es!})):active,categories,book,1,es?{language:'es'}:{});
  };
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');

  const [draft,setDraft]=useState<Recipe|null>(null);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [installEvent,setInstallEvent]=useState<any>(null);
  useEffect(()=>{const onPrompt=(e:Event)=>{e.preventDefault();setInstallEvent(e)};const installed=()=>setInstallEvent(null);window.addEventListener('beforeinstallprompt',onPrompt);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',installed)}},[]);
  const installApp=async()=>{if(installEvent){await installEvent.prompt();setInstallEvent(null)}else alert('ב-Chrome באנדרואיד: לחצי על ⋮ ובחרי הוספה למסך הבית או התקנת אפליקציה. אם האפשרות אינה מופיעה, פתחי את האתר בדפדפן Chrome.')};
  const [showPlanner,setShowPlanner]=useState(()=>window.location.hash==='#weekly-menu');
  useEffect(()=>{const change=()=>{setShowPlanner(window.location.hash==='#weekly-menu');setShowFilters(false);setMobileMenu(false);window.scrollTo(0,0)};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
  const goPlanner=()=>{setShowPlanner(true);setShowFilters(false);setMobileMenu(false);window.location.hash='weekly-menu';window.scrollTo(0,0)};
  const goBook=()=>{setShowPlanner(false);setMobileMenu(false);if(window.location.hash==='#weekly-menu')window.location.hash='book';window.scrollTo(0,0)};
  const [importFile,setImportFile]=useState<{mimeType:string;data:string}|null>(null);
  const [fileName,setFileName]=useState('');
  const [showTrash,setShowTrash]=useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showImportBar, setShowImportBar] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchInTitle, setSearchInTitle] = useState(true);
  const [searchInIngredients, setSearchInIngredients] = useState(true);
  const [onlyCurrentLanguage, setOnlyCurrentLanguage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Scroll to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedRecipe, showForm, editingRecipe, selectedCategoryId]);

  // Firestore Listeners & Auto-seeding
  useEffect(() => {
    const recipesQuery = query(
      collection(db, 'recipes'),
      orderBy('createdAt', 'desc')
    );
    const unsubRecipes = onSnapshot(recipesQuery, async (snapshot) => {
      if (snapshot.empty && canEdit) {
        // Seed initial recipes to Firestore if it is completely empty
        try {
          for (const r of INITIAL_RECIPES) {
            await setDoc(doc(db, 'recipes', r.id), r);
          }
        } catch (err) {
          console.error("Failed to seed initial recipes:", err);
        }
      } else {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Recipe));
        setRecipes(docs);
      }
    });

    const categoriesQuery = query(collection(db, 'categories'));
    const unsubCategories = onSnapshot(categoriesQuery, async (snapshot) => {
      if (snapshot.empty && canEdit) {
        // Seed default categories to Firestore if it is completely empty
        try {
          for (const cat of DEFAULT_CATEGORIES) {
            await setDoc(doc(db, 'categories', cat.id), cat);
          }
        } catch (err) {
          console.error("Failed to seed default categories:", err);
        }
      } else {
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Category));
        setCategories(docs);
      }
    });

    return () => {
      unsubRecipes();
      unsubCategories();
    };
  }, [canEdit]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleSaveRecipe = useCallback(async (recipeData: Partial<Recipe>) => {
    if (!canEdit) return false;
    try {
      const original=recipeData.originalLanguage==='es'?'es':'he';
      const source=original==='es'?recipeData.es:recipeData.he;
      if(!source)throw new Error('Missing recipe');
      const other=await translateRecipe(source,original==='es'?Language.HE:Language.ES);
      if(!other)throw new Error('Translation failed');
      const bilingual={...recipeData,originalLanguage:original,he:original==='he'?source:other,es:original==='es'?source:other};
      if (editingRecipe) {
        await setDoc(doc(db,'recipes',editingRecipe.id),bilingual,{merge:true});
        setEditingRecipe(null);
      } else {
        await addDoc(collection(db,'recipes'),{...bilingual,createdAt:Date.now()});
      }
      setShowForm(false);setDraft(null);return true;
    } catch(e) {
      console.error('Recipe save failed',e);
      alert(language===Language.ES?'No se pudo traducir o guardar. El formulario conserva tu receta; volvé a intentar.':'לא ניתן לתרגם או לשמור כרגע. המתכון נשאר בטופס; אפשר לנסות שוב.');
      return false;
    }
  }, [editingRecipe,canEdit,language]);

  const handleAddCategory = useCallback(async (cat: Omit<Category, 'id'>) => {
    if (!canEdit) return null;
    try {
      const categoriesCol = collection(db, 'categories');
      const docRef = await addDoc(categoriesCol, cat);
      return { ...cat, id: docRef.id } as Category;
    } catch (e) {
      console.error("Error adding category:", e);
      return null as any;
    }
  }, [canEdit]);

  const handleUpdateCategory = async (cat: Category) => {
    if (!canEdit) return;
    try {
      const catRef = doc(db, 'categories', cat.id);
      await setDoc(catRef, cat, { merge: true });
    } catch (e) {
      console.error("Error updating category:", e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!canEdit) return;
    if (window.confirm('האם למחוק קטגוריה זו? מתכונים תחתיה יהפכו לללא קטגוריה.')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (e) {
        console.error("Error deleting category:", e);
      }
    }
  };

  const handleUrlImport = async () => {
    if (!canEdit) return;
    if (!importUrl.trim() && !importText.trim() && !importFile) return;
    setIsImporting(true);
    try {
      const scrapedContent = await importRecipeFromUrl(importUrl, 'auto', importText, importFile || undefined);
      if (scrapedContent) {
        const categoryId = categories.find(c => c.he === scrapedContent.suggestedCategory || c.es === scrapedContent.suggestedCategory)?.id || '';
        const recipesCol = collection(db, 'recipes');
        const newRecipe = {
          createdAt: Date.now(),
          categoryId,
          sourceUrl: importUrl.trim(),
          originalLanguage: scrapedContent.sourceLanguage==='es'?'es' as const:'he' as const,
          [Language.HE]: scrapedContent,
          ...(scrapedContent.sourceLanguage==='es'?{es:scrapedContent}:{}) ,
        };
        setDraft({...newRecipe,id:'draft'}); setEditingRecipe(null); setSelectedRecipe(null); setShowForm(true); setImportFile(null); setFileName('');
        setImportText('');
        setImportUrl('');
        setShowImportBar(false);
      } else {
        alert(UI_STRINGS[language].importError);
      }
    } catch (e) {
      alert(e instanceof Error?e.message:UI_STRINGS[language].importError);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!canEdit) return;
    if (window.confirm('להעביר את המתכון לסל המחזור?')) {
      try {
        await setDoc(doc(db, 'recipes', id), {deletedAt:Date.now()}, {merge:true});
        setSelectedRecipe(null);
      } catch (e) {
        console.error("Error deleting recipe:", e);
      }
    }
  };

  useEffect(() => { if (!canEdit) { setShowForm(false); setEditingRecipe(null); setDraft(null); setShowCategoryManager(false); setShowImportBar(false); setShowTrash(false); } }, [canEdit]);

  const t = UI_STRINGS[language];

  const processedRecipes = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(t => t.length > 0);

    let filtered = recipes.filter(recipe => {
      if(recipe.deletedAt)return false;
      // Category Filter
      if (selectedCategoryId !== 'all' && recipe.categoryId !== selectedCategoryId) return false;

      // Text Filter
      if (terms.length === 0) return true;
      const contents = [recipe.he,recipe.es].filter(Boolean);
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
        const titleA = (a[Language.HE]?.title || '').toLowerCase();
        const titleB = (b[Language.HE]?.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [recipes, debouncedQuery, searchInTitle, searchInIngredients, sortOption, selectedCategoryId]);

  return (
    <div className="mobile-main min-h-screen pb-32 px-3 md:px-12 transition-colors duration-700 font-heebo" dir={es?'ltr':'rtl'}>
      <header className="glass-header site-header py-6 mb-8">
        <div className="header-layout max-w-7xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <h1 
              dir="ltr" className="serif text-3xl md:text-4xl font-light tracking-widest text-[#1C1C1C] cursor-pointer hover:opacity-70 transition-opacity uppercase"
              onClick={() => { goBook(); setSelectedRecipe(null); setShowForm(false); setEditingRecipe(null); setSearchQuery(''); setSelectedCategoryId('all'); }}
            >
              SABOR & MASORET
            </h1>
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mt-1 font-semibold">L'Art de la Cuisine</span><div className="flex gap-2 mt-3" dir="ltr">{[Language.HE,Language.ES].map(lang=><button key={lang} aria-pressed={language===lang} className={(language===lang?'bg-[#333A31] text-white':'border border-[#D7C8A9]')+' px-4 py-2 text-sm'} onClick={()=>setLanguage(lang)} aria-label={lang===Language.HE?'עברית':'Castellano (Argentina)'} title={lang===Language.HE?'עברית':'Castellano (Argentina)'}>{lang===Language.HE?<svg aria-hidden="true" width="32" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="1" fill="white"/><path d="M0 4h32M0 18h32" stroke="#1649A0" strokeWidth="3"/><path d="M16 6.5l4.4 7.5h-8.8z M16 15.5l-4.4-7.5h8.8z" fill="none" stroke="#1649A0" strokeWidth="1.1"/></svg>:<svg aria-hidden="true" width="32" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="1" fill="#75AADB"/><path d="M0 7.33h32v7.34H0z" fill="white"/>{Array.from({length:16},(_,i)=><path key={i} d="M16 7.8v1.6" stroke="#B77B24" strokeWidth=".55" transform={'rotate('+i*22.5+' 16 11)'}/>)}<circle cx="16" cy="11" r="1.65" fill="#F6B40E" stroke="#B77B24" strokeWidth=".35"/></svg>}</button>)}</div>
          </div>
          
          {!showPlanner && <div className="search-area max-w-2xl w-full">
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={L("חפש מתכון...","Buscar receta…")}
                className="w-full bg-white border border-[#D7C8A9] rounded-md py-3 pr-4 pl-14 outline-none focus:border-[#8B7355] transition-all text-sm tracking-wide"
              />
              <div className="absolute top-1/2 -translate-y-1/2 flex items-center gap-4 left-2">
                <button aria-label={L("אפשרויות חיפוש ומיון","Opciones de búsqueda y orden")} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)} className={`p-1.5 transition-colors ${showFilters ? 'text-[#8B7355]' : 'text-[#1C1C1C]/30 hover:text-[#1C1C1C]'}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M6 12h12m-9 6h6" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-3 w-full bg-white premium-border p-4 rounded-md">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[11px] uppercase tracking-[0.1em] font-bold text-[#1C1C1C]/60">
                  <div className="space-y-4">
                    <p className="text-[#8B7355] border-b border-[#8B7355]/10 pb-2">{L("אפשרויות","Opciones")}</p>
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
                    <p className="text-[#8B7355] border-b border-[#8B7355]/10 pb-2">{L("מיון","Orden")}</p>
                    <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="bg-transparent border-none outline-none cursor-pointer hover:text-[#1C1C1C] w-full">
                      <option value="newest">{L("חדש ביותר","Más recientes")}</option>
                      <option value="oldest">{L("ישן ביותר","Más antiguas")}</option>
                      <option value="alphabetical">{L("א-ת","A-Z")}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>}

          <div className="desktop-actions flex flex-wrap justify-center items-center gap-2">
            {user ? <button onClick={() => signOut(auth).catch(() => alert("ההתנתקות נכשלה"))} className="border px-3 py-2 text-xs">{L("התנתקות","Cerrar sesión")} · {canEdit ? L("עריכה","Edición") : L("צפייה בלבד","Solo lectura")}</button> : <button onClick={login} className="border px-3 py-2 text-xs">{L("כניסה עם Google לעריכה","Ingresar con Google")}</button>}
            <button onClick={goBook} className={!showPlanner?"bg-[#333A31] text-white px-4 py-2 text-sm":"border px-4 py-2 text-sm"}>{L("ספר המתכונים","Recetario")}</button><button onClick={goPlanner} className={showPlanner?"bg-[#333A31] text-white px-4 py-2 text-sm":"border border-[#A68C58] px-4 py-2 text-sm"}>{L("תפריט שבועי וקניות","Menú semanal y compras")}</button>
            {canEdit && <><button onClick={()=>{goBook();setShowTrash(v=>!v)}} className="border px-3 py-2 text-xs">{L("סל מחזור","Papelera")}</button><button onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({recipes,categories,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}));a.download='sabor-masoret-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}} className="border px-3 py-2 text-xs">{L("גיבוי","Copia de seguridad")}</button></>}
            {!canEdit && <span className="text-xs text-[#8B7355]">{L("צפייה בלבד","Solo lectura")}</span>}
            {es&&canEdit&&<button disabled={!!translationProgress} onClick={translateBook} className="border border-[#A68C58] px-3 py-2 text-xs">{translationProgress||"Traducir el libro"}</button>}<button disabled={!recipes.length} onClick={() => printEdition(recipes)} className="border border-[#8B7355] px-3 py-2 text-xs">{L("הדפסת כל הספר / PDF","Imprimir libro / PDF")}</button>
            {selectedRecipe && <button onClick={() => printEdition([selectedRecipe],false)} className="border border-[#8B7355] px-3 py-2 text-xs">{L("הדפסת מתכון","Imprimir receta")}</button>}
            {canEdit && <><button 
              onClick={() => {goBook();setShowImportBar(!showImportBar)}} 
              className={`p-2 transition-colors ${showImportBar ? 'text-[#8B7355]' : 'text-[#1C1C1C]/40 hover:text-[#1C1C1C]'}`}
              title={t.importFromUrl}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={() => {goBook();setShowCategoryManager(true)}} className="p-2 text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors" title={t.manageCategories}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button onClick={() => { goBook(); setDraft(null); setShowForm(true); setSelectedRecipe(null); setEditingRecipe(null); }} className="bg-[#1C1C1C] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#8B7355] transition-all">
              {t.addRecipe}
            </button></>}
          </div>
        </div>
      </header>

      {showPlanner ? <main className="max-w-7xl mx-auto"><FamilyPlanner recipes={recipes.filter(r=>!r.deletedAt)} onClose={goBook} language={language}/></main> : <>
      {canEdit && showTrash && <section className="max-w-5xl mx-auto border p-5 mb-6 bg-white"><h2 className="serif text-2xl">{L("סל מחזור","Papelera")}</h2>{recipes.filter(r=>r.deletedAt).length===0&&<p>{L("אין מתכונים בסל","La papelera está vacía")}</p>}{recipes.filter(r=>r.deletedAt).map(r=><div key={r.id} className="flex justify-between border-b p-3"><span>{r.he.title}</span><button className="underline" onClick={async()=>{try{await setDoc(doc(db,'recipes',r.id),{deletedAt:null},{merge:true})}catch{alert('השחזור נכשל')}}}>{L("שחזור","Restaurar")}</button></div>)}</section>}
      {canEdit && showImportBar && (
        <div className="max-w-7xl mx-auto mb-12 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white premium-border p-6 flex flex-col md:flex-row gap-4 items-center shadow-xl">
            <input 
              type="text" 
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder={L("קישור לאינסטגרם או לאתר מתכונים","Enlace de Instagram o de una receta")}
              className="flex-1 w-full bg-[#F5F5F0] border-none py-3 px-4 outline-none text-sm"
            />
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={L("אם הקישור חסום, הדביקי כאן את תיאור הפוסט או המתכון","Si el enlace no funciona, pegá el texto de la receta")} className="w-full bg-[#F5F5F0] p-3 text-sm" />
            <label className="text-xs">{L("צילום או PDF","Foto o PDF")}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2500000){alert('הקובץ גדול מדי, עד 2.5MB');return;}const reader=new FileReader();reader.onload=()=>{setImportFile({mimeType:file.type,data:String(reader.result).split(',')[1]});setFileName(file.name)};reader.readAsDataURL(file)}} />{fileName&&<button onClick={()=>{setImportFile(null);setFileName('')}}>הסר {fileName}</button>}</label>
            <button 
              onClick={handleUrlImport}
              disabled={isImporting || (!importUrl.trim() && !importText.trim() && !importFile)}
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
        <div className="mobile-category-tabs max-w-7xl mx-auto mb-16 overflow-x-auto">
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
                {categoryLabel(cat,language)}
              </button>
            ))}
            {canEdit && <button 
              onClick={() => setShowCategoryManager(true)}
              className="text-[#8B7355] hover:text-[#1C1C1C] transition-colors p-2 flex items-center justify-center border border-[#8B7355]/20 rounded-full w-6 h-6 ml-4"
              title={t.manageCategories}
            >
              <span className="text-xs font-bold">+</span>
            </button>}
          </div>
        </div>
      )}

      {canEdit && showCategoryManager && (
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
        {(canEdit && (showForm || editingRecipe)) ? (
          <RecipeForm 
            language={language} 
            categories={categories}
            initialRecipe={editingRecipe || undefined}
            draft={draft || undefined}
            onSave={handleSaveRecipe} 
            onCancel={() => { setShowForm(false); setEditingRecipe(null); setDraft(null); }} 
            onAddCategory={handleAddCategory}
          />
        ) : selectedRecipe ? (
          <div className="animate-in fade-in duration-700">
            <button onClick={() => setSelectedRecipe(null)} className="mb-12 text-[#1C1C1C]/40 hover:text-[#8B7355] text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-4 transition-all">
              <span className="text-lg">←</span> {L("חזרה לגלריה","Volver a la galería")}
            </button>
            <RecipeView 
              recipe={selectedRecipe} 
              canEdit={canEdit}
              language={language} 
              onUpdate={async (updated) => { if (!canEdit) return; try { await setDoc(doc(db, "recipes", updated.id), updated, { merge: true }); setSelectedRecipe(updated); } catch { alert("שמירת התמונה נכשלה"); } }}
              onEdit={() => { setEditingRecipe(selectedRecipe); setSelectedRecipe(null); }}
              onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10 lg:gap-16 animate-in fade-in duration-1000">
            {processedRecipes.length === 0 ? (
              <div className="col-span-full py-40 text-center text-[#1C1C1C]/20 serif italic text-3xl">{L("אין עדיין מתכונים...","Todavía no hay recetas…")}</div>
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
      </>}
      {mobileMenu&&<div className="mobile-menu md:hidden" role="dialog" aria-label={L("תפריט","Menú")}><button onClick={()=>{setMobileMenu(false);installApp()}}>{L("התקנה במסך הבית","Instalar en pantalla de inicio")}</button>{es&&canEdit&&<button disabled={!!translationProgress} onClick={()=>{setMobileMenu(false);translateBook()}}>{translationProgress||"Traducir el libro"}</button>}<button onClick={()=>{setMobileMenu(false);printEdition(recipes)}}>{L("הדפסת הספר","Imprimir libro")}</button>{user?<button onClick={()=>{setMobileMenu(false);signOut(auth).catch(()=>alert('ההתנתקות נכשלה'))}}>{L("התנתקות","Cerrar sesión")}</button>:<button onClick={()=>{setMobileMenu(false);login()}}>{L("כניסה עם Google לעריכה","Ingresar con Google")}</button>}{canEdit&&<><button onClick={()=>{goBook();setShowImportBar(true);window.scrollTo(0,0)}}>{L("ייבוא מתכון באמצעות AI","Importar receta con IA")}</button><button onClick={()=>{goBook();setShowCategoryManager(true)}}>{L("ניהול קטגוריות","Administrar categorías")}</button><button onClick={()=>{goBook();setShowTrash(true);window.scrollTo(0,0)}}>{L("סל מחזור","Papelera")}</button><button onClick={()=>{setMobileMenu(false);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({recipes,categories},null,2)],{type:'application/json'}));a.download='sabor-masoret-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}>{L("הורדת גיבוי","Descargar copia de seguridad")}</button></>}</div>}
      <nav className="mobile-nav" aria-label={L("ניווט ראשי","Navegación principal")}><button onClick={()=>{goBook();setShowForm(false);setEditingRecipe(null);setDraft(null);setSelectedRecipe(null);setShowImportBar(false);setShowTrash(false);setSelectedCategoryId('all');setSearchQuery('');window.scrollTo(0,0)}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10l9-7 9 7v10H3z M9 20v-7h6v7"/></svg>{L("ספר","Libro")}</button><button onClick={()=>{goPlanner()}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>{L("תפריט","Menú")}</button><button onClick={()=>{setMobileMenu(false);if(!canEdit){login();return}setDraft(null);setSelectedRecipe(null);setEditingRecipe(null);setShowForm(true);goBook();setShowImportBar(false)}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>{L("מתכון חדש","Nueva receta")}</button><button aria-expanded={mobileMenu} onClick={()=>setMobileMenu(v=>!v)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16"/></svg>{L("עוד","Más")}</button></nav>
      <div className="hidden md:block"><ScrollToTop /></div>
    </div>
  );
};

export default App;
