import { describe, expect, it } from 'vitest';
import { DEFAULT_ANSWERS } from '../src/lib/answers';
import type { RenewalRecord } from '../src/lib/history';
import {
  STORAGE_KEY,
  clearAll,
  exportJson,
  load,
  parseStore,
  previousRecord,
  save,
  upsertRecord,
  type StoreData,
} from '../src/lib/storage';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

const record = (fiscalYear: number): RenewalRecord => ({
  fiscalYear,
  fiscalYearLabel: `${fiscalYear}`,
  rulesId: 'tokyo-r8',
  savedAt: '2026-08-01T00:00:00.000Z',
  answers: DEFAULT_ANSWERS,
  documents: [{ id: 'application', status: 'required', submitted: true }],
});

describe('storage', () => {
  it('保存して読み込める', () => {
    const s = memoryStorage();
    const data: StoreData = { version: 1, records: [record(2026)] };
    expect(save(data, s)).toBe(true);
    expect(load(s)).toEqual(data);
  });

  it('壊れたデータや空なら空の状態を返す', () => {
    const s = memoryStorage();
    expect(load(s)).toEqual({ version: 1, records: [] });
    s.setItem(STORAGE_KEY, '{broken');
    expect(load(s)).toEqual({ version: 1, records: [] });
  });

  it('localStorageが使えなくても例外を出さない', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    expect(load(throwing)).toEqual({ version: 1, records: [] });
    expect(save({ version: 1, records: [] }, throwing)).toBe(false);
    expect(() => clearAll(throwing)).not.toThrow();
  });

  it('全削除', () => {
    const s = memoryStorage();
    save({ version: 1, records: [record(2026)] }, s);
    clearAll(s);
    expect(s.map.size).toBe(0);
  });

  it('書き出したJSONを読み込める。他のファイルは拒否する', () => {
    const data: StoreData = { version: 1, records: [record(2026)] };
    expect(parseStore(exportJson(data))).toEqual(data);
    expect(() => parseStore('{"foo":1}')).toThrow();
  });

  it('古いデータに新しい質問の答えがなくても既定値で補う', () => {
    const { kogakuChoki: _, ...oldAnswers } = DEFAULT_ANSWERS;
    const text = JSON.stringify({ version: 1, records: [{ ...record(2025), answers: oldAnswers }] });
    expect(parseStore(text).records[0].answers.kogakuChoki).toBe(DEFAULT_ANSWERS.kogakuChoki);
  });

  it('同じ年度は上書きし、前年度の記録を探せる', () => {
    let data: StoreData = { version: 1, records: [] };
    data = upsertRecord(data, record(2025));
    data = upsertRecord(data, record(2026));
    data = upsertRecord(data, { ...record(2026), savedAt: 'later' });
    expect(data.records.map((r) => r.fiscalYear)).toEqual([2026, 2025]);
    expect(data.records[0].savedAt).toBe('later');
    expect(previousRecord(data, 2026)?.fiscalYear).toBe(2025);
    expect(previousRecord(data, 2025)).toBeUndefined();
  });
});
