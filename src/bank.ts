import type {Word} from './types.ts'
// Each entry has an original sentence, an explicit inflected answer and hand-checked distractors.
type Row = [string,string,string,string,string,string,string,string[]]
const rows: Row[] = [
 ['borrow','動','返す約束で借りる','借','May I ___ your ruler until lunch?','borrow','動詞の原形',['wheel','ancient','delay']],
 ['wheel','名','車のタイヤを支える車輪','車輪','One ___ on my suitcase broke at the station.','wheel','可算名詞の単数形',['borrow','ancient','delay']],
 ['ancient','形','はるか昔の、古代の','古代','The guide showed us an ___ Roman coin.','ancient','形容詞',['borrow','wheel','delay']],
 ['delay','動','予定より遅らせる','遅','Yesterday thick fog ___ our flight by an hour.','delayed','動詞の過去形',['borrow','wheel','ancient']],
 ['lend','動','あとで返してもらうために貸す','貸','My sister ___ me her calculator yesterday.','lent','動詞の過去形',['modern','garbage','wheel']],
 ['modern','形','現代の、近代的な','現代|近代','The museum displays both medieval tools and ___ machines.','modern','形容詞',['spend','wheel','garbage']],
 ['spend','動','あることに時間を費やす','費や','Last night I ___ two hours drawing the map.','spent','動詞の過去形',['ancient','wheel','delay']],
 ['garbage','名','捨てるもの、ごみ','ごみ|ゴミ|廃棄','Put the empty wrapper in the ___ bin.','garbage','名詞',['wheel','lend','modern']],
 ['agree','動','相手の意見に賛成する','賛成','I ___ with your suggestion about the meeting time.','agree','動詞の原形と同形の現在形',['borrow','wheel','delay']],
 ['invent','動','新しい道具などを発明する','発明','In our story, a child ___ a clock that runs on rainwater last year.','invented','動詞の過去形',['borrow','ancient','wheel']],
 ['feasible','形','実行に移せる、実現可能な','実現|実行|可能','With three extra volunteers, the plan finally seemed ___.','feasible','形容詞',['garbage','wheel','ancient']],
 ['viable','形','計画などが成り立つ見込みのある','見込み|可能|存続','The team needed a financially ___ way to keep the shop open.','viable','形容詞',['garbage','wheel','ancient']],
 ['refrigerator','名','食品を冷やしておく冷蔵庫','冷蔵庫','Put the milk back in the ___ after breakfast.','refrigerator','可算名詞の単数形',['wheel','lend','ancient']],
 ['traffic','名','道路を行き交う車の流れ、交通量','交通','Heavy ___ on the bridge slowed our bus down.','traffic','不可算名詞',['wheel','lend','ancient']],
 ['provide','動','必要なものを供給する','供給|与え|提供','The new taps ___ clean water for the whole village.','provide','複数主語に続く現在形',['wheel','ancient','borrow']],
 ['furniture','名','机やいすなどの家具','家具','All the ___ in the reading room was made of oak.','furniture','不可算名詞',['wheel','delay','ancient']]
]
export const bank = new Map(rows.map(([en,pos,sense,match,sentence,form,grammar,wrong])=>[en,{en,pos,sense,match:new RegExp(match),sentence,form,grammar,wrong}]))
export const samples: Word[] = rows.map(([en,pos,sense],i)=>({no:i+1,en,ja:'［'+pos+'］'+sense}))
export function entry(w:Word) {
 const item=bank.get(w.en.trim().toLowerCase())
 return item && item.match.test(w.ja) ? item : undefined
}
