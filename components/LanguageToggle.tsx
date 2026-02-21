
import React from 'react';
import { Language } from '../types';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
}

const LanguageToggle: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div className="flex items-center border-[0.5px] border-[#1C1C1C]/10 rounded-none overflow-hidden">
      <button
        onClick={() => onChange(Language.HE)}
        className={`px-6 py-2 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest ${
          current === Language.HE 
            ? 'bg-[#1C1C1C] text-white' 
            : 'text-[#1C1C1C]/40 hover:text-[#1C1C1C] bg-white'
        }`}
      >
        HE
      </button>
      <div className="w-[0.5px] h-4 bg-[#1C1C1C]/10"></div>
      <button
        onClick={() => onChange(Language.ES)}
        className={`px-6 py-2 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest ${
          current === Language.ES 
            ? 'bg-[#1C1C1C] text-white' 
            : 'text-[#1C1C1C]/40 hover:text-[#1C1C1C] bg-white'
        }`}
      >
        ES
      </button>
    </div>
  );
};

export default LanguageToggle;
