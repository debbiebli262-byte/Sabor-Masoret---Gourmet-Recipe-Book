import { Ingredient, Unit } from '../types';

const aliases: [RegExp, Unit][] = [
  [/^(?:kilogramos?|kilos?)(?=\s|$)/i,'kg'],
  [/^(?:gramos?|gr\.?)(?=\s|$)/i,'gram'],
  [/^(?:mililitros?)(?=\s|$)/i,'ml'],
  [/^(?:litros?)(?=\s|$)/i,'liters'],
  [/^(?:cucharadas?|cdas?\.?)(?=\s|$)/i,'tbsp'],
  [/^(?:cucharaditas?|cdtas?\.?)(?=\s|$)/i,'tsp'],
  [/^(?:tazas?)(?=\s|$)/i,'cup'],
  [/^(?:unidades?|unidad)(?=\s|$)/i,'units'],
  [/^(?:pizcas?)(?=\s|$)/i,'pinch'],
  [/^(?:chorritos?)(?=\s|$)/i,'drizzle'],
  [/^(?:קילוגרמים?|ק["״']?ג|kg)(?=\s|$)/i,'kg'],
  [/^(?:גרמים?|גרם|גר[׳']?|ג[׳']|grams?|g)(?=\s|$)/i,'gram'],
  [/^(?:מיליליטרים?|מ["״']?ל|ml)(?=\s|$)/i,'ml'],
  [/^(?:ליטרים?|liters?|litres?|l)(?=\s|$)/i,'liters'],
  [/^(?:כפות|כף|tbsp|tablespoons?)(?=\s|$)/i,'tbsp'],
  [/^(?:כפיות|כפית|tsp|teaspoons?)(?=\s|$)/i,'tsp'],
  [/^(?:כוסות|כוס|cups?)(?=\s|$)/i,'cup'],
  [/^(?:יחידות|יחידה|יח[׳']?|units?)(?=\s|$)/i,'units'],
  [/^(?:קורט|pinch)(?=\s|$)/i,'pinch'],
  [/^(?:זילוף|drizzle)(?=\s|$)/i,'drizzle']
];
const fractions: Record<string,string> = {'½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8'};
const quantity = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)';
function amountOf(s:string) {
  return s.trim().split(/\s+/).reduce((sum,v)=>{const [a,b]=v.replace(',','.').split('/').map(Number);return sum+(b===undefined?a:a/b)},0);
}
function parseMeasure(text:string): {amount:number;unit:Unit;rest:string}|null {
  const m=text.match(new RegExp('^('+quantity+')\\s*'));
  const words=text.match(/^(חצי|רבע|שליש|שני שלישים|שלושת רבעי)\s+/);
  const implicit=!m&&!words&&aliases.find(([rx])=>rx.test(text));
  if(!m&&!words&&!implicit)return null;
  const amount=m?amountOf(m[1]):words?({'חצי':.5,'רבע':.25,'שליש':1/3,'שני שלישים':2/3,'שלושת רבעי':.75}[words[1]]!):1;
  let rest=text.slice(m?.[0].length||words?.[0].length||0).trim();
  let unit:Unit='units';
  const match=aliases.find(([rx])=>rx.test(rest));
  if(match){unit=match[1];rest=rest.replace(match[0],'').trim().replace(/^de\s+/i,'');}
  if(!Number.isFinite(amount)||amount<=0)return null;
  return {amount,unit,rest};
}
export function parseIngredientList(input:string):{ingredients:Ingredient[];unparsed:string[]} {
  const ingredients:Ingredient[]=[];const unparsed:string[]=[];
  for(const original of input.split(/\r?\n/)){
    let line=original.trim().replace(/^[•●▪\-–*]\s*/,'').replace(/^\d+[.)]\s+/,'');
    if(!line)continue;
    line=line.replace(/[½¼¾⅓⅔⅛]/g,(c,offset)=>((offset>0&&/\d/.test(line[offset-1]))?' ':'')+fractions[c]).replace(/(\d)\s*(?=[א-תa-z])/gi,'$1 ');
    let measure=parseMeasure(line);let name=measure?.rest||'';
    if(!measure||!name){
      const end=line.match(new RegExp('^(.*?)\\s*[:–—-]?\\s+('+quantity+'\\s*.*)$'));
      if(end){const candidate=parseMeasure(end[2]);if(candidate&&!candidate.rest){measure=candidate;name=end[1].replace(/[:–—-]\s*$/,'').trim();}}
    }
    if(!measure||!name||/^\d/.test(name)||/^(?:[-–—]|עד\s+\d)/.test(name)){unparsed.push(original);continue;}
    let {amount,unit}=measure;
    if(unit==='gram' && amount>=1000){amount/=1000;unit='kg';}
    if(unit==='liters'){amount*=1000;unit='ml';}
    ingredients.push({id:crypto.randomUUID(),name,amount,unit,category:'כללי'});
  }
  return {ingredients,unparsed};
}
