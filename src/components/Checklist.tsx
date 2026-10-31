import type { DocStatus, ResolvedDoc } from '../lib/documents';
import type { DocId } from '../lib/rules/tokyo-r8';

interface Props {
  docs: ResolvedDoc[];
  submitted: Partial<Record<DocId, boolean>>;
  submittedLastTime: DocId[];
  onToggle: (id: DocId, value: boolean) => void;
}

const GROUPS: { status: DocStatus; title: string; lead: string }[] = [
  { status: 'required', title: '提出する書類', lead: '窓口（区市町村によっては郵送）で提出します。' },
  { status: 'optional', title: '状況によって必要な書類', lead: '理由を読んで、当てはまるか確認してください。' },
  { status: 'present', title: '窓口で見せる物', lead: '提出はせず、窓口で原本を見せます。' },
];

interface ItemProps {
  doc: ResolvedDoc;
  checked: boolean;
  wasSubmitted: boolean;
  onToggle: (v: boolean) => void;
}

function Item({ doc, checked, wasSubmitted, onToggle }: ItemProps) {
  return (
    <li class={`doc${checked ? ' done' : ''}`}>
      <label class="doc-head">
        <input type="checkbox" checked={checked} onChange={(e) => onToggle((e.currentTarget as HTMLInputElement).checked)} />
        <span class="check" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        </span>
        <span class="doc-no">{doc.no}</span>
        <span class="doc-name">{doc.name}</span>
        {wasSubmitted && <span class="doc-prev">前回も提出</span>}
      </label>
      <div class="doc-body">
        <ul class="reasons">
          {doc.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {doc.notes.length > 0 && (
          <details class="notes">
            <summary>用意するときの注意（案内 {doc.page} ページ）</summary>
            <ul>
              {doc.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}

export default function Checklist({ docs, submitted, submittedLastTime, onToggle }: Props) {
  const needed = docs.filter((d) => d.status !== 'omitted');
  const done = needed.filter((d) => submitted[d.id]).length;
  const omitted = docs.filter((d) => d.status === 'omitted');

  return (
    <section class="section checklist">
      <p class="eyebrow">書類</p>
      <h2 class="section-title">書類チェックリスト</h2>
      <div class="tally" aria-live="polite">
        <span class="tally-num">{done}</span>
        <span class="tally-total">/ {needed.length} 件そろった</span>
      </div>
      <div class="progress tally-bar" aria-hidden="true">
        <div class="progress-bar" style={{ transform: `scaleX(${needed.length ? done / needed.length : 0})` }} />
      </div>

      {GROUPS.map((g) => {
        const items = docs.filter((d) => d.status === g.status);
        if (items.length === 0) return null;
        return (
          <div class="group" key={g.status}>
            <h3 class="group-title">{g.title}</h3>
            <p class="group-lead">{g.lead}</p>
            <ul class="docs">
              {items.map((d) => (
                <Item
                  key={d.id}
                  doc={d}
                  checked={Boolean(submitted[d.id])}
                  wasSubmitted={submittedLastTime.includes(d.id)}
                  onToggle={(v) => onToggle(d.id, v)}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {omitted.length > 0 && (
        <details class="omitted">
          <summary>不要・省略できる書類（{omitted.length}件）</summary>
          <ul>
            {omitted.map((d) => (
              <li key={d.id}>
                <span class="doc-no">{d.no}</span>
                {d.name}
                <span class="omitted-reason">{d.reasons.join(' ')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
