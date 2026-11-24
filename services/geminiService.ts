import { auth } from '../firebase';
import { Language, RecipeContent } from '../types';
async function request(body:object){
 const user=auth.currentUser;
 if(!user)throw new Error('יש להתחבר עם Google');
 const response=await fetch('/api/recipe-ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'שגיאת ייבוא');
 return data;
}
export async function importRecipeFromUrl(url:string,language:Language|'auto',caption='',file?:{mimeType:string;data:string}):Promise<RecipeContent|null>{return (await request({action:'import',url,language,caption,file})).recipe}
export async function translateRecipe(content:RecipeContent,language:Language|'es'):Promise<RecipeContent|null>{return (await request({action:'translate',content,language})).recipe}
export async function generateRecipeImage(prompt:string):Promise<string|null>{try{return (await request({action:'image',prompt})).image}catch(e){alert(e instanceof Error?e.message:'יצירת תמונה נכשלה');return null}}
