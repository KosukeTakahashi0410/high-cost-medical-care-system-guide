import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
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
import { scrollToElement } from './scroll';

type Screen = 'home' | 'wizard' | 'result';

const rules = TOKYO_R8;

/** 画面の切り替えを View Transitions で包む（未対応のブラウザではそのまま切り替える） */
function transition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

export default function Navi() {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<StoreData>({ version: 1, records: [] });
  const [screen, setScreen] = useState<Screen>('home');
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [submitted, setSubmitted] = useState<Partial<Record<DocId, boolean>>>({});
  const [message, setMessage] = useState('');
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = load();
    setStore(data);
    if (data.draft) {
      setAnswers(data.draft.answers);
      setSubmitted(data.draft.submitted);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  function go(next: Screen) {
    transition(() => setScreen(next));
  }

  // 画面が切り替わったら、ツールの先頭までスクロールする（最初の表示では動かさない）
  const firstScreen = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    scrollToElement(top.current);
  }, [screen, ready]);

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
    go('wizard');
  }

  function saveRecord() {
    const record = toRecord(
      { fiscalYear: rules.fiscalYear, fiscalYearLabel: rules.fiscalYearLabel, rulesId: rules.id },
      answers,
      docs,
      submitted,
    );
    setMessage(
      persist(upsertRecord(store, record))
        ? `${rules.fiscalYearLabel}の記録として保存しました`
        : '保存できませんでした。「ファイルに書き出す」をお使いください',
    );
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
      go('home');
      setMessage(`読み込みました（記録 ${data.records.length} 件）`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込めませんでした');
    }
  }

  function clearData() {
    if (!confirm('この端末に保存した記録と下書きをすべて消します。よろしいですか？')) return;
    clearAll();
    setStore({ version: 1, records: [] });
    setAnswers(DEFAULT_ANSWERS);
    setSubmitted({});
    go('home');
    setMessage('この端末のデータをすべて消しました');
  }

  if (!ready) return <p class="muted">読み込み中…</p>;

  return (
    <div ref={top} class="navi">
      {message && (
        <p class="toast" role="status" key={message}>
          {message}
        </p>
      )}

      {screen === 'home' && (
        <section class="section screen-in">
          <div>
            <h2 class="section-title">{rules.fiscalYearLabel}の更新をはじめる</h2>
            <p class="lead">
              {prev
                ? `前回（${prev.fiscalYearLabel}）の記録があります。前回の答えを確かめながら進めると、変わった点だけを確認できます。`
                : '約2分で答えられます。記録しておくと、来年は前回との違いから確認できます。'}
            </p>
          </div>
          <div class="actions">
            {prev ? (
              <>
                <button class="btn btn-primary" onClick={() => start(prev.answers)}>
                  前回の答えから始める
                </button>
                <button class="btn" onClick={() => start(DEFAULT_ANSWERS)}>
                  最初から答える
                </button>
              </>
            ) : (
              <button class="btn btn-primary" onClick={() => start(DEFAULT_ANSWERS)}>
                質問に答える
              </button>
            )}
            {store.draft && (
              <button class="btn-text" onClick={() => go('result')}>
                {thisYear ? `保存した${rules.fiscalYearLabel}の内容を見る` : '前回の続きを見る'}
              </button>
            )}
          </div>
        </section>
      )}

      {screen === 'wizard' && (
        <Wizard
          answers={answers}
          prevAnswers={prev?.answers}
          onChange={(a) => updateDraft(normalizeAnswers(a))}
          onDone={() => go('result')}
          onCancel={() => go('home')}
        />
      )}

      {screen === 'result' && (
        <div class="screen-in">
          <Result conditions={conditions} rules={rules} />
          {diff && prev && <Diff diff={diff} prevLabel={prev.fiscalYearLabel} docs={docs} />}
          <Checklist
            docs={docs}
            submitted={submitted}
            submittedLastTime={diff?.submittedLastTime ?? []}
            onToggle={(id, value) => updateDraft(answers, { ...submitted, [id]: value })}
          />
          <section class="section no-print">
            <h2 class="section-title">来年のために残す</h2>
            <p class="lead">
              質問への答えと書類のチェック状況を、この端末に保存します。保存されるデータに、個人を特定できる情報は含まれません。
            </p>
            <div class="actions">
              <button class="btn btn-primary" onClick={saveRecord}>
                {rules.fiscalYearLabel}の記録として保存
              </button>
              <button class="btn" onClick={() => window.print()}>
                印刷・PDFで保存
              </button>
              <button class="btn-text" onClick={() => go('wizard')}>
                答えを直す
              </button>
            </div>
          </section>
        </div>
      )}

      <DataMenu onExport={exportFile} onImport={importFile} onClear={clearData} />
    </div>
  );
}
