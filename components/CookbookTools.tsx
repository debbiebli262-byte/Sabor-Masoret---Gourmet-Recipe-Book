import React,{useState,useEffect} from 'react';
import {Recipe,Category,Language} from '../types';
import {UNITS} from '../constants';
import {printCookbook} from '../services/printCookbook';
function read<T,>(key:string,fallback:T):T {try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
export default function CookbookTools({recipes,categories}:{recipes:Recipe[],categories:Category[]}){
 const [open,setOpen]=useState(false);
 const [plan,setPlan]=useState<Record<string,string>>(()=>read('sabor-plan',{}));
 const [favorites,setFavorites]=useState<string[]>(()=>read('sabor-favorites',[]));
 const [chosen,setChosen]=useState<string[]>([]);
 const [paper,setPaper]=useState<'A4'|'A5'>('A4');
 const [photos,setPhotos]=useState(true);
 useEffect(()=>{try{localStorage.setItem('sabor-plan',JSON.stringify(plan));localStorage.setItem('sabor-favorites',JSON.stringify(favorites))}catch{}},[plan,favorites]);
 const shopping=new Map<string,{name:string,amount:number,unit:string,category:string}>();
 Object.values(plan).forEach(id=>recipes.find(r=>r.id===id)?.he?.ingredients?.forEach(i=>{const unit=i.unit==='kg'?'gram':i.unit==='liters'?'ml':i.unit;const amount=i.amount*(i.unit==='kg'||i.unit==='liters'?1000:1);const key=i.name.trim().toLowerCase()+'|'+unit;const prev=shopping.get(key);shopping.set(key,{name:i.name,unit,amount:(prev?.amount||0)+amount,category:i.category||'כללי'})}));
 const backup=()=>{const blob=new Blob([JSON.stringify({recipes,categories},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='sabor-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const selected=recipes.filter(r=>chosen.includes(r.id));
 return <section className="max-w-7xl mx-auto mb-8 bg-white border border-[#8B7355]/30 p-4"><button className="font-bold" onClick={()=>setOpen(!open)} aria-expanded={open}>כלי הספר · תפריט שבועי · מועדפים · הדפסה {open?'−':'+'}</button>{open&&<div className="space-y-5 mt-4">
 <p className="text-sm">התפריט והמועדפים נשמרים במכשיר הזה בלבד.</p>
 <h2 className="serif text-2xl">תפריט שבועי</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'].map(day=><div key={day} className="bg-[#F5F5F0] p-3"><b>{day}</b>{['צהריים','ערב'].map(meal=><label key={meal} className="block mt-2">{meal}<select className="block w-full p-2" value={plan[day+meal]||''} onChange={e=>setPlan({...plan,[day+meal]:e.target.value})}><option value="">בחרי מתכון</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.he?.title}</option>)}</select></label>)}</div>)}</div>
 <h2 className="serif text-2xl">רשימת קניות</h2><p className="text-xs">מחברת כמויות של מצרכים בעלי אותו שם ויחידה, לפי מנה מקורית אחת מכל מתכון.</p><ul>{[...shopping.values()].sort((a,b)=>a.category.localeCompare(b.category,'he')).map((i,k)=><li key={k}><label><input type="checkbox"/> {i.category} · {i.name} — {Math.round(i.amount*100)/100} {UNITS[i.unit]?.[Language.HE]||i.unit}</label></li>)}</ul>
 <h2 className="serif text-2xl">בחירת מתכונים להדפסה ומועדפים</h2><div className="flex flex-wrap gap-2"><button onClick={()=>setChosen(recipes.map(r=>r.id))}>בחרי הכל</button><button onClick={()=>setChosen([])}>נקה בחירה</button>{categories.map(c=><button key={c.id} onClick={()=>setChosen(recipes.filter(r=>r.categoryId===c.id).map(r=>r.id))}>{c.he}</button>)}</div><div className="max-h-64 overflow-auto">{recipes.map(r=><div key={r.id} className="flex gap-3 p-1"><label><input type="checkbox" checked={chosen.includes(r.id)} onChange={e=>setChosen(e.target.checked?[...chosen,r.id]:chosen.filter(id=>id!==r.id))}/> {r.he?.title}</label><button aria-label="מועדף" onClick={()=>setFavorites(favorites.includes(r.id)?favorites.filter(id=>id!==r.id):[...favorites,r.id])}>{favorites.includes(r.id)?'♥':'♡'}</button></div>)}</div>
 <p>מועדפים: {recipes.filter(r=>favorites.includes(r.id)).map(r=>r.he?.title).join(' · ')||'אין עדיין'}</p>
 <label>נייר <select value={paper} onChange={e=>setPaper(e.target.value as 'A4'|'A5')}><option>A4</option><option>A5</option></select></label> <label><input type="checkbox" checked={photos} onChange={e=>setPhotos(e.target.checked)}/> תמונות</label>
 <div className="flex gap-3 flex-wrap"><button disabled={!selected.length} onClick={()=>printCookbook(selected,categories,true,1,{paper,photos})}>הדפסת מבחר</button><button onClick={backup}>ייצוא גיבוי JSON</button></div>
 </div>}</section>
}
