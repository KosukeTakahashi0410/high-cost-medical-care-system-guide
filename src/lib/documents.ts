import { linkCoversResidentDocs, meetsKeishoKogaku, meetsKogakuChoki, type Answers } from './answers';
import type { DocDef, DocId, Rules } from './rules/tokyo-r8';

/**
 * required: 提出が必要 / present: 窓口で見せる / optional: 状況によって必要（要確認）/ omitted: 不要・省略できる
 */
export type DocStatus = 'required' | 'present' | 'optional' | 'omitted';

export interface ResolvedDoc extends DocDef {
  status: DocStatus;
  /** なぜこの状態になったか */
  reasons: string[];
  /** 用意するときの注意点 */
  notes: string[];
}

interface Resolution {
  status: DocStatus;
  reasons: string[];
  notes?: string[];
}

const isEmployee = (a: Answers) => a.insurance === 'employee_insured' || a.insurance === 'employee_dependent';
const isKokuho = (a: Answers) => a.insurance === 'kokuho' || a.insurance === 'kokuho_kumiai';

/** 「個人番号に係る調書」に誰のマイナンバーを書くか */
function mynumberTargets(a: Answers): string {
  if (!linkCoversResidentDocs(a) || (a.welfare && !isEmployee(a))) {
    return a.under18 ? '患者本人と保護者' : '患者本人';
  }
  const guardian = a.under18 ? '・保護者' : '';
  if (isEmployee(a)) return `患者本人${guardian}と、保険情報に「被保険者」と書かれている人`;
  if (a.insurance === 'kokuho') return `患者本人${guardian}と、住民票上同じ世帯で同じ国民健康保険に入っている人全員`;
  if (a.insurance === 'kokuho_kumiai') return `患者本人${guardian}と、同じ国保組合に入っている医療保険上の同一世帯の人全員（住民票が別でも）`;
  return `患者本人${guardian}と、住民票上同じ世帯で同じ後期高齢者医療制度に入っている人全員`;
}

function resolve(id: DocId, a: Answers, rules: Rules): Resolution {
  const linked = linkCoversResidentDocs(a);
  const nameChangeBlocks = a.mynumberLink && a.nameChanged;

  switch (id) {
    case 'application': {
      const notes = [
        '申請書提出日は、書いた日ではなく窓口に出す日を書く（間違えると負担上限額で不利になることがある）',
        '印字されている内容が変わっていたら、二重線で訂正する',
      ];
      if (a.under18) notes.push('「申請者（医療券の送付先）」欄は、調書の「保護者」欄と同じ人にする');
      if (a.medicalCost === 'none') notes.push('「軽症かつ高額」に該当しない欄に☑を入れる（非認定の場合に通知が早く届き、再申請しやすくなる）');
      if (meetsKogakuChoki(a)) notes.push('左下の「高額かつ長期」の□に☑を入れる');
      if (a.expiry === 'after_within_6m') notes.push('有効期限を過ぎているので、「特定医療費の支給を開始することが適当と考えられる年月日」欄に記入する');
      return { status: 'required', reasons: ['全員が提出します（同封の書類）'], notes };
    }

    case 'rinsho':
      return {
        status: 'required',
        reasons: ['全員が提出します（同封の書類）'],
        notes: [
          '指定医（難病指定医または協力難病指定医）に書いてもらう',
          '原本を提出する。有効期間は記載日から6か月',
          '最初のページの基本情報（氏名・住所など）も医療機関に書いてもらう',
          '最後のページに医療機関名・医師名・指定医番号・記載年月日・診断年月日があるか確認する',
        ],
      };

    case 'mynumberSheet': {
      const notes = [
        `マイナンバーを書く人：${mynumberTargets(a)}`,
        `${rules.baseDateLabel}時点で今と違う区市町村に住んでいた人は、「課税等区市町村等」欄にその区市町村名を書く`,
      ];
      if (a.under18) notes.push('「保護者」欄を必ず書く');
      if (a.abroadOnBaseDate) notes.push('国外にいた人も含めて、必要な人全員の分を書く');
      if (a.mynumberLink) {
        return {
          status: 'required',
          reasons: ['マイナンバーの情報連携を希望するので提出します'],
          notes,
        };
      }
      return {
        status: 'optional',
        reasons: ['原則は全員が提出する書類ですが、情報連携を希望しない場合は出さなくても更新できます'],
        notes,
      };
    }

    case 'juminhyo': {
      if (a.welfare) return { status: 'omitted', reasons: ['生活保護を受けているので省略できます'] };
      if (linked) return { status: 'omitted', reasons: ['マイナンバーの情報連携で省略できます'] };
      return {
        status: 'required',
        reasons: [nameChangeBlocks ? '氏名変更は情報連携の対象外なので省略できません' : '情報連携をしないので提出します'],
        notes: [
          '発行から3か月以内のもの',
          '患者（または保護者）と同じ世帯の人全員が載っていて、続柄があるもの',
          'マイナンバーが載っていないもの',
          '住所・氏名が変わったときは、更新とは別に変更届も必要',
        ],
      };
    }

    case 'insuranceCopy': {
      if (a.insurance === 'none') return { status: 'omitted', reasons: ['医療保険に加入していないので不要です'] };
      if (linked) return { status: 'omitted', reasons: ['マイナンバーの情報連携で省略できます'] };
      const reason = nameChangeBlocks ? '氏名変更は情報連携の対象外なので省略できません' : '医療保険に加入している人は提出します';
      const notes = ['資格確認書、またはマイナポータルから印刷したもの（記号・番号・枝番、氏名、生年月日、保険者名などがすべて載っているもの）'];
      if (isEmployee(a)) {
        notes.push('誰の分：患者本人', '患者本人の現住所が書かれた部分も添える');
        if (a.insurance === 'employee_dependent') notes.push('患者本人の分で被保険者がわからない場合は、被保険者の分も');
      } else if (isKokuho(a)) {
        notes.push('誰の分：患者本人と、同じ記号・番号の人全員');
        if (a.insurance === 'kokuho_kumiai') notes.push('国保組合では同じ保険でも記号・番号が違うことがあり、違う人の分は不要');
      } else {
        notes.push('誰の分：患者本人と、住民票上同じ世帯で同じ保険に入っている人全員');
      }
      return { status: 'required', reasons: [reason], notes };
    }

    case 'incomeProof': {
      if (a.insurance === 'none') return { status: 'omitted', reasons: ['生活保護で医療保険に加入していないので不要です'] };
      if (linked) return { status: 'omitted', reasons: ['マイナンバーの情報連携で省略できます'] };
      if (a.topIncomeConsent) {
        return {
          status: 'omitted',
          reasons: ['上位所得が明らかなので省略できます'],
          notes: ['窓口でその旨を申し出る（「上位所得」の区分で認定されます）'],
        };
      }
      const notes = [
        `次のどれか1つ（${rules.incomeYearLabel}）：住民税課税（非課税）証明書／給与所得等に係る特別徴収税額決定通知書の写し／住民税の税額決定通知書の写し（普通徴収の人）`,
      ];
      if (isEmployee(a)) {
        notes.push('誰の分：被保険者');
        if (a.insurance === 'employee_dependent') {
          if (a.insuredNonTaxable === 'yes') notes.push('被保険者が非課税なので、患者本人の分も');
          if (a.insuredNonTaxable === 'unknown') notes.push('被保険者が非課税なら、患者本人の分も必要');
        }
      } else if (isKokuho(a)) {
        notes.push('誰の分：患者本人と、同じ記号・番号の人全員', `${rules.baseDateLabel}時点で義務教育を終えていない子の分は不要`);
      } else {
        notes.push('誰の分：患者本人と、住民票上同じ世帯で同じ保険に入っている人全員');
      }
      if (a.allNonTaxable !== 'no') {
        notes.push('世帯全員が非課税で税の申告義務がない場合、「低所得Ⅰ」を希望するなら税の申告と非課税証明書が必要（しないなら「低所得Ⅱ」）');
      }
      return {
        status: 'required',
        reasons: [nameChangeBlocks ? '氏名変更は情報連携の対象外なので省略できません' : '情報連携をしないので提出します'],
        notes,
      };
    }

    case 'pensionDeclaration': {
      if (a.welfare) return { status: 'omitted', reasons: ['生活保護を受けているので不要です'] };
      const notes = [
        '1・2・3のどれか1つだけに☑を入れる（複数だと再提出になることがある）',
        `2に☑を入れた場合は、受給している年金等にも☑を入れ、${rules.pensionPeriodLabel}の受給額がわかる書類を添える`,
        a.under18 ? '一番下の氏名欄は保護者の名前' : '一番下の氏名欄は患者本人の名前',
      ];
      const reasons: string[] = [];
      if (linked) reasons.push('情報連携で所得の書類を省略する人は提出します');
      if (a.allNonTaxable === 'yes') reasons.push('世帯全員が住民税非課税なので提出します（本人の年収が82万6,500円以下かどうかで上限額が変わります）');
      if (reasons.length > 0) return { status: 'required', reasons, notes };
      if (a.allNonTaxable === 'unknown') {
        return { status: 'optional', reasons: ['世帯全員が住民税非課税なら提出します'], notes };
      }
      return { status: 'omitted', reasons: ['情報連携をせず、課税されている人がいるので不要です'] };
    }

    case 'welfareCert': {
      if (!a.welfare) return { status: 'omitted', reasons: ['生活保護を受けていないので不要です'] };
      if (a.welfareOutsideOrTown) {
        return { status: 'required', reasons: ['町村部にお住まい、または住所地以外で生活保護を受けているので、情報連携でも省略できません'] };
      }
      if (a.mynumberLink) return { status: 'omitted', reasons: ['マイナンバーの情報連携で省略できます'] };
      return { status: 'required', reasons: ['生活保護を受けているので提出します'] };
    }

    case 'medicalCostProof': {
      const notes = [
        '自己負担上限額管理票（オレンジ色のA5冊子）の、基準額を超えた月の写しを、同封の「コピー添付用紙」の後ろにホチキス留めする',
        '管理票に載っていない月は、療養証明書（医療機関に記入を依頼。費用は自己負担）か、医療費申告書と領収書等の写しで代わりにできる',
      ];
      if (meetsKogakuChoki(a)) {
        notes.push('今の受給者証の期間中から「高額かつ長期」を適用したい場合は、更新とは別に変更申請が必要（出した翌月から適用）');
        return {
          status: 'required',
          reasons: [
            `「高額かつ長期」を申請するので提出します（${rules.kogakuChokiThreshold.toLocaleString()}円を超えた月を6か月分以上）。「軽症かつ高額」の確認にも使われます`,
          ],
          notes,
        };
      }
      if (meetsKeishoKogaku(a)) {
        return {
          status: 'required',
          reasons: [`「軽症かつ高額」の確認に使うので提出します（${rules.keishoKogakuThreshold.toLocaleString()}円を超えた月を3か月分以上）`],
          notes,
        };
      }
      if (a.medicalCost === 'unknown') {
        return {
          status: 'optional',
          reasons: ['医療費が基準を超えた月があるかを管理票で確認してください。「軽症かつ高額」は認定されるかどうかに関わります'],
          notes,
        };
      }
      return { status: 'omitted', reasons: ['医療費が基準を超えた月がないので不要です'] };
    }

    case 'shomanCert': {
      if (a.shoman === 'none') return { status: 'omitted', reasons: ['小児慢性特定疾病の助成を受けている人がいないので不要です'] };
      const notes = ['申請日時点で有効なもの'];
      if (a.shoman !== 'self') notes.push('世帯の人の分は、その人の医療保険情報の写しも一緒に出す');
      return { status: 'required', reasons: ['小児慢性特定疾病の助成を受けている人がいるので提出します'], notes };
    }

    case 'householdNanbyoCert':
      if (!a.nanbyoHousehold) return { status: 'omitted', reasons: ['同じ医療保険の世帯に難病の受給者がいないので不要です'] };
      return {
        status: 'required',
        reasons: ['同じ医療保険の世帯に難病の受給者がいるので提出します'],
        notes: ['申請日時点で有効なもの', 'その人の医療保険情報の写しも一緒に出す'],
      };

    case 'proxyLetter':
      if (a.submitter !== 'proxy') return { status: 'omitted', reasons: ['本人・保護者・法定代理人が出すので不要です'] };
      return {
        status: a.mynumberLink ? 'required' : 'optional',
        reasons: [
          a.mynumberLink
            ? '本人以外の人が「個人番号に係る調書」を出すので提出します'
            : '本人以外の人が出します。「個人番号に係る調書」を出す場合は必要です',
        ],
        notes: ['委任者：患者本人（18歳未満なら保護者）、受任者：実際に窓口に行く人（同封の書類）'],
      };

    case 'identityCheck':
      if (!a.mynumberLink) {
        return { status: 'optional', reasons: ['「個人番号に係る調書」を出す場合は、窓口に行く人の身元確認が必要です'] };
      }
      return {
        status: 'present',
        reasons: ['マイナンバーを提出するので、窓口に行く人の身元確認が必要です'],
        notes: [
          '原本を見せる（コピー不可）',
          '顔写真つきのもの1つ：マイナンバーカード、運転免許証、パスポート、在留カード、障害者手帳など',
          'ない場合は2つ：申請者が印字された申請書、受給者証、年金手帳など',
        ],
      };

    case 'mynumberCheck':
      if (!a.mynumberLink) {
        return { status: 'optional', reasons: ['「個人番号に係る調書」を出す場合は、マイナンバーの確認が必要です'] };
      }
      return {
        status: 'present',
        reasons: [`${a.under18 ? '保護者' : '患者本人'}のマイナンバーを確認するために見せます`],
        notes: ['次のどれか1つ：マイナンバーカード／通知カード（住所・氏名が令和2年5月25日以降に変わった人は使えない）／マイナンバー入りの住民票の写し'],
      };

    case 'legalRepProof':
      if (a.submitter !== 'legal_rep') return { status: 'omitted', reasons: ['法定代理人が出すわけではないので不要です'] };
      return {
        status: 'present',
        reasons: ['法定代理人が出すので見せます'],
        notes: ['次のどれか1つ：戸籍謄本／後見に関する登記事項証明書／裁判所が決定したことがわかる書類'],
      };

    case 'abroadProof':
      if (!a.abroadOnBaseDate) return { status: 'omitted', reasons: [`${rules.baseDateLabel}時点で国外にいた人がいないので不要です`] };
      return {
        status: 'required',
        reasons: [`${rules.baseDateLabel}時点で国外にいた人がいるので提出します（ないと「上位所得」で計算されます）`],
        notes: [
          '次のどれか1つ：滞在していた国名が載った戸籍の附票／国外に駐在していたことを示す会社の証明書／（外国籍の人）在留カードのコピー',
        ],
      };
  }
}

export function resolveDocuments(a: Answers, rules: Rules): ResolvedDoc[] {
  return rules.documents.map((def) => {
    const r = resolve(def.id, a, rules);
    return { ...def, status: r.status, reasons: r.reasons, notes: r.notes ?? [] };
  });
}

export interface Condition {
  id: string;
  label: string;
  detail: string;
}

/** 回答から「あなたに当てはまる条件」を求める */
export function deriveConditions(a: Answers, rules: Rules): Condition[] {
  const list: Condition[] = [];
  if (a.expiry === 'after_over_6m') {
    list.push({ id: 'newApplication', label: '新規申請の扱い', detail: '有効期限から6か月を過ぎているので、更新ではなく新規申請になります。必要な書類が変わるので、区市町村の窓口に確認してください。' });
  } else if (a.expiry === 'after_within_6m') {
    list.push({ id: 'lateRenewal', label: '期限切れ後の更新', detail: '更新はできます。新しい受給者証が届くまでは医療費をいったん立て替え、あとで払い戻しを請求します。' });
  }
  if (linkCoversResidentDocs(a)) {
    list.push({ id: 'mynumberLink', label: 'マイナンバーの情報連携', detail: '住民票・保険情報の写し・所得の書類を省略できます。代わりに、調書へ必要な人全員のマイナンバーを書きます。' });
  } else if (a.mynumberLink && a.nameChanged) {
    list.push({ id: 'nameChanged', label: '氏名変更あり', detail: '氏名変更は情報連携の対象外なので、住民票・保険情報・所得の書類は省略できません。' });
  }
  if (a.welfare) list.push({ id: 'welfare', label: '生活保護', detail: '負担上限月額は0円です。所得の書類などが不要になります。' });
  if (!a.welfare && a.allNonTaxable === 'yes') {
    list.push({ id: 'nonTaxable', label: '世帯全員が住民税非課税', detail: '本人の年収が82万6,500円以下なら「低所得Ⅰ」（上限2,500円）、超えるなら「低所得Ⅱ」（上限5,000円）です。' });
  }
  if (meetsKeishoKogaku(a)) {
    list.push({ id: 'keishoKogaku', label: '軽症かつ高額', detail: `医療費が${rules.keishoKogakuThreshold.toLocaleString()}円を超えた月が12か月に3か月以上あるので、症状が重症度の基準を満たさなくても認定されます。` });
  } else if (a.medicalCost === 'unknown') {
    list.push({ id: 'medicalCostUnknown', label: '医療費の確認が必要', detail: '症状が落ち着いている人は、「軽症かつ高額」を満たすかどうかで認定・非認定が分かれます。管理票を確認しましょう。' });
  }
  if (meetsKogakuChoki(a)) {
    list.push({ id: 'kogakuChoki', label: '高額かつ長期', detail: '所得区分が一般所得Ⅰ・Ⅱ・上位所得の人は、負担上限月額が下がります（例：一般所得Ⅱは20,000円→10,000円）。' });
  }
  if (a.submitter === 'proxy') list.push({ id: 'proxy', label: '代理人が提出', detail: '委任状が必要です。' });
  if (a.under18) list.push({ id: 'under18', label: '患者が18歳未満', detail: '保護者が申請者になり、調書の「保護者」欄が必須です。' });
  return list;
}
