import { Ingredient } from '../types';
export const normalizeIngredientHeading=(name?:string)=>!name||['כללי','General','Général'].includes(name.trim())?'כללי':name.trim();
export function ingredientGroups(items:Ingredient[]){
 const groups:{name:string;items:Ingredient[]}[]=[];
 for(const item of items){const name=normalizeIngredientHeading(item.category);const last=groups[groups.length-1];if(last&&last.name===name)last.items.push(item);else groups.push({name,items:[item]});}
 return groups;
}
