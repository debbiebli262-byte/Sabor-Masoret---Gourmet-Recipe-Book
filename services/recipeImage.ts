// Firestore documents have a 1 MiB limit including all fields.
const MAX_IMAGE_BYTES=460000;
const bytes=(s:string)=>new TextEncoder().encode(s).length;
export async function compactRecipeImage(source:string):Promise<string>{
 if(!source||!source.startsWith('data:'))return source;
 if(/^data:image\/(jpeg|png|webp);base64,/i.test(source)&&bytes(source)<=MAX_IMAGE_BYTES)return source;
 if(!source.startsWith('data:image/'))throw new Error('פורמט תמונה לא נתמך');
 const image=new Image();
 await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('לא ניתן לקרוא את התמונה. נסי תמונת JPG או PNG.'));image.src=source});
 if(!image.naturalWidth||!image.naturalHeight)throw new Error('תמונה לא תקינה');
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('לא ניתן להקטין את התמונה');
 for(const max of [1600,1280,1024,800,640,480]){
  const ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [0.88,0.80,0.70,0.58]){
   const result=canvas.toDataURL('image/jpeg',quality);
   if(result.startsWith('data:image/jpeg;base64,')&&bytes(result)<=MAX_IMAGE_BYTES)return result;
  }
 }
 throw new Error('לא ניתן להקטין את התמונה מספיק. נסי תמונה אחרת.');
}
export function checkRecipeDocumentSize(data:unknown){
 // Leave room for Firestore field names, document path and serialization overhead.
 if(bytes(JSON.stringify(data))>900000)throw new Error('המתכון גדול מדי לשמירה. נסי להקטין את התמונה או להסיר טקסט מיותר.');
}
