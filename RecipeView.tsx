import React, { useEffect, useState } from 'react';
import { Recipe, Language, RecipeContent, Unit } from '../types';
import { UI_STRINGS, UNITS } from '../constants';
import { translateRecipe, generateRecipeImage } from '../services/geminiService';
import { exportRecipeToPdf } from '../services/pdfService';

interface Props {
  recipe: Recipe;
  language: Language;
  onUpdate: (updated: Recipe) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const RecipeView: React.FC<Props> = ({ recipe, language, onUpdate, onEdit, onDelete }) => {
  const t = UI_STRINGS[language];
  const content = recipe[language];
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleTranslation = async () => {
      if (!content && !isTranslating) {
        setIsTranslating(true);
        const sourceLang = language === Language.HE ? Language.ES : Language.HE;
        const sourceContent = recipe[sourceLang];
        if (sourceContent) {
          try {
            const translated = await translateRecipe(sourceContent, language);
            if (translated && isMounted) {
              onUpdate({ ...recipe, [language]: translated });
            }
          } catch (err) {
            console.error("Translation effect failed:", err);
          }
        }
        if (isMounted) setIsTranslating(false);
      }
    };
    handleTranslation();
    return () => { isMounted = false; };
  }, [language, content, recipe, isTranslating, onUpdate]);

  const handleAiGen = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!content) return;
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

  if (isTranslating || !content) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-8 h-8 border-[1px] border-[#1C1C1C] border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-[#1C1C1C]/40 text-[10px] uppercase tracking-[0.3em] font-bold">{t.translateLoading}</p>
      </div>
    );
  }

  const groupedIngredients = (content.ingredients || []).reduce((acc: any, ing) => {
    const cat = ing.category || 'Général';
    acc[cat] = acc[cat] || [];
    acc[cat].push(ing);
    return acc;
  }, {});

  const groupedInstructions = (content.instructions || []).reduce((acc: any, step) => {
    const cat = step.category || 'Général';
    acc[cat] = acc[cat] || [];
    acc[cat].push(step);
    return acc;
  }, {});

  return (
    <div id={`recipe-${recipe.id}`} className="max-w-5xl mx-auto bg-white shadow-[0_40px_100px_rgba(0,0,0,0.05)] border-[0.5px] border-[#1C1C1C]/5 mb-16 overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 will-change-transform">
      
      {/* Editorial Header Image - Height reduced for PDF efficiency */}
      <div className="relative h-[400px] overflow-hidden group/header">
        {recipe.image ? (
          <img 
            src={recipe.image} 
            loading="lazy"
            className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-[2s] scale-105 hover:scale-100" 
            alt={content.title} 
          />
        ) : (
          <div className="w-full h-full bg-[#F5F5F0] flex flex-col items-center justify-center">
            <button 
              type="button"
              onClick={handleAiGen} 
              disabled={isGeneratingImg}
              className="text-[#1C1C1C]/30 text-[10px] uppercase tracking-[0.5em] font-bold border-b border-[#1C1C1C]/10 pb-2 hover:text-[#1C1C1C] transition-all"
            >
              {isGeneratingImg ? 'Création...' : 'Générer Visuel'}
            </button>
          </div>
        )}
        
        {/* Actions - Floating Bar */}
        <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 print:hidden">
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
        </div>

        <div className="absolute top-6 right-6 z-30 print:hidden">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportRecipeToPdf(`recipe-${recipe.id}`, content.title); }}
            className="bg-[#1C1C1C] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#8B7355] transition-all shadow-xl flex items-center gap-2 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.exportPdf}
          </button>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C]/70 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="absolute bottom-10 left-10 right-10 pointer-events-none">
          <span className="text-[9px] uppercase tracking-[0.5em] text-white/70 font-bold mb-2 block">Recette Signature</span>
          <h1 className="serif text-4xl md:text-6xl text-white font-light tracking-tight leading-none">{content.title}</h1>
          <div className="w-16 h-[1px] bg-white/40 mt-4"></div>
        </div>
      </div>

      <div className="p-8 md:p-12">
        {/* Intro Description */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          <p className="serif text-xl italic text-[#1C1C1C]/70 leading-relaxed font-light">
            "{content.description}"
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Ingredients Column */}
          <div className="lg:col-span-4 border-l-[0.5px] border-[#1C1C1C]/10 pl-6">
            <h2 className="serif text-lg uppercase tracking-widest text-[#8B7355] mb-6 font-bold italic">{t.ingredients}</h2>
            <div className="space-y-4">
              {Object.entries(groupedIngredients).map(([cat, ings]: [string, any]) => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-[9px] font-bold text-[#1C1C1C]/40 uppercase tracking-[0.3em] border-b border-[#1C1C1C]/5 pb-1">{cat}</h3>
                  <ul className="space-y-1">
                    {ings.map((ing: any) => (
                      <li key={ing.id} className="flex justify-between items-baseline group">
                        <span className="text-sm font-medium text-[#1C1C1C]">{ing.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[#1C1C1C]/40 italic ml-2">
                          {ing.amount} {getUnitLabel(ing.unit)}
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
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-[9px] font-bold text-[#1C1C1C]/40 uppercase tracking-[0.3em] whitespace-nowrap">{cat}</h3>
                    <div className="w-full h-[0.5px] bg-[#1C1C1C]/5"></div>
                  </div>
                  <div className="space-y-4">
                    {steps.map((step: any, idx: number) => (
                      <div key={step.id} className="relative group flex gap-4">
                        <span className="serif text-3xl text-[#F5F5F0] font-light leading-none select-none">
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
