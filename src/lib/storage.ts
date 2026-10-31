import { DEFAULT_ANSWERS, type Answers } from './answers';
import type { RenewalRecord } from './history';
import type { DocId } from './rules/tokyo-r8';

export const STORAGE_KEY = 'nanbyo-navi:v1';

export interface Draft {
  answers: Answers;
  submitted: Partial<Record<DocId, boolean>>;
}

export interface StoreData {
  version: 1;
  records: RenewalRecord[];
  draft?: Draft;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const empty = (): StoreData => ({ version: 1, records: [] });

function defaultStorage(): KV | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** 読み込んだJSONを検証し、不正な部分は捨てる */
export function parseStore(text: string): StoreData {
  const raw: unknown = JSON.parse(text);
  if (!raw || typeof raw !== 'object' || (raw as StoreData).version !== 1 || !Array.isArray((raw as StoreData).records)) {
    throw new Error('このツールで書き出したファイルではありません');
  }
  const data = raw as StoreData;
  const records = data.records
    .filter((r) => r && typeof r.fiscalYear === 'number' && r.answers && Array.isArray(r.documents))
    .map((r) => ({ ...r, answers: { ...DEFAULT_ANSWERS, ...r.answers } }));
  const draft = data.draft?.answers
    ? { answers: { ...DEFAULT_ANSWERS, ...data.draft.answers }, submitted: data.draft.submitted ?? {} }
    : undefined;
  return { version: 1, records, draft };
}

export function load(storage: KV | undefined = defaultStorage()): StoreData {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? parseStore(text) : empty();
  } catch {
    return empty();
  }
}

/** 保存できたら true */
export function save(data: StoreData, storage: KV | undefined = defaultStorage()): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearAll(storage: KV | undefined = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても画面側の状態は初期化する
  }
}

/** 同じ年度の記録は上書きし、新しい年度順に並べる */
export function upsertRecord(data: StoreData, record: RenewalRecord): StoreData {
  const records = [record, ...data.records.filter((r) => r.fiscalYear !== record.fiscalYear)].sort(
    (x, y) => y.fiscalYear - x.fiscalYear,
  );
  return { ...data, records };
}

/** 指定した年度より前の、いちばん新しい記録 */
export function previousRecord(data: StoreData, fiscalYear: number): RenewalRecord | undefined {
  return data.records.find((r) => r.fiscalYear < fiscalYear);
}

export function exportJson(data: StoreData): string {
  return JSON.stringify(data, null, 2);
}
