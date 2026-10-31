import { describe, expect, it } from 'vitest';
import { DEFAULT_ANSWERS, type Answers } from '../src/lib/answers';
import { resolveDocuments } from '../src/lib/documents';
import { diffRecords, toRecord } from '../src/lib/history';
import { TOKYO_R8 } from '../src/lib/rules/tokyo-r8';

const meta = { fiscalYear: 2025, fiscalYearLabel: '令和7年度', rulesId: 'tokyo-r7' };

function recordFor(a: Answers, submitted = {}) {
  return toRecord(meta, a, resolveDocuments(a, TOKYO_R8), submitted, new Date('2025-08-01T00:00:00Z'));
}

describe('toRecord', () => {
  it('書類IDと提出済みかどうかだけを持つ。不要な書類は提出済みにしない', () => {
    const a = { ...DEFAULT_ANSWERS };
    const r = recordFor(a, { application: true, juminhyo: true });
    expect(r.savedAt).toBe('2025-08-01T00:00:00.000Z');
    expect(r.documents.find((d) => d.id === 'application')).toEqual({ id: 'application', status: 'required', submitted: true });
    // 情報連携ありなので住民票は不要 → チェックが残っていても提出済みにしない
    expect(r.documents.find((d) => d.id === 'juminhyo')?.submitted).toBe(false);
  });
});

describe('diffRecords', () => {
  it('情報連携をやめると、住民票などが新たに必要になる', () => {
    const prev = recordFor({ ...DEFAULT_ANSWERS, mynumberLink: true }, { application: true, rinsho: true });
    const now: Answers = { ...DEFAULT_ANSWERS, mynumberLink: false };
    const diff = diffRecords(prev, now, resolveDocuments(now, TOKYO_R8));

    expect(diff.changedAnswers).toHaveLength(1);
    expect(diff.changedAnswers[0]).toMatchObject({ key: 'mynumberLink', before: '省略する（おすすめ）' });
    expect(diff.newlyNeeded).toEqual(expect.arrayContaining(['juminhyo', 'insuranceCopy', 'incomeProof']));
    expect(diff.noLongerNeeded).toContain('pensionDeclaration');
    expect(diff.submittedLastTime).toEqual(['application', 'rinsho']);
  });

  it('何も変わらなければ差分なし', () => {
    const prev = recordFor(DEFAULT_ANSWERS);
    const diff = diffRecords(prev, DEFAULT_ANSWERS, resolveDocuments(DEFAULT_ANSWERS, TOKYO_R8));
    expect(diff.changedAnswers).toEqual([]);
    expect(diff.newlyNeeded).toEqual([]);
    expect(diff.noLongerNeeded).toEqual([]);
  });
});
