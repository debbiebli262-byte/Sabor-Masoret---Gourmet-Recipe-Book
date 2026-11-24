import React,{useState,useEffect} from 'react';
import {Recipe,Language} from '../types';
import {UNITS} from '../constants';
const days=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
export default function FamilyPlanner({recipes,onClose}:{recipes:Recipe[];onClose:()=>void}){
 const [plan,setPlan]=useState<Record<string,string>>(()=>{try{return JSON.parse(localStorage.getItem('sabor-plan-v1')||'{}')||{}}catch{return {}}});
 useEffect(()=>{try{localStorage.setItem('sabor-plan-v1',JSON.stringify(plan))}catch{}},[plan]);
 const totals=new Map<string,{name:string;unit:string;amount:number}>();
 for(const id of Object.values(plan)){const r=recipes.find(r=>r.id===id);for(const i of r?.he.ingredients||[]){const k=i.name.trim().toLowerCase()+'|'+i.unit;const old=totals.get(k);totals.set(k,{name:i.name,unit:i.unit,amount:(old?.amount||0)+i.amount})}}
 const [checked,setChecked]=useState<string[]>([]);
 return <section className="max-w-5xl mx-auto bg-white border border-[#D7C8A9] p-5 md:p-8 mb-8"><div className="flex justify-between"><h2 className="serif text-3xl text-[#333A31]">התפריט המשפחתי</h2><button onClick={onClose}>סגירה</button></div><p className="text-sm my-3">התכנון נשמר בדפדפן הזה בלבד. כל בחירה מייצגת מתכון בכמות המקורית.</p><div className="grid gap-3">{days.map((day,d)=><div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b pb-3" key={day}><strong>{day}</strong>{['צהריים','ערב'].map((meal,m)=><label key={meal} className="text-sm">{meal}<select className="block w-full bg-[#F5F5F0] p-2" value={plan[d+'-'+m]||''} onChange={e=>{setPlan(p=>({...p,[d+'-'+m]:e.target.value}));setChecked([])}}><option value="">בחרי מתכון</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.he.title}</option>)}</select></label>)}</div>)}</div><h3 className="serif text-2xl mt-6">רשימת קניות</h3><p className="text-xs my-2">כמויות מאוחדות לפי שם ויחידה זהים.</p>{[...totals].map(([k,i])=><label className="flex gap-3 py-2 border-b" key={k}><input type="checkbox" checked={checked.includes(k)} onChange={e=>setChecked(p=>e.target.checked?[...p,k]:p.filter(x=>x!==k))}/><span className={checked.includes(k)?'line-through':''}>{i.name} — {Math.round(i.amount*100)/100} {UNITS[i.unit]?.[Language.HE]||i.unit}</span></label>)}<button className="border p-2 mt-4" onClick={()=>{if(confirm('לנקות את התפריט?')){setPlan({});setChecked([])}}}>ניקוי תפריט</button></section>
}
