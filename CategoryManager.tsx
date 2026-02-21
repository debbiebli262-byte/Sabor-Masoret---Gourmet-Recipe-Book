import React, { useState } from 'react';
import { Category, Language } from '../types';
import { UI_STRINGS } from '../constants';

interface Props {
  categories: Category[];
  language: Language;
  onAdd: (cat: Omit<Category, 'id'>) => void;
  onUpdate: (cat: Category) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CategoryManager: React.FC<Props> = ({ categories, language, onAdd, onUpdate, onDelete, onClose }) => {
  const t = UI_STRINGS[language];
  const [newCatHe, setNewCatHe] = useState('');
  const [newCatEs, setNewCatEs] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (newCatHe.trim() && newCatEs.trim()) {
      onAdd({ [Language.HE]: newCatHe, [Language.ES]: newCatEs });
      setNewCatHe('');
      setNewCatEs('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1C1C1C]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-[#1C1C1C]/5 flex justify-between items-center">
          <h2 className="serif text-2xl uppercase tracking-widest">{t.manageCategories}</h2>
          <button onClick={onClose} className="text-[#1C1C1C]/40 hover:text-[#1C1C1C]">✕</button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Add New */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F5F5F0] p-6">
            <input 
              className="bg-white p-3 text-xs outline-none" 
              placeholder={t.categoryNameHe} 
              value={newCatHe} 
              onChange={e => setNewCatHe(e.target.value)} 
            />
            <input 
              className="bg-white p-3 text-xs outline-none" 
              placeholder={t.categoryNameEs} 
              value={newCatEs} 
              onChange={e => setNewCatEs(e.target.value)} 
            />
            <button 
              onClick={handleAdd}
              className="md:col-span-2 bg-[#1C1C1C] text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#8B7355] transition-all"
            >
              + {language === Language.HE ? 'הוסף קטגוריה' : 'Añadir Categoría'}
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="group border-[0.5px] border-[#1C1C1C]/10 p-4 flex justify-between items-center hover:bg-[#F5F5F0] transition-colors">
                {editingId === cat.id ? (
                  <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                    <input 
                      className="p-2 text-xs border border-[#1C1C1C]/10" 
                      value={cat[Language.HE]} 
                      onChange={e => onUpdate({ ...cat, [Language.HE]: e.target.value })} 
                    />
                    <input 
                      className="p-2 text-xs border border-[#1C1C1C]/10" 
                      value={cat[Language.ES]} 
                      onChange={e => onUpdate({ ...cat, [Language.ES]: e.target.value })} 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#1C1C1C]">{cat[Language.HE]}</span>
                    <span className="text-[10px] italic text-[#1C1C1C]/40">{cat[Language.ES]}</span>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setEditingId(editingId === cat.id ? null : cat.id)}
                    className="text-[#1C1C1C]/30 hover:text-[#8B7355] text-[10px] font-bold uppercase tracking-widest"
                  >
                    {editingId === cat.id ? 'OK' : (language === Language.HE ? 'ערוך' : 'Editar')}
                  </button>
                  <button 
                    onClick={() => onDelete(cat.id)}
                    className="text-red-300 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-[#1C1C1C]/5 bg-[#F5F5F0]">
           <button onClick={onClose} className="w-full text-[10px] font-bold uppercase tracking-[0.4em] text-[#1C1C1C]/40 hover:text-[#1C1C1C]">{t.cancel}</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
