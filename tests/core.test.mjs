import {test} from 'node:test'
import assert from 'node:assert/strict'
import {samples} from '../src/bank.ts'
import {empty,localDay,plusDays,draw,gradeInput,question,progress,reviewPlan,key,log} from '../src/core.ts'
import {tsv,preview,mergeWords} from '../src/importer.ts'
import {validData} from '../src/storage.ts'
import {answer,advance,mark} from '../src/study.ts'
const rng=()=>0.37,day='2026-11-22',next=plusDays(day,1),no=1
const get=(h,dir='en')=>progress(h).get(key('sample',no,dir))
function fixture(){const d=empty();d.deck='sample';d.words.sample=structuredClone(samples);return d}
function attempt(grade,date=day,dir='en',id=crypto.randomUUID()){return {id,deck:'sample',no,dir,day:date,grade,intervals:[1,3,7,14,30]}}
function session(mode,queue){return {id:'session',deck:'sample',mode,queue,index:0,answers:[],revealed:false,hinted:false,phase:'ask',markIndex:0}}
test('local calendar and month boundaries',()=>{assert.equal(localDay(new Date(2024,1,29,23,59)),'2024-02-29');assert.equal(plusDays('2024-02-29',1),'2024-03-01');assert.equal(plusDays('2026-12-31',1),'2027-01-01')})
test('schedule advances once per due day; directions independent',()=>{
 const h=[attempt('good'),attempt('good'),attempt('miss',day,'ja')]
 assert.equal(get(h).stage,0);assert.equal(get(h).due,next);assert.equal(get(h).independent,1);assert.equal(get(h,'ja').weak,true)
 h.push(attempt('good',next));assert.equal(get(h).due,'2026-11-26');assert.equal(get(h).delayed,1)
 h.push(attempt('good','2026-11-24'));assert.equal(get(h).due,'2026-11-26')
})
test('misses and hints keep tomorrow even after a successful retry',()=>{
 for(const grade of ['miss','partial','hint']){const p=get([attempt(grade),attempt('good'),attempt('good')]);assert.equal(p.stage,-1);assert.equal(p.due,next);assert.equal(p.recovered,1);assert.equal(p.delayed,0);assert.equal(p.weak,true)}
})
test('due before new words including cap and empty scope',()=>{
 const d=fixture(),p=progress([attempt('miss')]);d.settings.fresh=2
 assert.equal(reviewPlan(samples,p,'sample',d.settings,day,rng).due,0)
 const plan=reviewPlan(samples,p,'sample',d.settings,next,rng);assert.equal(plan.words[0].no,1);assert.equal(plan.words.length,3)
 d.settings.fresh=0;assert.equal(reviewPlan(samples,p,'sample',d.settings,next,rng).words.length,1)
 assert.deepEqual(reviewPlan([],p,'sample',d.settings,next,rng).words,[])
})
for(const n of [0,1,3,16])test('bounded draw for '+n+' words',()=>{
 for(const mode of ['choice','type','cloze','card']){const pool=samples.slice(0,n),qs=draw(pool,99,mode,'ja',rng);assert.equal(qs.length,n);assert.equal(new Set(qs.map(q=>q.no)).size,n)
 for(const q of qs){assert.ok(pool.some(w=>w.no===q.no));assert.equal(q.options.length,new Set(q.options).size);if(n<4&&mode==='choice')assert.equal(q.kind,'card')}}
})
test('choices use curated meanings; synonyms and distractor deficits',()=>{
 const w=samples.find(v=>v.en==='feasible'),q=question(w,'choice','ja',samples,rng);assert.equal(q.kind,'choice');assert.ok(!q.options.some(x=>/見込み/.test(x)))
 assert.equal(question(w,'choice','ja',[w],rng).kind,'card')
 assert.equal(question({no:2,en:'wheel',ja:'全く異なる意味'},'type','ja',samples).kind,'card')
 assert.deepEqual(draw([{no:3,en:'xyz',ja:'例'}],10,'cloze','ja'),[])
})
test('explicit inflection, normalization, hints and alternatives',()=>{
 const q=question(samples.find(w=>w.en==='lend'),'cloze','ja',samples,rng)
 assert.equal(gradeInput(q,' LENT ',false),'good');assert.equal(gradeInput(q,'lend',false),'miss');assert.equal(gradeInput(q,'lent',true),'hint')
 assert.equal(gradeInput({...q,answers:['colour','color']},' COLOR ',false),'good')
})
test('cards reveal only; atomic answers and bounded spaced retry',()=>{
 const d=fixture(),s=session('review',draw(samples,4,'card','en',rng))
 answer(d,s,'','good',day);assert.equal(d.history.length,0);s.revealed=true;answer(d,s,'','miss',day);answer(d,s,'','miss',day)
 assert.equal(d.history.length,1);assert.equal(s.queue.length,5);assert.equal(s.queue[3].no,s.queue[0].no);assert.ok(s.queue[3].retry)
 while(s.phase!=='done'){if(s.phase==='feedback')advance(d,s);else{s.revealed=true;answer(d,s,'',s.queue[s.index].retry?'miss':'good',day)}}
 assert.equal(d.history.length,5);log(d,s,0,'miss',day);assert.equal(d.history.length,5)
})
test('blind test self-assessment only after submission; no retries or premature history',()=>{
 const d=fixture(),s=session('test',draw(samples,2,'card','ja',rng))
 answer(d,s,'abc',null,day);advance(d,s);answer(d,s,'def',null,day);advance(d,s)
 assert.equal(s.phase,'mark');assert.equal(d.history.length,0);mark(d,s,'miss');mark(d,s,'good');assert.equal(s.phase,'done');assert.equal(d.history.length,2)
})
test('TSV preserves glosses including quotes, newlines, circled numbers',()=>{
 const gloss='[名] ①例（A）\n[動] ②"試す"'
 const row=tsv('No\t単語\t意味\r\n301\tsample\t"'+gloss.replaceAll('"','""')+'"');const p=preview(row,[]);assert.deepEqual(p.errors,[]);assert.equal(p.words[0].ja,gloss)
 assert.throws(()=>tsv('1\ttest\t"bad'))
 const again=preview(row,p.words);assert.equal(again.unchanged,1);assert.equal(mergeWords(p.words,again.words).length,1)
})
test('all 2300 synthetic rows, re-import, conflict, invalid numbers and missing columns',()=>{
 const rows=Array.from({length:2300},(_,i)=>[String(i+1),'word'+i,'語義①（例）']);const p=preview(rows,[]);assert.equal(p.words.length,2300);assert.equal(p.errors.length,0)
 assert.equal(preview(rows,p.words).unchanged,2300)
 const bad=preview([['1','changed','違う'],['2301','x','意味'],['9','x'],['０','x','意味']],p.words);assert.equal(bad.errors.length,4);assert.match(bad.errors[0],/No. 1/)
})
test('backup rejects broken relationships, dates, settings, duplicate history and word IDs',()=>{
 const d=fixture();d.history.push(attempt('good'));assert.equal(validData(d),true)
 for(const change of [x=>x.history[0].no=2000,x=>x.words.sample.push(samples[0]),x=>x.history.push(x.history[0]),x=>x.history[0].day='2026-02-31',x=>x.settings.intervals=[3,1],x=>x.history[0].dir='both',x=>x.version=4]){const copy=structuredClone(d);change(copy);assert.equal(validData(copy),false)}
})
