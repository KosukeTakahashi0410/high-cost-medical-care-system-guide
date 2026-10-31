import type { ResolvedDoc } from '../lib/documents';
import type { RecordDiff } from '../lib/history';
import type { DocId } from '../lib/rules/tokyo-r8';

interface Props {
  diff: RecordDiff;
  prevLabel: string;
  docs: ResolvedDoc[];
}

export default function Diff({ diff, prevLabel, docs }: Props) {
  const name = (id: DocId) => {
    const d = docs.find((x) => x.id === id);
    return d ? `${d.no} ${d.name}` : id;
  };
  const nothingChanged = diff.changedAnswers.length === 0 && diff.newlyNeeded.length === 0 && diff.noLongerNeeded.length === 0;

  return (
    <section class="section diff">
      <h2 class="section-title">前回（{prevLabel}）との違い</h2>
      {nothingChanged ? (
        <p class="lead">条件も必要な書類も前回と同じです。前回と同じ書類をそろえれば大丈夫です。</p>
      ) : (
        <div class="rows-wrap">
          {diff.changedAnswers.length > 0 && (
            <div class="diff-group">
              <p class="diff-label">変わった条件</p>
              <ul class="diff-list">
                {diff.changedAnswers.map((c) => (
                  <li key={c.key}>
                    <span class="diff-sign" aria-hidden="true">
                      ・
                    </span>
                    <span>
                      {c.title}
                      <br />
                      <span class="diff-before">{c.before}</span> → {c.after}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diff.newlyNeeded.length > 0 && (
            <div class="diff-group">
              <p class="diff-label">今回から新しく必要</p>
              <ul class="diff-list">
                {diff.newlyNeeded.map((id) => (
                  <li key={id}>
                    <span class="diff-sign plus" aria-hidden="true">
                      ＋
                    </span>
                    {name(id)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diff.noLongerNeeded.length > 0 && (
            <div class="diff-group">
              <p class="diff-label">今回は不要になった</p>
              <ul class="diff-list">
                {diff.noLongerNeeded.map((id) => (
                  <li key={id}>
                    <span class="diff-sign minus" aria-hidden="true">
                      －
                    </span>
                    {name(id)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {diff.submittedLastTime.length > 0 && (
        <details class="omitted">
          <summary>前回提出した書類（{diff.submittedLastTime.length}件）</summary>
          <ul>
            {diff.submittedLastTime.map((id) => (
              <li key={id}>{name(id)}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
