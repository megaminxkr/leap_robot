import {btn,esc,noLabel,dirLabel,gradeLabel,icon} from './ui.ts'
import {gradeInput,addRetry,log} from './core.ts'
import type {Data,Session,Grade,Question} from './types.ts'
export function answer(d:Data,s:Session,text:string,self:Grade|null,day:string){
 if(s.phase!=='ask'||s.answers.length!==s.index)return
 const q=s.queue[s.index],manual=q.kind==='card'
 if(manual && s.mode!=='test' && (!self||!s.revealed))return
 const grade=manual?(s.mode==='test'?null:self):gradeInput(q,text,s.hinted)
 s.answers.push({text,grade,day})
 if(s.mode!=='test'&&grade){log(d,s,s.index,grade,day);addRetry(s,q,grade)}
 s.phase='feedback'
}
function finish(d:Data,s:Session){
 const pending=s.answers.findIndex(a=>a.grade===null)
 if(pending>=0){s.phase='mark';s.markIndex=pending;return}
 if(s.mode==='test')s.answers.forEach((a,i)=>log(d,s,i,a.grade!,a.day))
 s.phase='done'
}
export function advance(d:Data,s:Session){
 if(s.phase!=='feedback')return
 if(s.index===s.queue.length-1){finish(d,s);return}
 s.index++;s.phase='ask';s.revealed=false;s.hinted=false
}
export function mark(d:Data,s:Session,grade:Grade){
 if(s.phase!=='mark'||s.answers[s.markIndex].grade!==null)return
 s.answers[s.markIndex].grade=grade;finish(d,s)
}
const grades=()=>`<div class="grades">${btn('思い出せた','good','primary')}${btn('あいまい','partial')}${btn('思い出せなかった','miss')}</div>`
const result=(q:Question,text:string,grade:Grade|null)=>`<div class="feedback"><b class="${grade==='good'?'correct':'incorrect'}">${grade?gradeLabel[grade]:'自己採点'}</b><dl>${text?`<div><dt>自分の解答</dt><dd>${esc(text)}</dd></div>`:''}<div><dt>正答</dt><dd>${esc(q.answers.join(' / '))}</dd></div></dl></div>`
const modes={review:'今日の復習',practice:'ランダム練習',test:'範囲テスト'}
export function study(s:Session){
 if(s.phase==='done'){
  const first=s.answers.filter((_,i)=>!s.queue[i].retry),mistakes=s.answers.map((a,i)=>({a,q:s.queue[i]})).filter(({a,q})=>a.grade!=='good'&&!q.retry)
  return `<div class="titleline"><h1>${modes[s.mode]}の結果</h1></div><section class="panel"><h2>初回の自力正解</h2><div class="count">${first.filter(a=>a.grade==='good').length}<small> / ${first.length} 問</small></div><div class="actions">${mistakes.length?btn('間違えた語を解き直す','retry','primary'):''}${btn('学習記録へ','finish')}</div></section><section class="panel"><h2>解答の見直し</h2>${s.answers.map((a,i)=>`<details ${a.grade!=='good'?'open':''}><summary>${noLabel(s.queue[i].no)}　${esc(s.queue[i].prompt)}　<small>${s.queue[i].retry?'解き直し · ':''}${gradeLabel[a.grade!]}</small></summary>${result(s.queue[i],a.text,a.grade)}</details>`).join('')}</section>`
 }
 const marking=s.phase==='mark',idx=marking?s.markIndex:s.index,q=s.queue[idx],test=s.mode==='test'
 const title={card:'フラッシュカード',choice:'意味の四択',type:'英単語の入力',cloze:'英文の空所補充'}[q.kind]
 let body=''
 if(marking)body=result(q,s.answers[idx].text,null)+grades()
 else if(s.phase==='feedback'){
  const a=s.answers[idx]
  body=(test?'<p>回答を保存しました。</p>':result(q,a.text,a.grade))+btn(idx+1<s.queue.length?'次の問題へ':test?'採点する':'結果を見る','advance','primary')
 }else if(q.kind==='card'&&!test){
  body=s.revealed?`<div class="solution">${esc(q.answers[0])}</div>${grades()}`:btn('答えを開く','reveal','primary')
 }else if(q.kind==='choice'){
  body=`<div class="choices">${q.options.map((v,i)=>btn(`<small>${i+1}</small> ${esc(v)}`,'choose','','data-index="'+i+'"')).join('')}</div>`
 }else{
  body=`<form id="respond">${s.hinted?`<p class="hint">ヒント　${esc(q.answers[0].slice(0,Math.min(3,q.answers[0].length)))}…</p>`:''}<label class="field"><span>自分の解答</span><input id="response" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" ${q.dir==='ja'?'lang="en"':''}></label><div class="actions"><button class="primary">${test?'回答を提出':'回答する'}</button>${!test&&!s.hinted?btn('ヒントを見る','hint','text'):''}${btn('わからない','skip','text')}</div></form>`
 }
 return `<div class="titleline"><h1>${marking?'カードの自己採点':modes[s.mode]}</h1>${btn('中断する','pause','text')}</div><section class="sheet paper"><div class="topline"><span>${title}　·　${dirLabel(q.dir)}</span><b>${idx+1} / ${s.queue.length}</b></div><progress value="${idx+1}" max="${s.queue.length}" aria-label="進行状況"></progress><div class="question"><small>${noLabel(q.no)}${q.retry?'　解き直し':''}</small><h2 class="${q.kind==='cloze'?'sentence':''}">${esc(q.prompt)}</h2><p>${esc(q.cue)}${q.kind==='card'&&test?'。最後に自己採点します。':''}</p></div><div class="answerarea">${body}</div></section>${!marking&&s.phase==='ask'&&q.kind==='card'&&!test?'<p class="keyhelp">キーボード　Space で答えを開く　／　1・2・3 で評価</p>':''}`
}
