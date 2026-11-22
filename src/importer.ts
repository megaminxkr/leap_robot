import type { Word } from './types.ts';
import { norm } from './core.ts';
export interface Preview {
    words: Word[];
    errors: string[];
    added: number;
    updated: number;
    unchanged: number;
}
export function tsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [], cell = '', quoted = false;
    const input = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if (quoted) {
            if (c === '"' && input[i + 1] === '"') {
                cell += '"';
                i++;
            }
            else if (c === '"')
                quoted = false;
            else
                cell += c;
        }
        else if (c === '"' && !cell) {
            quoted = true;
        }
        else if (c === '\t') {
            row.push(cell);
            cell = '';
        }
        else if (c === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        }
        else
            cell += c;
    }
    if (quoted)
        throw new Error('閉じていない引用符があります（行 ' + (rows.length + 1) + '）。');
    row.push(cell);
    rows.push(row);
    return rows;
}
export function htmlRows(html: string): string[][] {
    const t = document.createElement('template');
    t.innerHTML = html;
    return Array.from(t.content.querySelectorAll('tr')).map(tr => Array.from(tr.cells).map(td => {
        const copy = td.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        return (copy.textContent ?? '').trim();
    }));
}
export function preview(rows: string[][], existing: Word[]): Preview {
    const result: Preview = { words: [], errors: [], added: 0, updated: 0, unchanged: 0 };
    const seen = new Map<number, Word>(), old = new Map(existing.map(w => [w.no, w]));
    rows.forEach((cells, i) => {
        if (cells.every(v => !v.trim()))
            return;
        const [raw = '', en = '', ja = ''] = cells.map(v => v.trim());
        if (/^(no\.?|番号)$/i.test(raw.normalize('NFKC')) && /単語|英語|見出し語/.test(en))
            return;
        const num = raw.normalize('NFKC'), no = Number(num);
        const issue = (msg: string) => { result.errors.push('行 ' + (i + 1) + '（No. ' + (raw.slice(0, 24) || '空欄') + '） ' + msg); };
        if (!/^\d+$/.test(num) || no < 1 || no > 2300) {
            issue('番号は 1〜2300 の整数です。');
            return;
        }
        if (cells.length !== 3) {
            issue('番号・単語・意味の3列が必要です。');
            return;
        }
        if (!en || !ja) {
            issue('英単語または意味が空欄です。');
            return;
        }
        const same = seen.get(no);
        if (same) {
            if (same.en !== en || same.ja !== ja)
                issue('貼り付け内で同じ番号の内容が異なります。');
            return;
        }
        const before = old.get(no);
        if (before && norm(before.en) !== norm(en)) {
            issue('登録済みの見出し語「' + before.en + '」と異なります。');
            return;
        }
        const w = { no, en, ja };
        seen.set(no, w);
        result.words.push(w);
        if (!before)
            result.added++;
        else if (before.ja === ja && before.en === en)
            result.unchanged++;
        else
            result.updated++;
    });
    result.words.sort((a, b) => a.no - b.no);
    return result;
}
export function mergeWords(existing: Word[], incoming: Word[]) { const m = new Map(existing.map(w => [w.no, w])); incoming.forEach(w => m.set(w.no, w)); return [...m.values()].sort((a, b) => a.no - b.no); }
