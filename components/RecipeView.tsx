
import React, { useEffect, useState } from 'react';
import { Recipe, Language, RecipeContent, Unit } from '../types';
import { UI_STRINGS, UNITS } from '../constants';
import { ingredientGroups } from '../services/ingredientGroups';
import { generateRecipeImage } from '../services/geminiService';
import { printCookbook } from '../services/printCookbook';

interface Props {
  recipe: Recipe;
  canEdit: boolean;
  language: Language;
  onUpdate: (updated: Recipe) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const RecipeView: React.FC<Props> = ({ recipe, language, onUpdate, onEdit, onDelete, canEdit }) => {
  const t = UI_STRINGS[language];


  const [cooking,setCooking]=useState(false);
  const [checked,setChecked]=useState<string[]>([]);
  const [stepIndex,setStepIndex]=useState(0);
  const [minutes,setMinutes]=useState(5);
  const [deadline,setDeadline]=useState(0);
  const [remaining,setRemaining]=useState(0);
  const content = recipe.he;
  useEffect(()=>{setCooking(false);setChecked([]);setStepIndex(0);setDeadline(0);setRemaining(0)},[recipe.id,language]);
  useEffect(()=>{if(!deadline)return;const tick=()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(left);if(!left)setDeadline(0)};tick();const id=window.setInterval(tick,250);return()=>clearInterval(id)},[deadline]);
  useEffect(()=>{if(!cooking)return;let lock:any;let active=true;const acquire=async()=>{try{if(document.visibilityState==='visible'){const next=await (navigator as any).wakeLock?.request('screen');if(active)lock=next;else await next?.release()}}catch{}};acquire();document.addEventListener('visibilitychange',acquire);return()=>{active=false;document.removeEventListener('visibilitychange',acquire);lock?.release().catch(()=>{})}},[cooking]);

  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [scale, setScale] = useState<number>(1);

  const handleAiGen = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!content || !canEdit) return;
    setIsGeneratingImg(true);
    try {
      const url = await generateRecipeImage(`${content.title} ${content.description}`);
      if (url) {
        onUpdate({ ...recipe, image: url });
      }
    } catch (err) {
      console.error("AI Image Generation failed:", err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const getUnitLabel = (unitKey: string) => {
    if (!unitKey) return '';
    const unit = UNITS[unitKey as Unit] || UNITS[unitKey] || null;

    if (unit) return unit[language];
    return unitKey;
  };

  const formatAmount = (amount: number) => {
    const scaled = amount * scale;
    if (scaled === 0) return 0;
    // Round to 2 decimal places if needed
    return Math.round(scaled * 100) / 100;
  };

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-8 h-8 border-[1px] border-[#1C1C1C] border-t-transparent rounded-full animate-spin mb-6"></div>
      </div>
    );
  }

  const groupedIngredients = ingredientGroups(content.ingredients || []);

  const groupedInstructions = (content.instructions || []).reduce((acc: any, step) => {
    const cat = step.category || 'Général';
    acc[cat] = acc[cat] || [];
    acc[cat].push(step);
    return acc;
  }, {});

  return (
    <div id={`recipe-${recipe.id}`} className="recipe-detail max-w-5xl mx-auto bg-white shadow-[0_40px_100px_rgba(0,0,0,0.05)] border-[0.5px] border-[#1C1C1C]/5 mb-16 overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 will-change-transform">
      
      {/* Editorial Header Image - Height reduced for PDF efficiency */}
      <div className="relative h-[300px] md:h-[470px] overflow-hidden group/header">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            loading="lazy"
            className="w-full h-full object-cover  transition-all duration-[2s] scale-105 hover:scale-100" 
            alt={content.title} 
          />
        ) : (
          <div className="w-full h-full bg-[#F5F5F0] flex flex-col items-center justify-center">
            {canEdit && <button 
              type="button"
              onClick={handleAiGen} 
              disabled={isGeneratingImg}
              className="text-[#1C1C1C]/30 text-[10px] uppercase tracking-[0.5em] font-bold border-b border-[#1C1C1C]/10 pb-2 hover:text-[#1C1C1C] transition-all"
            >
              {isGeneratingImg ? 'מייצר...' : 'צור תמונה ב-AI'}
            </button>}
          </div>
        )}
        
        {/* Actions - Floating Bar */}
        {canEdit && <div className="absolute top-3 left-3 md:top-6 md:left-6 flex flex-col gap-3 z-30 print:hidden">
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} 
            className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-[#1C1C1C] hover:text-white transition-all duration-500 shadow-xl border border-white/20" 
            aria-label="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} 
            className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-red-600 hover:text-white transition-all duration-500 shadow-xl border border-white/20" 
            aria-label="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>}

        <div className="absolute top-3 right-3 md:top-6 md:right-6 z-30 print:hidden">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); printCookbook([recipe], [], false, scale); }}
            className="bg-[#1C1C1C] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#8B7355] transition-all shadow-xl flex items-center gap-2 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.exportPdf}
          </button>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C]/70 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="absolute bottom-6 left-5 right-5 md:bottom-10 md:left-10 md:right-10 pointer-events-none">
          <span className="text-[9px] uppercase tracking-[0.5em] text-white/70 font-bold mb-2 block">SABOR & MASORET</span>
          <h1 className="serif text-3xl md:text-6xl text-white font-light tracking-tight leading-none">{content.title}</h1>
          <div className="w-16 h-[1px] bg-white/40 mt-4"></div>
        </div>
      </div>

      <div className="detail-body p-8 md:p-12">
        <div className="flex flex-wrap justify-center gap-3 mb-6 print:hidden"><button className="border border-[#A68C58] px-4 py-2 text-sm" onClick={()=>setCooking(v=>!v)}>{"מצב בישול"}</button></div>

        {cooking&&<section role="dialog" aria-label="מצב בישול" className="cook-screen fixed inset-0 z-[100] bg-[#FAF9F6] overflow-y-auto p-5 md:p-12"><div className="max-w-3xl mx-auto space-y-6"><div className="flex justify-between items-center"><h2 className="serif text-3xl">{content.title}</h2><button className="border p-2" onClick={()=>setCooking(false)}>{"סיום"}</button></div><h3 className="serif text-xl">{"מצרכים"}</h3>{content.ingredients.map(i=><label className="flex gap-3 border-b py-2 text-lg" key={i.id}><input type="checkbox" checked={checked.includes(i.id)} onChange={e=>setChecked(p=>e.target.checked?[...p,i.id]:p.filter(x=>x!==i.id))}/><span className={checked.includes(i.id)?'line-through opacity-50':''}>{i.name} · {formatAmount(i.amount)} {getUnitLabel(i.unit)}</span></label>)}<div className="border border-[#A68C58] p-6"><h3 className="text-[#806A47]">שלב {Math.min(stepIndex+1,content.instructions.length)} מתוך {content.instructions.length}</h3><p className="text-2xl leading-relaxed my-6 whitespace-pre-wrap">{content.instructions[stepIndex]?.text||'אין הוראות הכנה'}</p><div className="flex justify-between"><button disabled={!stepIndex} className="border p-3 disabled:opacity-30" onClick={()=>setStepIndex(i=>i-1)}>{"הקודם"}</button><button disabled={stepIndex>=content.instructions.length-1} className="bg-[#333A31] text-white p-3 disabled:opacity-30" onClick={()=>setStepIndex(i=>i+1)}>{"הבא"}</button></div></div><div className="border p-4 flex flex-wrap items-center gap-3"><label>דקות <input type="number" min="1" max="180" value={minutes} onChange={e=>setMinutes(+e.target.value)} className="w-20 border p-2"/></label><button disabled={!Number.isFinite(minutes)||minutes<=0||minutes>180} className="border p-2" onClick={()=>{setRemaining(Math.ceil(minutes*60));setDeadline(Date.now()+minutes*60000)}}>{"הפעל טיימר"}</button><strong className="text-2xl" aria-live={remaining===0?'polite':'off'}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong><button className="border p-2" onClick={()=>{setDeadline(0);setRemaining(0)}}>{"איפוס"}</button></div><p className="text-xs">המסך יישאר פעיל במכשירים תומכים כל עוד מצב הבישול פתוח. הטיימר חזותי.</p></div></section>}

        {/* Intro Description & Scaling Controls */}
        <div className="max-w-2xl mx-auto text-center mb-10 space-y-8">
          <p className="serif text-xl italic text-[#1C1C1C]/70 leading-relaxed font-light">
            "{content.description}"
          </p>

          <div className="flex flex-col items-center gap-4 print:hidden">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8B7355] font-bold">{t.servings}</span>
            <div className="flex bg-[#F5F5F0] p-1 rounded-full border border-[#1C1C1C]/5 overflow-x-auto max-w-full">
              {[
                { label: t.fifthPortion, value: 0.2, short: '1/5' },
                { label: t.quarterPortion, value: 0.25, short: '1/4' },
                { label: t.halfPortion, value: 0.5, short: '1/2' },
                { label: t.fullPortion, value: 1, short: '1x' },
                { label: t.doublePortion, value: 2, short: 'x2' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScale(opt.value)}
                  className={`px-4 md:px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap ${scale === opt.value ? 'bg-[#1C1C1C] text-white shadow-lg' : 'text-[#1C1C1C]/40 hover:text-[#1C1C1C]'}`}
                  title={opt.label}
                >
                  {opt.short}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Ingredients Column */}
          <div className="detail-ingredients lg:col-span-4 border-l-[0.5px] border-[#1C1C1C]/10 pl-6">
            <h2 className="serif text-lg uppercase tracking-widest text-[#8B7355] mb-6 font-bold italic">{t.ingredients}</h2>
            <div className="space-y-4">
              {groupedIngredients.map(({name:cat,items:ings},index) => (
                <div key={index} className="space-y-2">
                  {!['כללי','General','Général'].includes(cat)&&<h3 className="text-xs font-bold text-[#806A47] border-b pb-1">{cat}</h3>}
                  <ul className="space-y-1">
                    {ings.map((ing: any) => (
                      <li key={ing.id} className="flex justify-between items-baseline group">
                        <span className="text-sm font-medium text-[#1C1C1C]">{ing.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[#1C1C1C]/40 italic ml-2">
                          {formatAmount(ing.amount)} {getUnitLabel(ing.unit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Preparation Column */}
          <div className="lg:col-span-8">
            <h2 className="serif text-lg uppercase tracking-widest text-[#8B7355] mb-6 font-bold italic">{t.instructions}</h2>
            <div className="space-y-6">
              {Object.entries(groupedInstructions).map(([cat, steps]: [string, any]) => (
                <div key={cat} className="space-y-4">
                  {!['כללי','General','Général'].includes(cat)&&<div className="flex items-center gap-4 mb-2">
                    <h3 className="text-[9px] font-bold text-[#1C1C1C]/40 uppercase tracking-[0.3em] whitespace-nowrap">{cat}</h3>
                    <div className="w-full h-[0.5px] bg-[#1C1C1C]/5"></div>
                  </div>}
                  <div className="space-y-4">
                    {steps.map((step: any, idx: number) => (
                      <div key={step.id} className="relative group flex gap-4">
                        <span className="serif text-3xl text-[#A68C58] font-light leading-none select-none">
                          {idx + 1}
                        </span>
                        <p className="text-base text-[#1C1C1C] leading-relaxed font-light">
                          {step.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Flourish */}
        <div className="flourish-line !my-6"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {content.ovenInstructions && (
            <div className="space-y-1">
              <h4 className="text-[9px] uppercase tracking-[0.3em] text-[#8B7355] font-bold">{t.oven}</h4>
              <p className="text-sm text-[#1C1C1C]/60 italic font-light leading-snug">{content.ovenInstructions}</p>
            </div>
          )}
          {content.notes && (
            <div className="space-y-1">
              <h4 className="text-[9px] uppercase tracking-[0.3em] text-[#8B7355] font-bold">{t.notes}</h4>
              <p className="text-sm text-[#1C1C1C]/60 italic font-light leading-snug">{content.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
           <p className="serif text-4xl text-[#1C1C1C]/5 italic lowercase tracking-tighter animate-pulse select-none">
             {t.bonAppetit}
           </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeView;
