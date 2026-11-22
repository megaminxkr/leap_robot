import './style.css'
import {samples} from './bank.ts'
import {localDay,draw,question,progress,reviewPlan} from './core.ts'
import {htmlRows,tsv,preview,mergeWords} from './importer.ts'
import type {Preview} from './importer.ts'
import {openStore,readStore,commit,validData,validIntervals,prepareAnswer,clearJournal} from './storage.ts'
import * as v from './views.ts'
import {answer,advance,mark,study} from './study.ts'
import {btn,esc} from './ui.ts'
import type {Data,Snapshot,Grade,Mode,Question,Format,Direction} from './types.ts'
const root=document.querySelector<HTMLElement>('#app')!,notice=document.querySelector<HTMLElement>('#notice')!
let snap:Snapshot,busy=false,ready=false,page:v.Page='home',raw='',parsed:Preview|null=null,backup:Data|null=null
const f:v.Filter={search:'',weak:false,hide:false,shown:new Set(),page:0}
const setup:v.Setup={fmt:'card',mode:'practice',dir:'en',size:10,filtered:false}
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const value=(id:string)=>element<HTMLInputElement>(id).value
const num=(id:string)=>Number(value(id))
let msgTimer=0
function say(msg:string){clearTimeout(msgTimer);notice.textContent=msg;msgTimer=window.setTimeout(()=>notice.textContent='',5500)}
function go(p:v.Page){if(location.hash==='#'+p)render();else location.hash=p}
function pool(){return setup.filtered?v.filtered(snap.data,f):v.words(snap.data)}
function render(){
 if(!ready)return
 const d=snap.data,token=location.hash.slice(1)
 page=(['home','book','practice','records','settings','import','study'].includes(token)?token:'home') as v.Page
 if(page==='study'&&!snap.session)page='home'
 const active=!!snap.session&&snap.session.phase!=='done'
 const body=page==='home'?v.home(d,active):page==='book'?v.book(d,f):page==='practice'?v.practice(d,setup,pool(),active):page==='records'?v.records(d):page==='settings'?v.settings(d):page==='import'?v.importer(parsed,raw):study(snap.session!)
 const exit=page==='study'&&active?'<div class="session-exit">'+btn('今回の学習を終了','end','text')+'</div>':''
 root.innerHTML=v.header(page)+'<main id="main">'+body+exit+'</main><footer><b>単語手帖</b><span>改訂版 LEAP 学習帳</span></footer>'
 if(page==='settings'&&backup)element('restore-preview').innerHTML=`<p>個人 ${backup.words.personal.length} 語・サンプル ${backup.words.sample.length} 語・回答 ${backup.history.length} 回。現在のデータをこの内容に置き換えます。</p>${btn('この内容で復元する','restoreok')} ${btn('キャンセル','cancelrestore','text')}`
}
async function save(change:(next:Snapshot)=>void,after?:()=>void){
 if(busy)return
 busy=true;root.inert=true;root.setAttribute('aria-busy','true')
 try{
  const next=structuredClone(snap);change(next)
  const journal=page==='study' && next.session && next.session.id===snap.session?.id
  if(journal)prepareAnswer(snap.revision,next.session!,next.data.history.slice(snap.data.history.length))
  await commit(next);snap=next;if(journal)clearJournal();render();after?.()
 }
 catch(e){try{snap=await readStore();clearJournal();render()}catch{}say(e instanceof Error?e.message:'保存できませんでした。')}
 finally{busy=false;root.inert=false;root.removeAttribute('aria-busy')}
}
function buildSession(d:Data,mode:Mode,queue:Question[]){return {id:crypto.randomUUID(),deck:d.deck,mode,queue,index:0,answers:[],revealed:false,hinted:false,phase:'ask' as const,markIndex:0}}
function launch(mode:Mode,queue:Question[]){
 if(snap.session&&snap.session.phase!=='done'){go('study');return}
 if(!queue.length){say('対象となる単語がありません。');return}
 void save(n=>{n.session=buildSession(n.data,mode,queue)},()=>go('study'))
}
async function act(action:string,el?:HTMLElement){
 if(busy||!ready)return
 const d=snap.data,s=snap.session
 if(['home','book','settings','records','import'].includes(action)){go(action as v.Page);return}
 if(action==='resume'){go('study');return}
 if(action==='sample'||action==='personal'){
  if(s&&s.phase!=='done'&&s.deck!==(action==='sample'?'sample':'personal')){say('学習を終了してから単語帳を切り替えてください。');return}
  await save(n=>{if(action==='sample'&&!n.data.words.sample.length)n.data.words.sample=structuredClone(samples);n.data.deck=action==='sample'?'sample':'personal';n.data.settings.from=1;n.data.settings.to=2300},()=>go('home'));return
 }
 if(action==='preview'){try{parsed=preview(tsv(raw),d.words.personal)}catch(e){parsed=null;say(String(e))}render();return}
 if(action==='saveimport'&&parsed?.words.length&&!parsed.errors.length){
  if(s&&s.phase!=='done'&&s.deck==='sample'){say('サンプルの学習を終了してから保存してください。');return}
  const check=preview(parsed.words.map(w=>[String(w.no),w.en,w.ja]),d.words.personal)
  if(check.errors.length){parsed=check;render();return}
  const list=check.words
  await save(n=>{n.data.words.personal=mergeWords(n.data.words.personal,list);n.data.deck='personal'},()=>{parsed=null;raw='';go('home');say('単語を保存しました。')});return
 }
 if(action==='allrange'){await save(n=>{n.data.settings.from=1;n.data.settings.to=2300;f.page=0});return}
 if(['cards','random','test','filtered'].includes(action)){
  setup.filtered=action==='filtered';setup.fmt=action==='cards'||action==='filtered'?'card':'choice';setup.mode=action==='test'?'test':'practice';setup.size=d.settings.size;go('practice');return
 }
 if(action==='toggleword'){const no=Number(el?.dataset.no);if(f.shown.has(no))f.shown.delete(no);else f.shown.add(no);render();return}
 if(action==='nextpage'||action==='prev'){f.page+=action==='prev'?-1:1;render();return}
 if(action==='review'){
  const w=v.words(d),plan=reviewPlan(w,progress(d.history),d.deck,d.settings,localDay())
  launch('review',plan.words.map(a=>question(a,'card',d.settings.direction,w)));return
 }
 if(action==='backup'){
  const file=new Blob([JSON.stringify(d)],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='leap-notebook-'+localDay()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);return
 }
 if(action==='cancelrestore'){backup=null;render();return}
 if(action==='restoreok'&&backup){const data=backup;await save(n=>{n.data=data;n.session=null},()=>{backup=null;setup.size=data.settings.size;go('home');say('バックアップを復元しました。')});return}
 if(!s)return
 if(action==='pause'){go('home');return}
 if(action==='end'){if(confirm('今回の学習を終了しますか？ 採点済みの学習履歴は残ります。途中の範囲テストは採点されません。'))await save(n=>n.session=null,()=>go('home'));return}
 if(action==='finish'&&s.phase==='done'){await save(n=>n.session=null,()=>go('records'));return}
 if(action==='retry'&&s.phase==='done'){
  const queue=s.queue.filter((q,i)=>!q.retry&&s.answers[i].grade!=='good')
  launch('practice',structuredClone(queue));return
 }
 if(action==='advance'&&s.phase==='feedback'){await save(n=>advance(n.data,n.session!));return}
 if(['good','partial','miss'].includes(action)&&s.phase==='mark'){await save(n=>mark(n.data,n.session!,action as Grade));return}
 if(s.phase!=='ask')return
 if(action==='reveal'||action==='hint'){
  const draft=document.querySelector<HTMLInputElement>('#response')?.value??''
  await save(n=>{if(action==='reveal')n.session!.revealed=true;else n.session!.hinted=true},()=>{if(draft&&element('response'))element<HTMLInputElement>('response').value=draft});return
 }
 if(['good','partial','miss','choose','submit','skip'].includes(action)){
  const q=s.queue[s.index],self=['good','partial','miss'].includes(action)?action as Grade:null
  const text=action==='choose'?q.options[Number(el?.dataset.index)]:action==='submit'?value('response').trim():action==='skip'?'（無回答）':''
  if(action==='submit'&&!text){say('解答を入力するか「わからない」を選んでください。');return}
  await save(n=>answer(n.data,n.session!,text,self,localDay()))
 }
}
root.addEventListener('click',e=>{const b=(e.target as Element).closest<HTMLElement>('[data-act]');if(b&&!b.hasAttribute('disabled')&&e.detail<2)void act(b.dataset.act!,b)})
root.addEventListener('submit',e=>{
 e.preventDefault();if(busy)return
 const id=(e.target as HTMLFormElement).id
 if(id==='range'){const from=num('from'),to=num('to');if(from>to){say('開始番号は終了番号以下にしてください。');return}void save(n=>{n.data.settings.from=from;n.data.settings.to=to;f.page=0},()=>say('学習範囲を保存しました。'))}
 if(id==='prefs'){const gaps=value('gaps').split(/[,、，\s]+/u).filter(Boolean).map(Number);if(!validIntervals(gaps)){say('1〜365日の整数を、小さい順に1〜12個指定してください。');return}const size=num('prefsize'),fresh=num('fresh'),dir=value('prefdir') as Direction;void save(n=>Object.assign(n.data.settings,{intervals:gaps,size,fresh,direction:dir}),()=>{setup.size=size;say('設定を保存しました。')})}
 if(id==='launch'){setup.size=num('size');launch(setup.mode,draw(pool(),setup.size,setup.fmt,setup.dir))}
 if(id==='respond')void act('submit')
})
function updatePreview(text:string,html=''){
 raw=text
 try{const rows=html?htmlRows(html):[];const data=rows.length?rows:tsv(text);parsed=preview(data,snap.data.words.personal);if(rows.length)raw=rows.map(r=>r.map(c=>/[\n\t"]/.test(c)?'"'+c.replaceAll('"','""')+'"':c).join('\t')).join('\n')}
 catch(e){parsed=null;say(String(e))}
 render()
}
root.addEventListener('paste',e=>{if((e.target as Element).id==='paste'&&e.clipboardData){e.preventDefault();updatePreview(e.clipboardData.getData('text/plain'),e.clipboardData.getData('text/html'))}})
root.addEventListener('input',e=>{
 const input=e.target as HTMLInputElement
 if(input.id==='paste'){raw=input.value;parsed=null;document.getElementById('preview')?.remove()}
 if(input.id==='search'){const pos=input.selectionStart;f.search=input.value;f.page=0;render();const field=element<HTMLInputElement>('search');field.focus();field.setSelectionRange(pos,pos)}
})
root.addEventListener('change',async e=>{
 const input=e.target as HTMLInputElement
 if(input.id==='size'){setup.size=Number(input.value);return}
 if(input.id==='fmt'||input.id==='mode'||input.id==='dir'){setup.size=num('size')||10;if(input.id==='fmt')setup.fmt=input.value as Format;else if(input.id==='dir')setup.dir=input.value as Direction;else setup.mode=input.value as Mode;render()}
 if(input.id==='weak'||input.id==='hide'){f[input.id]=input.checked;f.shown.clear();f.page=0;render()}
 if(input.id==='restore'&&input.files?.[0]){
  backup=null
  try{const candidate:unknown=JSON.parse(await input.files[0].text());if(!validData(candidate))throw new Error();backup=candidate}
  catch{say('復元できません。ファイルの形式・単語番号・履歴を確認してください。')}
  render()
 }
})
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0)})
window.addEventListener('keydown',e=>{
 if(e.repeat||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||page!=='study'||!snap.session||/INPUT|TEXTAREA|SELECT/.test((e.target as Element).tagName))return
 const s=snap.session,q=s.queue[s.index]
 if(e.key===' '&&s.phase==='ask'&&q.kind==='card'&&!s.revealed&&s.mode!=='test'){e.preventDefault();void act('reveal')}
 if(/^[1234]$/.test(e.key)){
  if(s.phase==='mark'||(s.phase==='ask'&&s.revealed&&q.kind==='card')){const g=['good','partial','miss'][Number(e.key)-1];if(g)void act(g)}
  else if(s.phase==='ask'&&q.kind==='choice')document.querySelector<HTMLButtonElement>('[data-index="'+(Number(e.key)-1)+'"]')?.click()
 }
 if(e.key==='Enter'&&s.phase==='feedback'&&(e.target as Element).tagName!=='BUTTON'){e.preventDefault();void act('advance')}
})
async function refresh(){if(ready&&!busy){try{const latest=await readStore();if(latest.revision!==snap.revision||page==='home'){snap=latest;render()}}catch{say('記録を読み直せませんでした。')}}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()})
let lastDay=localDay()
setInterval(()=>{if(lastDay!==localDay()){lastDay=localDay();void refresh()}},30000)
openStore().then(s=>{snap=s;setup.size=s.data.settings.size;ready=true;render()}).catch(()=>root.innerHTML='<main><h1>保存領域を開けません</h1><p>このサイトでブラウザのデータ保存を許可し、再読み込みしてください。</p></main>')
