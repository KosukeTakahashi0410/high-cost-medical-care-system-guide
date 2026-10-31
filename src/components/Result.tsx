import type { Condition } from '../lib/documents';
import type { Rules } from '../lib/rules/tokyo-r8';

interface Props {
  conditions: Condition[];
  rules: Rules;
}

export default function Result({ conditions, rules }: Props) {
  const isNew = conditions.some((c) => c.id === 'newApplication');
  return (
    <section class="card">
      <h2>あなたに当てはまる条件</h2>
      {isNew && (
        <p class="alert">
          有効期限から6か月を過ぎているため、新規申請の扱いになります。以下は更新の場合の書類なので、必ず区市町村の窓口に確認してください。
        </p>
      )}
      {conditions.length === 0 ? (
        <p>特別な条件はありません。基本の書類をそろえれば大丈夫です。</p>
      ) : (
        <ul class="conditions">
          {conditions.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong>
              <span>{c.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <h3>更新の審査の流れ</h3>
      <ol class="flow" aria-label="審査の流れ">
        <li>
          <strong>① 重症度の基準</strong>
          <span>臨床調査個人票で、症状の程度が基準を満たすか</span>
          <em class="ok">満たす → 認定</em>
        </li>
        <li>
          <strong>② 軽症かつ高額</strong>
          <span>
            満たさなくても、医療費（10割）が{rules.keishoKogakuThreshold.toLocaleString()}円を超えた月が12か月に3か月以上
          </span>
          <em class="ok">満たす → 認定</em>
        </li>
        <li>
          <strong>どちらも満たさない</strong>
          <span>非認定。軽症かつ高額の書類をそろえて再申請できます</span>
          <em class="ng">非認定</em>
        </li>
      </ol>
    </section>
  );
}
