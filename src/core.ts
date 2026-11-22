import {entry,bank} from './bank.ts'
import type {Data,Word,Attempt,Progress,Settings,Question,Direction,Format,Session,Grade,Deck} from './types.ts'
export const defaults:Settings={from:1,to:2300,size:10,fresh:5,intervals:[1,3,7,14,30],direction:'en'}
export function empty():Data {return {version:1,deck:'personal',words:{personal:[],sample:[]},settings:structuredClone(defaults),history:[]}}
export function localDay(date=new Date()) {return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')}
export function plusDays(day:string,days:number) {const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export const key=(deck:Deck,no:number,dir:Direction)=>[deck,no,dir].join('/')
export const norm=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')
export function shuffle<T>(values:readonly T[],rng=Math.random):T[] {
 const result=[...values]
 for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result
}
export function progress(history:Attempt[]) {
 const out=new Map<string,Progress>()
 for(const a of history){
  const k=key(a.deck,a.no,a.dir),p=out.get(k),correct=a.grade==='good',first=p?.day!==a.day
  const row:Progress=p??{day:'',due:'',stage:-1,weak:false,tries:0,independent:0,delayed:0,recovered:0,dayMiss:false,dayRecovered:false}
  if(first){row.dayMiss=false;row.dayRecovered=false}
  if(correct && first){
   row.independent++
   if(p)row.delayed++
   if(!p || a.day>=row.due){
    row.stage=Math.min(row.stage+1,a.intervals.length-1)
    row.due=plusDays(a.day,a.intervals[row.stage])
    row.weak=false
   }
  }else if(!correct){
   row.stage=-1;row.weak=true;row.due=plusDays(a.day,1);row.dayMiss=true
  }else if(row.dayMiss && !row.dayRecovered){row.recovered++;row.dayRecovered=true}
  row.tries++;row.day=a.day;out.set(k,row)
 }
 return out
}
export function reviewPlan(words:Word[],stats:Map<string,Progress>,deck:Deck,settings:Settings,day:string,rng=Math.random){
 const s=(w:Word)=>stats.get(key(deck,w.no,settings.direction))
 const due=shuffle(words.filter(w=>s(w) && s(w)!.due<=day),rng).sort((a,b)=>Number(s(b)!.weak)-Number(s(a)!.weak)||s(a)!.due.localeCompare(s(b)!.due))
 const fresh=shuffle(words.filter(w=>!s(w)),rng).slice(0,settings.fresh)
 return {due:due.length,words:due.concat(fresh).slice(0,settings.size)}
}
export function question(w:Word,fmt:Format,dir:Direction,pool:Word[],rng=Math.random):Question {
 const e=entry(w)
 const card=(d:Direction):Question=>({no:w.no,dir:d,kind:'card',prompt:d==='en'?w.en:w.ja,cue:d==='en'?'日本語の意味を思い出す':'登録した英語の見出し語を思い出す',answers:[d==='en'?w.ja:w.en],options:[]})
 if(fmt==='card')return card(dir)
 if(!e)return card(fmt==='choice'?'en':'ja')
 if(fmt==='choice'){
  const eligible=new Set(pool.map(v=>entry(v)?.en))
  const wrong=e.wrong.filter(v=>eligible.has(v)).map(v=>bank.get(v)!.sense)
  if(new Set(wrong).size<3)return card('en')
  return {no:w.no,dir:'en',kind:fmt,prompt:e.en,cue:e.sentence.replace('___',e.form),answers:[e.sense],options:shuffle([e.sense,...wrong.slice(0,3)],rng)}
 }
 const cloze=fmt==='cloze',answer=cloze?e.form:e.en
 return {no:w.no,dir:'ja',kind:fmt,prompt:cloze?e.sentence:e.sense,cue:(cloze?e.sense+' ／ '+e.grammar:'見出し語の形 ／ '+e.pos)+' ／ '+answer[0]+' で始まる '+answer.length+' 文字',answers:[answer],options:[]}
}
export function draw(pool:Word[],size:number,fmt:Format,dir:Direction,rng=Math.random){
 const eligible=fmt==='cloze'?pool.filter(w=>entry(w)):pool
 return shuffle(eligible,rng).slice(0,size).map(w=>question(w,fmt,dir,pool,rng))
}
export function gradeInput(q:Question,value:string,hinted:boolean):Grade {return q.answers.some(a=>norm(a)===norm(value))?(hinted?'hint':'good'):'miss'}
export function addRetry(s:Session,q:Question,grade:Grade) {
 if(s.mode==='test'||q.retry||grade==='good')return
 s.queue.splice(Math.min(s.index+3,s.queue.length),0,{...q,retry:true})
}
export function log(data:Data,s:Session,index:number,grade:Grade,day:string){
 const id=s.id+'/'+index
 if(data.history.some(a=>a.id===id))return
 const q=s.queue[index]
 data.history.push({id,deck:s.deck,no:q.no,dir:q.dir,day,grade,intervals:[...data.settings.intervals]})
}
