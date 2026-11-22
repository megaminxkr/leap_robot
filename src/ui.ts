export const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const glyphs:Record<string,string>={
 book:'M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z M12 5v15',
 home:'m3 11 9-8 9 8 M5 10v10h5v-6h4v6h5V10',
 pen:'m4 16-1 5 5-1L20 8l-4-4z M13 7l4 4',
 chart:'M4 3v17h17 M8 15v-4m5 4V7m5 8V5',
 settings:'M3 7h7m5 0h6M3 17h2m5 0h11 M10 4v6m-4 4v6',
 arrow:'M4 12h15m-6-6 6 6-6 6',
 cards:'M7 5h13v15H7z M4 16H2V2h13',
 test:'M5 3h14v18H5z M8 8h8m-8 4h8m-8 4h5',
 upload:'M12 16V3m-5 5 5-5 5 5 M4 16v5h16v-5',
 time:'M12 3a9 9 0 1 0 .01 0 M12 7v6l4 2'
}
export const icon=(name:string)=>'<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="'+glyphs[name]+'"/></svg>'
export function btn(label:string,action:string,cls='',attrs=''){return '<button type="button" class="'+cls+'" data-act="'+action+'" '+attrs+'>'+label+'</button>'}
export const noLabel=(n:number)=>'No. '+String(n).padStart(3,'0')
export const dirLabel=(d:string)=>d==='en'?'英 → 日':'日 → 英'
export const gradeLabel:Record<string,string>={good:'自力正解',partial:'あいまい',hint:'ヒント正解',miss:'不正解'}
export const label=(name:string,control:string)=>'<label class="field"><span>'+name+'</span>'+control+'</label>'
export const numberField=(id:string,v:number,min:number,max:number)=>'<input type="number" inputmode="numeric" id="'+id+'" value="'+v+'" min="'+min+'" max="'+max+'" required step="1">'
export const options=(pairs:string[][],value:string)=>pairs.map(([v,t])=>'<option value="'+v+'" '+(value===v?'selected':'')+'>'+t+'</option>').join('')
