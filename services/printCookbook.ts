import { Recipe, Category, Language } from '../types';
import { UNITS } from '../constants';

export function printCookbook(recipes: Recipe[], categories: Category[], book = true, scale = 1, options: {paper?: 'A4'|'A5', photos?: boolean} = {}) {
  const w = window.open('', '_blank');
  if (!w) { alert('יש לאפשר פתיחת חלונות קופצים לצורך הדפסה'); return; }
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const cat = (r: Recipe) => categories.find(c => c.id === r.categoryId)?.he || 'ללא קטגוריה';
  const ordered = recipes.filter(r => r.he).slice().sort((a,b) => cat(a).localeCompare(cat(b),'he') || a.he.title.localeCompare(b.he.title,'he'));
  const groups = [...new Set(ordered.map(cat))];
  const toc = groups.map(g => '<h3>'+esc(g)+'</h3><ul>'+ordered.map((r,i)=>cat(r)===g?'<li><a href="#recipe-'+i+'">'+esc(r.he.title)+'</a></li>':'').join('')+'</ul>').join('');
  const pages = ordered.map((r,i) => {
    const c = r.he;
    const image = options.photos !== false && r.image && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(r.image) ? '<img src="'+esc(r.image)+'" alt="">' : '';
    return '<article id="recipe-'+i+'"><small>'+esc(cat(r))+'</small><h1>'+esc(c.title)+'</h1>'+image+'<p>'+esc(c.description)+'</p><h2>מצרכים</h2><ul>'+c.ingredients.map(x=>'<li>'+esc(Math.round(x.amount*scale*100)/100)+' '+esc(UNITS[x.unit]?.[Language.HE] || x.unit)+' — '+esc(x.name)+' <small>'+esc(x.category)+'</small></li>').join('')+'</ul><h2>אופן ההכנה</h2><ol>'+c.instructions.map(x=>'<li>'+esc(x.text)+'</li>').join('')+'</ol>'+(c.ovenInstructions?'<h2>הוראות תנור</h2><p>'+esc(c.ovenInstructions)+'</p>':'')+(c.notes?'<h2>הערות</h2><p>'+esc(c.notes)+'</p>':'')+'</article>';
  }).join('');
  w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>'+esc(book?'Sabor & Masoret':ordered[0]?.he.title)+'</title><style>@page{size:'+ (options.paper === 'A5' ? 'A5' : 'A4') +';margin:15mm}body{font:15px Arial,sans-serif;color:#24211e;line-height:1.6;max-width:180mm;margin:auto}h1,h2,h3{color:#806547}h1{font-size:30px}h2{border-bottom:1px solid #d9cbb9;font-size:19px;break-after:avoid}li{break-inside:avoid;margin:5px 0}p{white-space:pre-wrap}img{max-width:100%;max-height:75mm;object-fit:contain;display:block;margin:auto}article,.toc{break-before:page}article:first-child{break-before:auto}.cover{min-height:150mm;display:flex;flex-direction:column;justify-content:center;text-align:center;border:2px solid #806547}.cover h1{font-family:Georgia,serif;font-size:42px}a{color:inherit;text-decoration:none}small{color:#806547}@media screen{body{padding:20px}article{border-top:1px solid #ddd;margin-top:30px}}</style></head><body>'+(book?'<section class="cover"><h1>SABOR &amp; MASORET</h1><h2>ספר המתכונים שלי</h2><p>L’Art de la Cuisine</p></section><section class="toc"><h1>תוכן עניינים</h1>'+toc+'</section>':'')+pages+'</body></html>');
  w.document.close();
  const ready = Array.from(w.document.images).map(img => img.decode().catch(()=>{}));
  Promise.race([Promise.all(ready),new Promise(resolve=>setTimeout(resolve,5000))]).then(()=>{if(!w.closed){w.focus();w.print();}});
}
