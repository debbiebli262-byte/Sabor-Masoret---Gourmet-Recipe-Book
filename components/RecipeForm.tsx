
import React, { useState, useEffect, useRef } from 'react';
import { Recipe, Language, RecipeContent, Ingredient, PrepStep, Unit, Category } from '../types';
import { UI_STRINGS, UNITS, categoryLabel } from '../constants';
import { ingredientGroups, normalizeIngredientHeading, preparationGroups } from '../services/ingredientGroups';
import { parseIngredientList } from '../services/ingredientParser';
import { generateRecipeImage } from '../services/geminiService';

interface Props {
  language: Language;
  initialRecipe?: Recipe;
  draft?: Recipe;
  categories: Category[];
  onSave: (recipe: Partial<Recipe>) => Promise<boolean>;
  onCancel: () => void;
  onAddCategory: (cat: Omit<Category, 'id'>) => Promise<Category | null>;
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
    <div className="unit-select relative col-span-2" ref={dropdownRef}>
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
              placeholder={'חפש...'}
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

const RecipeForm: React.FC<Props> = ({ language, initialRecipe, draft, categories, onSave, onCancel, onAddCategory }) => {
  const t = UI_STRINGS[language];

  const [saving,setSaving]=useState(false);

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
  const [bulkIngredients,setBulkIngredients] = useState('');
  const [bulkMessage,setBulkMessage] = useState('');
  const createIngredients = () => {
    const {ingredients,unparsed} = parseIngredientList(bulkIngredients);
    if (ingredients.length) setContent(prev=>{const category=normalizeIngredientHeading(prev.ingredients[prev.ingredients.length-1]?.category);return {...prev,ingredients:[...prev.ingredients.filter(i=>i.name.trim()||normalizeIngredientHeading(i.category)!==category),...ingredients.map(i=>({...i,category}))]}});
    setBulkIngredients(unparsed.join('\n'));
    setBulkMessage('נוספו '+ingredients.length+' מצרכים.'+(unparsed.length?' '+unparsed.length+' שורות לא זוהו; השלימי כמות ויחידה או הוסיפי ידנית.':''));
  };
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Quick category adding state
  const [isAddingQuickCategory, setIsAddingQuickCategory] = useState(false);
  const [quickCatHe, setQuickCatHe] = useState('');

  useEffect(() => {
    const source=initialRecipe||draft;
    if (source) {
      const existingContent = source.he;

      
      if (existingContent) {
        setContent({
          ...existingContent,
          ingredients: existingContent.ingredients || [],
          instructions: existingContent.instructions || []
        });
      }
      
      if (source.image) setImage(source.image);
      if (source.categoryId) setCategoryId(source.categoryId);
    }
  }, [initialRecipe,draft]);

  const blankIngredient=(category:string):Ingredient=>({id:crypto.randomUUID(),name:'',amount:1,unit:'gram',category});
  const addIngredient = (afterId?:string) => {
    setContent(prev=>{
      const items=[...prev.ingredients];
      const index=afterId?items.findIndex(i=>i.id===afterId):items.length-1;
      const category=normalizeIngredientHeading(items[index]?.category);
      items.splice(index+1,0,blankIngredient(category));
      return {...prev,ingredients:items};
    });
  };
  const addHeading=()=>{
    const name=window.prompt('שם הכותרת, למשל: לבצק, למילוי או לרוטב')?.trim();
    if(!name)return;
    if(normalizeIngredientHeading(name)==='כללי'){alert('בחרי שם ייחודי לכותרת');return}
    setContent(prev=>{
      if(normalizeIngredientHeading(prev.ingredients[prev.ingredients.length-1]?.category)===name){alert('כותרת זו כבר נמצאת בסוף הרשימה');return prev}
      return {...prev,ingredients:[...prev.ingredients,blankIngredient(name)]};
    });
  };
  const renameHeading=(ids:string[],name:string)=>setContent(prev=>({...prev,ingredients:prev.ingredients.map(i=>ids.includes(i.id)?{...i,category:normalizeIngredientHeading(name)}:i)}));
  const ingredientSections=ingredientGroups(content.ingredients);
  const [bulkSteps,setBulkSteps]=useState('');
  const blankStep=(category:string):PrepStep=>({id:crypto.randomUUID(),text:'',category});
  const createSteps=()=>{
    const lines=bulkSteps.split(/\r?\n/).map(x=>x.trim().replace(/^(?:\d+[.)]|[•●▪–*-])\s*/, '')).filter(Boolean);
    if(!lines.length)return;
    setContent(p=>{
      const category=normalizeIngredientHeading(p.instructions[p.instructions.length-1]?.category);
      return {...p,instructions:[...p.instructions.filter(x=>x.text.trim()||normalizeIngredientHeading(x.category)!==category),...lines.map(text=>({...blankStep(category),text}))]};
    });
    setBulkSteps('');
  };
  const addStep=(afterId?:string)=>{
    setContent(prev=>{
      const items=[...prev.instructions];
      const index=afterId?items.findIndex(i=>i.id===afterId):items.length-1;
      const category=normalizeIngredientHeading(items[index]?.category);
      items.splice(index+1,0,blankStep(category));
      return {...prev,instructions:items};
    });
  };
  const addPrepHeading=()=>{
    const name=window.prompt('שם הכותרת, למשל: הכנת הבצק, הכנת המילוי או אפייה')?.trim();
    if(!name)return;
    if(normalizeIngredientHeading(name)==='כללי'){alert('בחרי שם אחר לכותרת');return}
    if(normalizeIngredientHeading(content.instructions[content.instructions.length-1]?.category)===name){alert('כותרת זו כבר נמצאת בסוף הרשימה');return}
    setContent(prev=>({...prev,instructions:[...prev.instructions,blankStep(name)]}));
  };
  const renamePrepHeading=(ids:string[],name:string)=>setContent(prev=>({...prev,instructions:prev.instructions.map(i=>ids.includes(i.id)?{...i,category:normalizeIngredientHeading(name)}:i)}));
  const prepSections=preparationGroups(content.instructions);

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
    if (!file) return;
    if (file.size > 450000) {
      alert('התמונה גדולה מדי. הגודל המרבי להעלאה הוא 450 KB. מומלץ להשתמש בתמונת JPG מוקטנת.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.onerror = () => alert('לא ניתן לקרוא את התמונה.');
    reader.readAsDataURL(file);
  };

  const handleQuickAddCategory = async () => {
    if (quickCatHe.trim()) {
      const newCat = await onAddCategory({
        [Language.HE]: quickCatHe
      });
      if (!newCat) { alert('הוספת הקטגוריה נכשלה'); return; }
      setCategoryId(newCat.id);
      setIsAddingQuickCategory(false);
      setQuickCatHe('');
    }
  };

  return (
    <div className="recipe-form bg-white p-8 md:p-16 border-[0.5px] border-[#1C1C1C]/10 shadow-2xl max-w-5xl mx-auto animate-in fade-in duration-700 relative">
      <div className="text-center mb-16">
        <h2 className="serif text-4xl font-light text-[#1C1C1C] mb-4 uppercase tracking-tighter">
          {initialRecipe ? 'עריכת מתכון' : 'מתכון חדש'}
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
                  {isAddingQuickCategory ? '-' : '+ הוסף קטגוריה חדשה'}
                </button>
              </div>

              {isAddingQuickCategory ? (
                <div className="bg-[#F5F5F0] p-4 space-y-3 animate-in slide-in-from-top-2 duration-300 border border-[#8B7355]/20">
                  <div className="grid grid-cols-1 gap-2">
                    <input 
                      className="bg-white p-2 text-[10px] outline-none border border-transparent focus:border-[#8B7355]/30" 
                      placeholder={t.categoryNameHe} 
                      value={quickCatHe} 
                      onChange={e => setQuickCatHe(e.target.value)} 
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
                    <option key={cat.id} value={cat.id}>{categoryLabel(cat,language)}</option>
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
             <label className="text-[10px] uppercase tracking-[0.4em] text-[#1C1C1C]/40 font-bold block mb-3">{"ויזואליה של המנה"}</label>
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
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" aria-describedby="recipe-image-limit" />
                  </label>
                </div>
                <p id="recipe-image-limit" className="text-sm text-[#806A47] leading-relaxed">גודל תמונה מרבי להעלאה: <strong>450 KB</strong>. מומלץ להשתמש בקובץ JPG בגודל של עד 300 KB.</p>
                {image && <img src={image} className="w-full aspect-video object-cover grayscale-[0.2] border border-[#1C1C1C]/5 shadow-inner" alt="Preview" />}
             </div>
          </div>
        </div>

        <section>
          <div className="flex justify-between items-baseline border-b border-[#1C1C1C]/5 pb-3 mb-8">
            <h3 className="serif text-2xl text-[#1C1C1C] italic">{t.ingredients}</h3>
            <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={addHeading} className="text-[#8B7355] text-xs font-bold hover:text-[#1C1C1C]">+ הוספת כותרת</button><button type="button" onClick={()=>addIngredient()} className="text-[#8B7355] text-xs font-bold hover:text-[#1C1C1C]">+ {t.addIngredient}</button></div>
          </div>
          <div className="bg-[#FAF9F6] border border-[#8B7355]/20 p-4 mb-6 space-y-3">
            <label htmlFor="bulk-ingredients" className="block font-medium text-sm">{"הדבקה מהירה של מצרכים"}</label>
            <p className="text-xs text-[#6B6255]">מצרך אחד בכל שורה, למשל 250 גרם קמח או קמח 250 גרם. הרשימה תתווסף לקבוצת המצרכים האחרונה.</p>
            <textarea id="bulk-ingredients" rows={5} className="w-full bg-white border border-[#8B7355]/20 p-3 text-sm outline-none" value={bulkIngredients} onChange={e=>{setBulkIngredients(e.target.value);setBulkMessage('')}} placeholder={'250 גרם קמח\n100 גרם סוכר\n2 ביצים\nחצי כפית מלח'}/>
            <button type="button" disabled={!bulkIngredients.trim()} onClick={createIngredients} className="bg-[#333A31] text-white px-5 py-3 text-sm disabled:opacity-40">{"צור רשימת מצרכים"}</button>
            {bulkMessage && <p role="status" className="text-sm">{bulkMessage}</p>}
          </div>
          <div className="space-y-3">
            {ingredientSections.map((section,index)=><div key={section.items[0].id} className="space-y-3">
              {section.name!=='כללי'&&<div className="flex items-center gap-2 bg-[#F5F5F0] border-b border-[#D7C8A9] px-3 py-2 mt-4"><input aria-label="שם כותרת המצרכים" key={section.name} defaultValue={section.name} onBlur={e=>renameHeading(section.items.map(i=>i.id),e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}}} className="flex-1 min-w-0 bg-transparent text-sm font-bold text-[#806A47] p-2"/><button type="button" className="text-xs text-[#98594B] px-2" onClick={()=>renameHeading(section.items.map(i=>i.id),ingredientSections[index-1]?.name||'כללי')}>הסר כותרת</button></div>}
              {section.items.map(ing => (
              <div key={ing.id} className="ingredient-row grid grid-cols-12 gap-3 items-center animate-in fade-in duration-300">
                <input className="ingredient-name col-span-7 min-w-0 bg-[#F5F5F0] p-3 text-xs outline-none focus:bg-white transition-colors" placeholder={t.ingredients} value={ing.name} onChange={e => updateIngredient(ing.id, 'name', e.target.value)} />
                <input type="number" inputMode="decimal" min="0" step="any" className="ingredient-amount col-span-2 min-w-0 bg-[#F5F5F0] p-3 text-xs outline-none text-center focus:bg-white transition-colors" value={Number.isFinite(ing.amount)?ing.amount:""} onChange={e => updateIngredient(ing.id, 'amount', e.target.valueAsNumber)} />
                <UnitSelect value={ing.unit} onChange={(val) => updateIngredient(ing.id, 'unit', val)} language={language} />

                <button onClick={() => removeIngredient(ing.id)} className="ingredient-delete col-span-1 text-red-300 hover:text-red-600 transition-colors flex justify-center"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            ))}
              {section.name!=='כללי'&&<button type="button" onClick={()=>addIngredient(section.items[section.items.length-1].id)} className="text-xs text-[#806A47] px-2 py-2">+ הוסף מצרך לקבוצה</button>}
            </div>)}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-baseline border-b border-[#1C1C1C]/5 pb-3 mb-8">
            <h3 className="serif text-2xl text-[#1C1C1C] italic">{t.instructions}</h3>
            <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={addPrepHeading} className="text-[#8B7355] text-xs font-bold hover:text-[#1C1C1C]">+ הוספת כותרת</button><button type="button" onClick={()=>addStep()} className="text-[#8B7355] text-xs font-bold hover:text-[#1C1C1C]">+ {t.addStep}</button></div>
          </div>
          <div className="bg-[#FAF9F6] border border-[#8B7355]/20 p-4 mb-6 space-y-3">
            <label htmlFor="bulk-steps" className="block font-medium text-sm">{"הדבקה מהירה של הוראות הכנה"}</label>
            <p className="text-xs text-[#6B6255]">כל שלב בשורה נפרדת. השלבים יתווספו לקבוצה האחרונה.</p><textarea id="bulk-steps" rows={5} value={bulkSteps} onChange={e=>setBulkSteps(e.target.value)} className="w-full bg-white border p-3 text-sm" placeholder={"כל שלב בשורה נפרדת"}/>
            <button type="button" disabled={!bulkSteps.trim()} onClick={createSteps} className="bg-[#333A31] text-white px-5 py-3 text-sm disabled:opacity-40">{"צור שלבי הכנה"}</button>
          </div>
          <div className="space-y-8">
            {prepSections.map((section,index)=><div key={section.items[0].id} className="space-y-4">
              {section.name!=='כללי'&&<div className="flex items-center gap-2 bg-[#F5F5F0] border-b border-[#D7C8A9] px-3 py-2"><input aria-label="שם כותרת אופן ההכנה" key={section.name} defaultValue={section.name} onBlur={e=>renamePrepHeading(section.items.map(i=>i.id),e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}}} className="flex-1 min-w-0 bg-transparent text-sm font-bold text-[#806A47] p-2"/><button type="button" className="text-xs text-[#98594B] px-2" onClick={()=>renamePrepHeading(section.items.map(i=>i.id),prepSections[index-1]?.name||'כללי')}>הסר כותרת</button></div>}
              {section.items.map((step, idx) => (
              <div key={step.id} className="flex gap-6 items-start animate-in fade-in duration-300">
                <span className="serif text-3xl text-[#A68C58] italic">{section.start + idx + 1}</span>
                <div className="flex-1 space-y-3">
                  <textarea className="w-full bg-[#F5F5F0] p-5 text-sm outline-none focus:ring-1 focus:ring-[#8B7355] min-h-[80px] focus:bg-white transition-colors" placeholder={t.instructions} value={step.text} onChange={e => updateStep(step.id, 'text', e.target.value)} />
                  <div className="flex justify-between items-center">

                    <button onClick={() => removeStep(step.id)} className="text-red-300 hover:text-red-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            ))}
              {section.name!=='כללי'&&<button type="button" onClick={()=>addStep(section.items[section.items.length-1].id)} className="text-xs text-[#806A47] px-2 py-2">+ הוסף שלב לקבוצה</button>}
            </div>)}
          </div>
        </section>

        <section className="space-y-4"><label>{t.notes}</label><textarea className="w-full bg-[#F5F5F0] p-4" value={content.notes || ""} onChange={e => setContent({...content, notes:e.target.value})}/><label>{t.oven}</label><textarea className="w-full bg-[#F5F5F0] p-4" value={content.ovenInstructions || ""} onChange={e => setContent({...content, ovenInstructions:e.target.value})}/></section>
        <div className="flex flex-col sm:flex-row gap-4 pt-12 border-t border-[#1C1C1C]/5">
          <button disabled={saving} onClick={async()=>{
            if(saving)return;
            if(content.instructions.some(step=>!step.text.trim())){alert('יש להשלים את הוראות ההכנה או להסיר שלבים ריקים');return}
            if(!content.title.trim()||content.ingredients.some(i=>!i.name.trim()||!Number.isFinite(i.amount)||i.amount<0)){alert('יש להשלים שם וכמות לכל מצרך ושם מתכון');return}

            setSaving(true);
            try{await onSave({he:content,image,categoryId:categoryId||'',...(draft?.sourceUrl?{sourceUrl:draft.sourceUrl}:{})})}finally{setSaving(false)}
          }} className="flex-1 bg-[#1C1C1C] text-white font-bold py-5 text-xs uppercase tracking-[0.4em] hover:bg-[#8B7355] shadow-2xl transition-all">
            {saving?'שומר מתכון…':t.save}
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
