
import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Language, RecipeContent, Ingredient, PrepStep, Unit, Category } from '../types';
import { UI_STRINGS, UNITS } from '../constants';
import { generateRecipeImage } from '../services/geminiService';

interface Props {
  language: Language;
  initialRecipe?: Recipe;
  categories: Category[];
  onSave: (recipe: Partial<Recipe>) => void;
  onCancel: () => void;
  onAddCategory: (cat: Omit<Category, 'id'>) => Category;
}

const UnitSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  language: Language;
}> = ({ value, onChange, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = Object.entries(UNITS).filter(([key, val]) => 
    val[language].toLowerCase().includes(search.toLowerCase()) || 
    key.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = UNITS[value] ? UNITS[value][language] : value;

  return (
    <div className="relative col-span-2" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#F5F5F0] p-4 text-xs cursor-pointer flex justify-between items-center group hover:bg-[#F0EEE6] transition-colors"
      >
        <span className="truncate font-medium text-[#1C1C1C] uppercase tracking-wider">{selectedLabel}</span>
        <svg className={`w-3 h-3 text-[#1C1C1C]/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white shadow-2xl border-[0.5px] border-[#1C1C1C]/10 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-[#1C1C1C]/5">
            <input 
              type="text" 
              autoFocus
              className="w-full bg-[#F5F5F0] p-2 text-[10px] outline-none italic"
              placeholder={language === Language.HE ? 'חפש...' : 'Filtrer...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {options.map(([key, val]) => (
              <div 
                key={key}
                onClick={() => { onChange(key); setIsOpen(false); setSearch(''); }}
                className={`p-3 text-[10px] uppercase tracking-[0.1em] cursor-pointer hover:bg-[#8B7355] hover:text-white transition-colors ${value === key ? 'bg-[#1C1C1C] text-white' : 'text-[#1C1C1C]'}`}
              >
                {val[language]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RecipeForm: React.FC<Props> = ({ language, initialRecipe, categories, onSave, onCancel, onAddCategory }) => {
  const t = UI_STRINGS[language];
  const [content, setContent] = useState<RecipeContent>({
    title: '',
    description: '',
    ingredients: [],
    instructions: [],
    notes: '',
    ovenInstructions: ''
  });
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [image, setImage] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quick category adding state
  const [isAddingQuickCategory, setIsAddingQuickCategory] = useState(false);
  const [quickCatHe, setQuickCatHe] = useState('');
  const [quickCatEs, setQuickCatEs] = useState('');

  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (initialRecipe) {
      const existingContent = initialRecipe[language];
      const fallbackContent = initialRecipe[language === Language.HE ? Language.ES : Language.HE];
      
      if (existingContent) {
        setContent({
          ...existingContent,
          ingredients: existingContent.ingredients || [],
          instructions: existingContent.instructions || []
        });
      } else if (fallbackContent && !isTranslating) {
        // Trigger translation for the form
        const doTranslate = async () => {
          setIsTranslating(true);
          try {
            const { translateRecipe } = await import('../services/geminiService');
            const translated = await translateRecipe(fallbackContent, language);
            if (translated) {
              setContent(translated);
            } else {
              // Fallback to untranslated if AI fails
              setContent(fallbackContent);
            }
          } catch (e) {
            setContent(fallbackContent);
          } finally {
            setIsTranslating(false);
          }
        };
        doTranslate();
      }
      
      if (initialRecipe.image) setImage(initialRecipe.image);
      if (initialRecipe.categoryId) setCategoryId(initialRecipe.categoryId);
    }
  }, [initialRecipe, language, isTranslating]);

  const addIngredient = () => {
    const newIng: Ingredient = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      amount: 1,
      unit: 'units',
      category: t.ingredientCategories[0]
    };
    setContent(prev => ({ ...prev, ingredients: [...(prev.ingredients || []), newIng] }));
  };

  const addStep = () => {
    const newStep: PrepStep = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      category: 'General'
    };
    setContent(prev => ({ ...prev, instructions: [...(prev.instructions || []), newStep] }));
  };

  const removeIngredient = (id: string) => {
    setContent(prev => ({ ...prev, ingredients: prev.ingredients.filter(ing => ing.id !== id) }));
  };

  const removeStep = (id: string) => {
    setContent(prev => ({ ...prev, instructions: prev.instructions.filter(step => step.id !== id) }));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setContent(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).map(ing => ing.id === id ? { ...ing, [field]: value } : ing)
    }));
  };

  const updateStep = (id: string, field: keyof PrepStep, value: any) => {
    setContent(prev => ({
      ...prev,
      instructions: (prev.instructions || []).map(step => step.id === id ? { ...step, [field]: value } : step)
    }));
  };

  const handleAiGen = async () => {
    if (!aiPrompt && !content.title) return;
    setIsGenerating(true);
    const prompt = aiPrompt || `${content.title} ${content.description}`;
    const url = await generateRecipeImage(prompt);
    if (url) setImage(url);
    setIsGenerating(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleQuickAddCategory = () => {
    if (quickCatHe.trim() && quickCatEs.trim()) {
      const newCat = onAddCategory({
        [Language.HE]: quickCatHe,
        [Language.ES]: quickCatEs
      });
      setCategoryId(newCat.id);
      setIsAddingQuickCategory(false);
      setQuickCatHe('');
      setQuickCatEs('');
    }
  };

  return (
    <div className="bg-white p-8 md:p-16 border-[0.5px] border-[#1C1C1C]/10 shadow-2xl max-w-5xl mx-auto animate-in fade-in duration-700 relative">
      {isTranslating && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#1C1C1C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1C1C1C]">{t.translateLoading}</p>
        </div>
      )}
      <div className="text-center mb-16">
        <h2 className="serif text-4xl font-light text-[#1C1C1C] mb-4 uppercase tracking-tighter">
          {initialRecipe ? (language === Language.HE ? 'עריכת מתכון' : 'Édition de Recette') : (language === Language.HE ? 'מתכון חדש' : 'Nouvelle Création')}
        </h2>
        <div className="w-16 h-[1px] bg-[#8B7355] mx-auto"></div>
      </div>
      
      <div className="space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold block mb-3">{t.title}</label>
              <input
                type="text"
                className="w-full bg-[#F5F5F0] border-none p-4 outline-none focus:ring-1 focus:ring-[#8B7355] transition-all text-lg serif italic"
                value={content.title}
                onChange={e => setContent({ ...content, title: e.target.value })}
              />
            </div>
            
            {/* Category Select with Quick Add */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold">{t.category}</label>
                <button 
                  type="button"
                  onClick={() => setIsAddingQuickCategory(!isAddingQuickCategory)}
                  className="text-[#8B7355] hover:text-[#1C1C1C] text-[9px] font-bold uppercase tracking-widest transition-colors"
                >
                  {isAddingQuickCategory ? '-' : '+ ' + (language === Language.HE ? 'הוסף קטגוריה חדשה' : 'Añadir Nueva')}
                </button>
              </div>

              {isAddingQuickCategory ? (
                <div className="bg-[#F5F5F0] p-4 space-y-3 animate-in slide-in-from-top-2 duration-300 border border-[#8B7355]/20">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      className="bg-white p-2 text-[10px] outline-none border border-transparent focus:border-[#8B7355]/30" 
                      placeholder={t.categoryNameHe} 
                      value={quickCatHe} 
                      onChange={e => setQuickCatHe(e.target.value)} 
                    />
                    <input 
                      className="bg-white p-2 text-[10px] outline-none border border-transparent focus:border-[#8B7355]/30" 
                      placeholder={t.categoryNameEs} 
                      value={quickCatEs} 
                      onChange={e => setQuickCatEs(e.target.value)} 
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handleQuickAddCategory}
                      className="flex-1 bg-[#1C1C1C] text-white py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-[#8B7355]"
                    >
                      {t.save}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAddingQuickCategory(false)}
                      className="px-4 py-2 text-[#1C1C1C]/40 text-[9px] font-bold uppercase tracking-widest hover:text-[#1C1C1C]"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <select 
                  className="w-full bg-[#F5F5F0] p-4 text-xs outline-none cursor-pointer border-none"
                  value={categoryId || ''}
                  onChange={e => setCategoryId(e.target.value || undefined)}
                >
                  <option value="">{t.uncategorized}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat[language]}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold block mb-3">{t.description}</label>
              <textarea
                className="w-full bg-[#F5F5F0] border-none p-4 outline-none focus:ring-1 focus:ring-[#8B7355] transition-all min-h-[100px] text-sm font-light italic"
                value={content.description}
                onChange={e => setContent({ ...content, description: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-6">
             <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold block mb-3">{language === Language.HE ? 'ויזואליה של המנה' : 'Visuel Signature'}</label>
             <div className="bg-[#F5F5F0] p-6 space-y-4">
                <input
                  type="text"
                  className="w-full bg-white border-none p-4 text-[10px] outline-none focus:ring-1 focus:ring-[#8B7355]"
                  placeholder={t.promptPlaceholder}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={handleAiGen} disabled={isGenerating} className="flex-1 bg-[#1C1C1C] text-white text-[9px] font-bold uppercase py-3 tracking-widest hover:bg-[#8B7355] flex items-center justify-center gap-2">
                    {isGenerating ? '...' : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> {t.generateImage}</>}
                  </button>
                  <label className="flex-1 bg-white text-[#1C1C1C] text-[9px] font-bold uppercase py-3 tracking-widest border border-[#1C1C1C]/10 text-center cursor-pointer hover:bg-[#F5F5F0] flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> {t.uploadImage}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                {image && <img src={image} className="w-full aspect-video object-cover grayscale-[0.2] border border-[#1C1C1C]/5 shadow-inner" alt="Preview" />}
             </div>
          </div>
        </div>

        <section>
          <div className="flex justify-between items-baseline border-b border-[#1C1C1C]/5 pb-3 mb-8">
            <h3 className="serif text-2xl text-[#1C1C1C] italic">{t.ingredients}</h3>
            <button onClick={addIngredient} className="text-[#8B7355] text-[10px] font-bold uppercase tracking-widest hover:text-[#1C1C1C] transition-colors">+ {t.addIngredient}</button>
          </div>
          <div className="space-y-3">
            {(content.ingredients || []).map(ing => (
              <div key={ing.id} className="grid grid-cols-12 gap-3 items-center animate-in fade-in duration-300">
                <input className="col-span-4 bg-[#F5F5F0] p-3 text-xs outline-none focus:bg-white transition-colors" placeholder={t.ingredients} value={ing.name} onChange={e => updateIngredient(ing.id, 'name', e.target.value)} />
                <input type="number" className="col-span-2 bg-[#F5F5F0] p-3 text-xs outline-none text-center focus:bg-white transition-colors" value={ing.amount} onChange={e => updateIngredient(ing.id, 'amount', parseFloat(e.target.value))} />
                <UnitSelect value={ing.unit} onChange={(val) => updateIngredient(ing.id, 'unit', val)} language={language} />
                <input className="col-span-3 bg-[#F5F5F0] p-3 text-xs outline-none focus:bg-white transition-colors" placeholder={t.category} value={ing.category} onChange={e => updateIngredient(ing.id, 'category', e.target.value)} />
                <button onClick={() => removeIngredient(ing.id)} className="col-span-1 text-red-300 hover:text-red-600 transition-colors flex justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-baseline border-b border-[#1C1C1C]/5 pb-3 mb-8">
            <h3 className="serif text-2xl text-[#1C1C1C] italic">{t.instructions}</h3>
            <button onClick={addStep} className="text-[#8B7355] text-[10px] font-bold uppercase tracking-widest hover:text-[#1C1C1C] transition-colors">+ {t.addStep}</button>
          </div>
          <div className="space-y-8">
            {(content.instructions || []).map((step, idx) => (
              <div key={step.id} className="flex gap-6 items-start animate-in fade-in duration-300">
                <span className="serif text-4xl text-[#F5F5F0] italic">{idx + 1}</span>
                <div className="flex-1 space-y-3">
                  <textarea className="w-full bg-[#F5F5F0] p-5 text-sm outline-none focus:ring-1 focus:ring-[#8B7355] min-h-[80px] focus:bg-white transition-colors" placeholder={t.instructions} value={step.text} onChange={e => updateStep(step.id, 'text', e.target.value)} />
                  <div className="flex justify-between items-center">
                    <input className="bg-transparent border-b border-[#1C1C1C]/10 text-[9px] uppercase tracking-widest outline-none py-1 text-[#1C1C1C]/40 focus:text-[#1C1C1C] transition-colors" placeholder={t.category} value={step.category} onChange={e => updateStep(step.id, 'category', e.target.value)} />
                    <button onClick={() => removeStep(step.id)} className="text-red-300 hover:text-red-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-4 pt-12 border-t border-[#1C1C1C]/5">
          <button onClick={() => onSave({ [language]: content, image, categoryId })} className="flex-1 bg-[#1C1C1C] text-white font-bold py-5 text-xs uppercase tracking-[0.4em] hover:bg-[#8B7355] shadow-2xl transition-all">
            {t.save}
          </button>
          <button onClick={onCancel} className="px-10 py-5 text-[#1C1C1C]/40 font-bold text-[10px] uppercase tracking-widest hover:text-[#1C1C1C] transition-all">
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeForm;
