import { useEffect, useMemo, useState } from 'preact/hooks';
import { DEFAULT_ANSWERS, type Answers } from '../lib/answers';
import { deriveConditions, resolveDocuments } from '../lib/documents';
import { diffRecords, toRecord } from '../lib/history';
import { normalizeAnswers } from '../lib/questions';
import { TOKYO_R8, type DocId } from '../lib/rules/tokyo-r8';
import { clearAll, exportJson, load, parseStore, previousRecord, save, upsertRecord, type StoreData } from '../lib/storage';
import Checklist from './Checklist';
import DataMenu from './DataMenu';
import Diff from './Diff';
import Result from './Result';
import Wizard from './Wizard';

type Screen = 'home' | 'wizard' | 'result';

const rules = TOKYO_R8;

export default function Navi() {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<StoreData>({ version: 1, records: [] });
  const [screen, setScreen] = useState<Screen>('home');
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [submitted, setSubmitted] = useState<Partial<Record<DocId, boolean>>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const data = load();
    setStore(data);
    if (data.draft) {
      setAnswers(data.draft.answers);
      setSubmitted(data.draft.submitted);
    }
    setReady(true);
  }, []);

  /** 回答とチェックは、そのたびに下書きとして端末に残す */
  function persist(next: StoreData): boolean {
    setStore(next);
    return save(next);
  }

  function updateDraft(nextAnswers: Answers, nextSubmitted = submitted) {
    setAnswers(nextAnswers);
    setSubmitted(nextSubmitted);
    persist({ ...store, draft: { answers: nextAnswers, submitted: nextSubmitted } });
  }

  const prev = previousRecord(store, rules.fiscalYear);
  const thisYear = store.records.find((r) => r.fiscalYear === rules.fiscalYear);
  const docs = useMemo(() => resolveDocuments(answers, rules), [answers]);
  const conditions = useMemo(() => deriveConditions(answers, rules), [answers]);
  const diff = prev ? diffRecords(prev, answers, docs) : undefined;

  function start(from: Answers) {
    updateDraft(normalizeAnswers(from), {});
    setScreen('wizard');
    setMessage('');
  }

  function saveRecord() {
    const record = toRecord(
      { fiscalYear: rules.fiscalYear, fiscalYearLabel: rules.fiscalYearLabel, rulesId: rules.id },
      answers,
      docs,
      submitted,
    );
    setMessage(persist(upsertRecord(store, record)) ? `${rules.fiscalYearLabel}の記録として保存しました。来年はこの記録と比べられます。` : 'このブラウザでは保存できませんでした。「ファイルに書き出す」で保存してください。');
  }

  function exportFile() {
    const blob = new Blob([exportJson(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanbyo-navi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    try {
      const data = parseStore(await file.text());
      persist(data);
      if (data.draft) {
        setAnswers(data.draft.answers);
        setSubmitted(data.draft.submitted);
      }
      setScreen('home');
      setMessage(`読み込みました（記録 ${data.records.length} 件）。`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込めませんでした。');
    }
  }

  function clearData() {
    if (!confirm('この端末に保存した記録と下書きをすべて消します。よろしいですか？')) return;
    clearAll();
    setStore({ version: 1, records: [] });
    setAnswers(DEFAULT_ANSWERS);
    setSubmitted({});
    setScreen('home');
    setMessage('この端末のデータをすべて消しました。');
  }

  if (!ready) return <p class="muted">読み込み中…</p>;

  return (
    <div class="navi">
      {message && (
        <p class="toast" role="status">
          {message}
        </p>
      )}

      {screen === 'home' && (
        <section class="card home">
          <h2>{rules.fiscalYearLabel}の更新をはじめる</h2>
          <p>質問に答えると、あなたに必要な書類と、その理由がわかります。</p>
          <div class="actions">
            {prev ? (
              <>
                <button class="primary" onClick={() => start(prev.answers)}>
                  前回（{prev.fiscalYearLabel}）の答えから始める
                </button>
                <button onClick={() => start(DEFAULT_ANSWERS)}>最初から答える</button>
              </>
            ) : (
              <button class="primary" onClick={() => start(DEFAULT_ANSWERS)}>
                質問に答える（約2分）
              </button>
            )}
            {store.draft && (
              <button onClick={() => setScreen('result')}>
                {thisYear ? `保存した${rules.fiscalYearLabel}の内容を見る` : '前回の続きから'}
              </button>
            )}
          </div>
          {!prev && (
            <p class="muted small">
              一度記録しておくと、来年は「前回どの書類を出したか」「何が変わったか」から確認できます。
            </p>
          )}
        </section>
      )}

      {screen === 'wizard' && (
        <Wizard
          answers={answers}
          prevAnswers={prev?.answers}
          onChange={(a) => updateDraft(normalizeAnswers(a))}
          onDone={() => setScreen('result')}
          onCancel={() => setScreen('home')}
        />
      )}

      {screen === 'result' && (
        <>
          <Result conditions={conditions} rules={rules} />
          {diff && prev && <Diff diff={diff} prevLabel={prev.fiscalYearLabel} docs={docs} />}
          <Checklist
            docs={docs}
            submitted={submitted}
            submittedLastTime={diff?.submittedLastTime ?? []}
            onToggle={(id, value) => updateDraft(answers, { ...submitted, [id]: value })}
          />
          <section class="card no-print">
            <h2>記録する</h2>
            <p class="small">
              保存するのは「どの条件に当てはまり、どの書類を出したか」だけです。氏名や番号などの中身は保存しません。
            </p>
            <div class="actions">
              <button class="primary" onClick={saveRecord}>
                {rules.fiscalYearLabel}の記録として保存
              </button>
              <button onClick={() => window.print()}>印刷する／PDFで保存</button>
              <button onClick={() => setScreen('wizard')}>答えを直す</button>
            </div>
          </section>
        </>
      )}

      <DataMenu onExport={exportFile} onImport={importFile} onClear={clearData} />
    </div>
  );
}
