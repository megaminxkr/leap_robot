import { empty } from './core.ts';
import type { Data, Snapshot, Session, Attempt } from './types.ts';
const obj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown, a: number, b: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b;
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const direction = (v: unknown) => v === 'en' || v === 'ja';
const deck = (v: unknown): v is 'sample' | 'personal' => v === 'sample' || v === 'personal';
export function validIntervals(v: unknown): v is number[] { return Array.isArray(v) && v.length > 0 && v.length <= 12 && v.every((n, i) => int(n, 1, 365) && (!i || n > v[i - 1])); }
function validDay(v: unknown) { if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(v))
    return false; const d = new Date(v + 'T12:00:00Z'); return Number.isFinite(+d) && d.toISOString().startsWith(v); }
export function validData(v: unknown): v is Data {
    if (!obj(v) || v.version !== 1 || !deck(v.deck) || !obj(v.words) || !obj(v.settings) || !Array.isArray(v.history))
        return false;
    const s = v.settings;
    if (!int(s.from, 1, 2300) || !int(s.to, s.from, 2300) || !int(s.size, 1, 100) || !int(s.fresh, 0, 100) || !validIntervals(s.intervals) || !direction(s.direction))
        return false;
    const numbers = { personal: new Set<number>(), sample: new Set<number>() };
    for (const name of ['personal', 'sample'] as const) {
        const list = v.words[name];
        if (!Array.isArray(list) || list.length > 2300)
            return false;
        for (const w of list) {
            if (!obj(w) || !int(w.no, 1, 2300) || !nonempty(w.en) || !nonempty(w.ja) || numbers[name].has(w.no))
                return false;
            numbers[name].add(w.no);
        }
    }
    const ids = new Set<string>();
    for (const a of v.history) {
        if (!obj(a) || !nonempty(a.id) || ids.has(a.id) || !deck(a.deck) || !int(a.no, 1, 2300) || !numbers[a.deck].has(a.no) || !direction(a.dir) || !validDay(a.day) || !['good', 'miss', 'hint', 'partial'].includes(String(a.grade)) || !validIntervals(a.intervals))
            return false;
        ids.add(a.id);
    }
    return true;
}
let db: IDBDatabase;
// Keep a small, tab-local intent until IndexedDB confirms the answer.
// A reload may otherwise abort a transaction between its read and write.
const journalKey = 'leap-robot-pending-v1';
export function prepareAnswer(revision: number, session: Session, added: Attempt[]) {
    sessionStorage.setItem(journalKey, JSON.stringify({ revision, session, added }));
}
export function clearJournal() { sessionStorage.removeItem(journalKey); }
async function recover(): Promise<Snapshot> {
    const state = await readStore(), raw = sessionStorage.getItem(journalKey);
    if (!raw)
        return state;
    let pending;
    try {
        pending = JSON.parse(raw);
    }
    catch {
        clearJournal();
        return state;
    }
    if (pending?.revision === state.revision && state.session?.id === pending.session?.id && Array.isArray(pending.added)) {
        const next: Snapshot = { ...state, session: pending.session, data: { ...state.data, history: [...state.data.history, ...pending.added] } };
        if (validData(next.data)) {
            try {
                await commit(next);
                clearJournal();
                return next;
            }
            catch {
                const fresh = await readStore();
                if (fresh.revision === state.revision)
                    throw new Error('回答を復元できません。');
                clearJournal();
                return fresh;
            }
        }
    }
    clearJournal();
    return state;
}
export async function openStore(): Promise<Snapshot> {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('leap-robot-notebook', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('state');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => resolve(r.result);
    });
    return recover();
}
export function readStore(): Promise<Snapshot> {
    return new Promise((resolve, reject) => {
        const req = db.transaction('state').objectStore('state').get('book');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => { if (req.result && !validData(req.result.data))
            reject(new Error('保存データを読み取れません。'));
        else
            resolve(req.result ?? { revision: 0, data: empty(), session: null }); };
    });
}
export async function commit(s: Snapshot) {
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state'), r = store.get('book');
        let conflict = false;
        r.onsuccess = () => { if ((r.result?.revision ?? 0) !== s.revision) {
            conflict = true;
            tx.abort();
            return;
        } store.put({ ...s, revision: s.revision + 1 }, 'book'); };
        tx.oncomplete = () => { s.revision++; resolve(); };
        tx.onabort = () => reject(new Error(conflict ? '別のタブで更新されました。最新の記録を読み直しました。' : '保存できませんでした。端末の空き容量を確認してください。'));
    });
}
