export type Deck = 'personal' | 'sample'
export type Direction = 'en' | 'ja'
export type Grade = 'good' | 'partial' | 'miss' | 'hint'
export type Format = 'card' | 'choice' | 'type' | 'cloze'
export type Mode = 'review' | 'practice' | 'test'
export interface Word { no: number; en: string; ja: string }
export interface Settings { from: number; to: number; size: number; fresh: number; intervals: number[]; direction: Direction }
export interface Attempt { id: string; deck: Deck; no: number; dir: Direction; day: string; grade: Grade; intervals: number[] }
export interface Data { version: 1; deck: Deck; words: Record<Deck,Word[]>; settings: Settings; history: Attempt[] }
export interface Progress { day: string; due: string; stage: number; weak: boolean; tries: number; independent: number; delayed: number; recovered: number; dayMiss: boolean; dayRecovered: boolean }
export interface Question { no: number; dir: Direction; kind: Format; prompt: string; cue: string; answers: string[]; options: string[]; retry?: boolean }
export interface Response { text: string; grade: Grade | null; day: string }
export interface Session { id: string; deck: Deck; mode: Mode; queue: Question[]; index: number; answers: Response[]; revealed: boolean; hinted: boolean; phase: 'ask'|'feedback'|'mark'|'done'; markIndex: number }
export interface Snapshot { revision: number; data: Data; session: Session | null }
