import type { Answers } from './answers';
import type { DocStatus, ResolvedDoc } from './documents';
import { optionLabel, questionTitle } from './questions';
import type { DocId } from './rules/tokyo-r8';

/** 1年分の記録。どの書類が必要で、どれを出したかだけを持つ */
export interface RenewalRecord {
  fiscalYear: number;
  fiscalYearLabel: string;
  rulesId: string;
  savedAt: string;
  answers: Answers;
  documents: { id: DocId; status: DocStatus; submitted: boolean }[];
}

export interface AnswerChange {
  key: keyof Answers;
  title: string;
  before: string;
  after: string;
}

export interface RecordDiff {
  changedAnswers: AnswerChange[];
  /** 前回は不要だったが、今回は必要 */
  newlyNeeded: DocId[];
  /** 前回は必要だったが、今回は不要 */
  noLongerNeeded: DocId[];
  /** 前回実際に出した書類 */
  submittedLastTime: DocId[];
}

const needed = (s: DocStatus) => s !== 'omitted';

export function toRecord(
  meta: Pick<RenewalRecord, 'fiscalYear' | 'fiscalYearLabel' | 'rulesId'>,
  answers: Answers,
  docs: ResolvedDoc[],
  submitted: Partial<Record<DocId, boolean>>,
  now: Date = new Date(),
): RenewalRecord {
  return {
    ...meta,
    savedAt: now.toISOString(),
    answers,
    documents: docs.map((d) => ({ id: d.id, status: d.status, submitted: Boolean(submitted[d.id]) && needed(d.status) })),
  };
}

export function diffRecords(prev: RenewalRecord, answers: Answers, docs: ResolvedDoc[]): RecordDiff {
  const changedAnswers: AnswerChange[] = [];
  for (const key of Object.keys(answers) as (keyof Answers)[]) {
    if (key in prev.answers && prev.answers[key] !== answers[key]) {
      changedAnswers.push({
        key,
        title: questionTitle(key),
        before: optionLabel(key, prev.answers[key]),
        after: optionLabel(key, answers[key]),
      });
    }
  }

  const prevStatus = new Map(prev.documents.map((d) => [d.id, d.status]));
  const newlyNeeded: DocId[] = [];
  const noLongerNeeded: DocId[] = [];
  for (const doc of docs) {
    const before = prevStatus.get(doc.id);
    if (before === undefined) continue;
    if (!needed(before) && needed(doc.status)) newlyNeeded.push(doc.id);
    if (needed(before) && !needed(doc.status)) noLongerNeeded.push(doc.id);
  }

  return {
    changedAnswers,
    newlyNeeded,
    noLongerNeeded,
    submittedLastTime: prev.documents.filter((d) => d.submitted).map((d) => d.id),
  };
}
