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
    <section class="card diff">
      <h2>前回（{prevLabel}）との違い</h2>
      {nothingChanged ? (
        <p>条件も必要な書類も前回と同じです。前回と同じ書類をそろえれば大丈夫です。</p>
      ) : (
        <>
          {diff.changedAnswers.length > 0 && (
            <>
              <h3>変わった条件</h3>
              <ul>
                {diff.changedAnswers.map((c) => (
                  <li key={c.key}>
                    {c.title}：<s>{c.before}</s> → <strong>{c.after}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          {diff.newlyNeeded.length > 0 && (
            <>
              <h3>今回から新しく必要</h3>
              <ul class="plus">
                {diff.newlyNeeded.map((id) => (
                  <li key={id}>{name(id)}</li>
                ))}
              </ul>
            </>
          )}
          {diff.noLongerNeeded.length > 0 && (
            <>
              <h3>今回は不要になった</h3>
              <ul class="minus">
                {diff.noLongerNeeded.map((id) => (
                  <li key={id}>{name(id)}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {diff.submittedLastTime.length > 0 && (
        <details>
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
