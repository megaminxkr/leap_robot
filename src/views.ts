import { entry } from './bank.ts';
import { localDay, key, progress, reviewPlan } from './core.ts';
import { btn, esc, icon, noLabel, dirLabel, label, numberField, options } from './ui.ts';
import type { Data, Word, Format, Mode, Direction } from './types.ts';
import type { Preview } from './importer.ts';
export type Page = 'home' | 'book' | 'practice' | 'records' | 'settings' | 'import' | 'study';
export interface Filter {
    search: string;
    weak: boolean;
    hide: boolean;
    shown: Set<number>;
    page: number;
}
export interface Setup {
    fmt: Format;
    mode: Mode;
    dir: Direction;
    size: number;
    filtered: boolean;
}
export const words = (d: Data) => d.words[d.deck].filter(w => w.no >= d.settings.from && w.no <= d.settings.to).sort((a, b) => a.no - b.no);
export const deckName = (d: Data) => d.deck === 'sample' ? 'サンプル帳' : '個人の単語帳';
export function filtered(d: Data, f: Filter) {
    const stats = progress(d.history), q = f.search.trim().toLowerCase();
    return words(d).filter(w => (!q || w.en.toLowerCase().includes(q) || w.ja.includes(q)) && (!f.weak || (['en', 'ja'] as const).some(dir => stats.get(key(d.deck, w.no, dir))?.weak)));
}
export function header(page: Page) {
    return `<header><div class="mast"><a href="#home" class="brand"><img src="./mark.svg" alt="" width="37" height="40"><span>単語手帖</span></a><span class="edition">改訂版 LEAP 対応</span><span class="date">${new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date())}</span></div></header><nav aria-label="メイン"><div>${[['home', 'home', 'ホーム'], ['book', 'book', '単語帳'], ['practice', 'pen', '練習'], ['records', 'chart', '学習記録'], ['settings', 'settings', '設定']].map(([p, i, name]) => `<a href="#${p}" ${p === page ? 'aria-current="page"' : ''}>${icon(i)}${name}</a>`).join('')}</div></nav>`;
}
export function rangePanel(d: Data) {
    const s = d.settings;
    return `<section class="panel range"><h2>学習範囲</h2><form id="range"><div class="pair">${label('開始番号', numberField('from', s.from, 1, 2300))}<span>〜</span>${label('終了番号', numberField('to', s.to, 1, 2300))}</div><div class="actions"><button>範囲を適用</button>${btn('全範囲', 'allrange', 'text')}</div></form><p class="fine rule">${esc(deckName(d))}　·　範囲内 ${words(d).length} 語</p></section>`;
}
const jump = (title: string, subtitle: string, action: string, i: string) => btn(`<span class="jump-icon">${icon(i)}</span><span><b>${title}</b><small>${subtitle}</small></span>${icon('arrow')}`, action, 'jump');
export function home(d: Data, active: boolean) {
    const s = d.settings, ready = d.words[d.deck].length > 0, plan = reviewPlan(words(d), progress(d.history), d.deck, s, localDay(), () => 0.5);
    return `<div class="titleline"><h1>今日の学習</h1><span>${esc(deckName(d))}</span></div><div class="homegrid"><section class="review paper"><div class="topline"><h2>今日の復習</h2><span>${dirLabel(s.direction)}</span></div><div class="count">${plan.due}<small>語</small></div><p>${ready ? (plan.due ? '復習期限を迎えています。' : plan.words.length ? '期限を迎えた語はありません。新出語から始められます。' : '現在の範囲の復習は完了しています。') : '単語を取り込むと、ここに今日の復習が並びます。'}</p><div class="actions">${active ? btn('学習を再開 ' + icon('arrow'), 'resume', 'primary') : ready ? btn('復習を始める ' + icon('arrow'), 'review', 'primary', plan.words.length ? '' : 'disabled') : btn('単語を取り込む ' + icon('arrow'), 'import', 'primary')}${!ready ? btn('サンプルで試す', 'sample', 'text') : btn('復習設定', 'settings', 'text')}</div></section>${rangePanel(d)}</div><section class="modes"><h2>学習メニュー</h2><div class="jumpgrid">${jump('Web単語帳', '番号順にめくる・訳を隠す', 'book', 'book')}${jump('フラッシュカード', '表と裏で思い出す', 'cards', 'cards')}${jump('ランダム練習', '選択・入力・英文空所', 'random', 'pen')}${jump('範囲テスト', '最後にまとめて採点', 'test', 'test')}</div></section>`;
}
export function book(d: Data, f: Filter) {
    const list = filtered(d, f), pages = Math.max(1, Math.ceil(list.length / 40));
    f.page = Math.min(f.page, pages - 1);
    return `<div class="titleline"><h1>Web単語帳</h1><span>${deckName(d)}</span></div>${rangePanel(d)}<section class="panel"><div class="filters">${label('英語・日本語を検索', `<input id="search" type="search" placeholder="見出し語・意味" value="${esc(f.search)}">`)}<label><input type="checkbox" id="weak" ${f.weak ? 'checked' : ''}> 苦手語のみ</label><label><input type="checkbox" id="hide" ${f.hide ? 'checked' : ''}> 訳を一括で隠す</label></div><div class="topline"><p>${list.length} 語</p>${btn('この絞り込みで練習', 'filtered', '', list.length ? '' : 'disabled')}</div><div class="entries">${list.slice(f.page * 40, f.page * 40 + 40).map(w => `<article class="entry"><small>${noLabel(w.no)}</small><strong lang="en">${esc(w.en)}</strong><div>${!f.hide || f.shown.has(w.no) ? `<span class="gloss">${esc(w.ja)}</span>` : ''}${f.hide ? btn(f.shown.has(w.no) ? '訳を隠す' : '訳を開く', 'toggleword', 'text', `data-no="${w.no}"`) : ''}</div></article>`).join('') || '<p>該当する単語がありません。範囲や検索条件を変更できます。</p>'}</div>${pages > 1 ? `<div class="actions">${btn('前へ', 'prev', '', f.page ? '' : 'disabled')} ${f.page + 1} / ${pages} ${btn('次へ', 'nextpage', '', f.page + 1 < pages ? '' : 'disabled')}</div>` : ''}</section>`;
}
export function importer(p: Preview | null, raw: string) {
    return `<div class="titleline"><h1>単語を取り込む</h1></div><section class="panel"><h2>元の表を貼り付ける</h2><p><a href="https://ukaru-eigo.com/leap-modified-list/" target="_blank" rel="noreferrer">改訂版の単語一覧を開く ↗</a>。必要な行の「No・単語・意味」を選んでコピーし、下の欄に貼り付けてください。</p>${label('表の貼り付け', `<textarea id="paste" rows="5" placeholder="No　単語　意味" spellcheck="false">${esc(raw)}</textarea>`)}<p class="fine">HTML表・タブ区切りに対応。取り込んだ単語は、このブラウザに保存されます。</p>${btn('内容を確認', 'preview')}</section>${p ? `<section class="panel" id="preview"><h2>取り込み内容の確認</h2><p>${p.words.length} 語 ／ 新規 ${p.added}・更新 ${p.updated}・登録済み ${p.unchanged}</p>${p.words.slice(0, 5).map(w => `<div class="previewrow"><small>${noLabel(w.no)}</small> <b>${esc(w.en)}</b><div class="gloss">${esc(w.ja)}</div></div>`).join('')}${p.errors.length ? `<div class="error" role="alert"><b>${p.errors.length} 件を修正してから保存してください。</b><ul>${p.errors.map(v => '<li>' + esc(v) + '</li>').join('')}</ul></div>` : ''}<div class="actions">${btn('確認して保存', 'saveimport', 'primary', p.words.length && !p.errors.length ? '' : 'disabled')}</div></section>` : ''}`;
}
export function practice(d: Data, u: Setup, pool: Word[], active: boolean) {
    const n = pool.filter(w => entry(w)).length;
    return `<div class="titleline"><h1>練習の設定</h1></div>${rangePanel(d)}<section class="panel"><h2>出題方法</h2><form id="launch"><div class="formgrid">${label('進め方', `<select id="mode">${options([['practice', 'ランダム練習'], ['test', '範囲テスト']], u.mode)}</select>`)}${label('問題形式', `<select id="fmt">${options([['card', 'フラッシュカード'], ['choice', '意味の四択'], ['type', '英単語の入力'], ['cloze', '英文の空所補充']], u.fmt)}</select>`)}${u.fmt === 'card' ? label('方向', `<select id="dir">${options([['en', '英 → 日'], ['ja', '日 → 英']], u.dir)}</select>`) : ''}${label('問題数', numberField('size', u.size, 1, 100))}</div><p>${u.filtered ? '単語帳の絞り込み' : '指定範囲'}　${pool.length} 語　<span class="fine">空所補充・語義指定入力対応 ${n} 語</span></p><p class="fine">${u.mode === 'test' ? '全問を提出した後に採点します。カードは自分の解答を書き、最後に自己採点します。' : '答えを確認しながら進みます。間違えた語は、ほかの問題を挟んで一度解き直します。'}${u.fmt === 'choice' || u.fmt === 'type' ? ' 自動採点の材料が足りない語はカードで出題します。' : ''}</p>${active ? btn('進行中の学習を再開', 'resume', 'primary') : `<button class="primary" ${(u.fmt === 'cloze' ? n : pool.length) ? '' : 'disabled'}>${u.mode === 'test' ? 'テストを始める' : '練習を始める'} ${icon('arrow')}</button>`}</form></section>`;
}
export function records(d: Data) {
    const stats = progress(d.history), pool = words(d), today = localDay();
    const dirs = ['en', 'ja'] as const;
    const rows = pool.flatMap(w => dirs.flatMap(dir => { const p = stats.get(key(d.deck, w.no, dir)); return p ? [{ w, dir, p }] : []; }));
    const weak = rows.filter(r => r.p.weak), upcoming = new Map<string, number>();
    rows.forEach(r => { upcoming.set(r.p.due, (upcoming.get(r.p.due) ?? 0) + 1); });
    return `<div class="titleline"><h1>学習記録</h1><span>${deckName(d)}</span></div>${rangePanel(d)}<section class="panel"><h2>方向別の成績</h2><div class="metrics">${dirs.map(dir => { const a = rows.filter(r => r.dir === dir); return `<div><h3>${dirLabel(dir)}</h3><dl>${[['回答回数', a.reduce((s, r) => s + r.p.tries, 0)], ['各日の初回で自力正解', a.reduce((s, r) => s + r.p.independent, 0)], ['別の日の初回で自力正解', a.reduce((s, r) => s + r.p.delayed, 0)], ['同日中の解き直し成功', a.reduce((s, r) => s + r.p.recovered, 0)]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v} 回</dd></div>`).join('')}</dl></div>`; }).join('')}</div></section><div class="cols"><section class="panel"><h2>苦手語 <small>${new Set(weak.map(r => r.w.no)).size} 語</small></h2>${weak.length ? weak.map(r => `<div class="line"><span>${noLabel(r.w.no)}　<b>${esc(r.w.en)}</b></span><small>${dirLabel(r.dir)}</small></div>`).join('') : '<p class="fine">この範囲に苦手語はありません。</p>'}</section><section class="panel"><h2>復習予定</h2>${upcoming.size ? [...upcoming].sort(([a], [b]) => a.localeCompare(b)).map(([day, n]) => `<div class="line"><span>${day} ${day <= today ? '（期限到来）' : ''}</span><b>${n} 件</b></div>`).join('') : '<p class="fine">回答すると、次の復習日が表示されます。</p>'}</section></div>`;
}
export function recallHistory(d: Data) {
    const stats = progress(d.history), rows: string[] = [];
    for (const word of words(d)) {
        for (const dir of ['en', 'ja'] as const) {
            const row = stats.get(key(d.deck, word.no, dir));
            if (row && (row.delayed || row.recovered)) {
                rows.push('<div class="history-entry"><b>' + noLabel(word.no) + '　' + esc(word.en) + '</b> ' + dirLabel(dir) + '<small>別日の初回正解 ' + row.delayed + ' 回 ／ 同日の解き直し成功 ' + row.recovered + ' 回</small></div>');
            }
        }
    }
    return '<section class="panel"><details><summary>語別の定着記録</summary>' + (rows.join('') || '<p class="fine">同日に解き直せた語と、別日の初回に自力正解した語がここに並びます。</p>') + '</details></section>';
}
export function settings(d: Data) {
    const s = d.settings;
    return `<div class="titleline"><h1>設定</h1></div><section class="panel"><h2>今日の復習</h2><form id="prefs"><div class="formgrid">${label('復習する方向', `<select id="prefdir">${options([['en', '英 → 日'], ['ja', '日 → 英']], s.direction)}</select>`)}${label('1回の出題数', numberField('prefsize', s.size, 1, 100))}${label('1回の新出語の上限', numberField('fresh', s.fresh, 0, 100))}${label('復習間隔（日・短い順）', `<input id="gaps" required value="${s.intervals.join(', ')}">`)}</div><p class="fine">初期値は 1・3・7・14・30 日。変更は次に記録する回答から適用されます。誤答は翌日に復習します。</p><button>設定を保存</button></form></section><section class="panel"><h2>単語データ</h2><p>使用中：${deckName(d)}　個人 ${d.words.personal.length} 語・サンプル ${d.words.sample.length} 語</p><div class="actions">${btn('単語を取り込む', 'import')}${btn('サンプル帳を開く', 'sample')}${d.words.personal.length ? btn('個人の単語帳を開く', 'personal') : ''}</div></section><section class="panel"><h2>バックアップ</h2><p>両方の単語帳・回答履歴・復習設定をまとめて端末間で移せます。</p><div class="actions">${btn('書き出す', 'backup')}<label class="filebutton">ファイルから復元<input type="file" id="restore" accept=".json,application/json"></label></div><div id="restore-preview"></div></section>`;
}
