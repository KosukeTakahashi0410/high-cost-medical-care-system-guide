import type { Condition } from '../lib/documents';
import type { Rules } from '../lib/rules/tokyo-r8';

interface Props {
  conditions: Condition[];
  rules: Rules;
}

export default function Result({ conditions, rules }: Props) {
  const isNew = conditions.some((c) => c.id === 'newApplication');
  return (
    <section class="section">
      <h2 class="section-title">あなたに当てはまる条件</h2>
      {isNew && (
        <p class="notice">
          有効期限から6か月を過ぎているため、新規申請の扱いになります。以下は更新の場合の書類なので、必ず区市町村の窓口に確認してください。
        </p>
      )}
      {conditions.length === 0 ? (
        <p class="lead">特別な条件はありません。基本の書類をそろえれば大丈夫です。</p>
      ) : (
        <ul class="rows">
          {conditions.map((c) => (
            <li class="row" key={c.id}>
              <p class="row-term">{c.label}</p>
              <p class="row-detail">{c.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <ol class="flow" aria-label="更新の審査の流れ">
        <li>
          <p class="flow-title">重症度の基準</p>
          <p class="flow-detail">臨床調査個人票で、症状の程度が基準を満たすか</p>
          <p class="flow-result">満たせば認定</p>
        </li>
        <li>
          <p class="flow-title">軽症かつ高額</p>
          <p class="flow-detail">
            満たさなくても、医療費（10割）が{rules.keishoKogakuThreshold.toLocaleString()}円を超えた月が12か月に3か月以上あるか
          </p>
          <p class="flow-result">あれば認定</p>
        </li>
        <li class="end">
          <p class="flow-title">非認定</p>
          <p class="flow-detail">「軽症かつ高額」の書類をそろえれば、再申請できます</p>
          <p class="flow-result">非認定</p>
        </li>
      </ol>
    </section>
  );
}
