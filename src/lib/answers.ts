/** 加入している医療保険の種類 */
export type Insurance =
  | 'employee_insured' // 被用者保険（会社の保険など）の被保険者本人
  | 'employee_dependent' // 被用者保険の被扶養者
  | 'kokuho' // 国民健康保険
  | 'kokuho_kumiai' // 国民健康保険組合
  | 'kouki' // 後期高齢者医療制度
  | 'none'; // 医療保険に加入していない（生活保護のみ）

export type YesNoUnknown = 'yes' | 'no' | 'unknown';

/** 窓口に書類を提出する人 */
export type Submitter = 'self' | 'guardian' | 'legal_rep' | 'proxy';

/** 受給者証の有効期限との関係 */
export type Expiry = 'before' | 'after_within_6m' | 'after_over_6m';

export type Shoman = 'none' | 'self' | 'household' | 'both';

/**
 * ウィザードの回答。どの条件に当てはまるかだけを持ち、
 * 氏名・番号・金額などの書類の中身は一切持たない。
 */
export interface Answers {
  expiry: Expiry;
  under18: boolean;
  submitter: Submitter;
  welfare: boolean;
  /** 町村部に住んでいる、または住所地以外の区市町村で生活保護を受けている */
  welfareOutsideOrTown: boolean;
  insurance: Insurance;
  /** 被扶養者の場合、被保険者が住民税非課税か */
  insuredNonTaxable: YesNoUnknown;
  mynumberLink: boolean;
  nameChanged: boolean;
  /** 同じ医療保険の世帯の人が全員住民税非課税か */
  allNonTaxable: YesNoUnknown;
  /** 上位所得が明らかで、所得書類の省略を承諾する */
  topIncomeConsent: boolean;
  /** 基準日（1月1日）時点で国外に滞在していた人がいる */
  abroadOnBaseDate: boolean;
  shoman: Shoman;
  nanbyoHousehold: boolean;
  keishoKogaku: 'apply' | 'not_eligible' | 'unknown';
  kogakuChoki: YesNoUnknown;
}

export const DEFAULT_ANSWERS: Answers = {
  expiry: 'before',
  under18: false,
  submitter: 'self',
  welfare: false,
  welfareOutsideOrTown: false,
  insurance: 'employee_insured',
  insuredNonTaxable: 'unknown',
  mynumberLink: true,
  nameChanged: false,
  allNonTaxable: 'no',
  topIncomeConsent: false,
  abroadOnBaseDate: false,
  shoman: 'none',
  nanbyoHousehold: false,
  keishoKogaku: 'unknown',
  kogakuChoki: 'no',
};

/** 住民票・保険情報・所得書類を情報連携で省略できるか（氏名変更は情報連携の対象外） */
export function linkCoversResidentDocs(a: Answers): boolean {
  return a.mynumberLink && !a.nameChanged;
}
