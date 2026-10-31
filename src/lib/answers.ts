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
 * 過去12か月の医療費等総額（10割）。
 * long_high: 50,000円超が6か月以上（高額かつ長期。軽症かつ高額の基準も満たす）
 * mild_high: 33,330円超が3か月以上（軽症かつ高額）
 */
export type MedicalCost = 'long_high' | 'mild_high' | 'none' | 'unknown';

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
  medicalCost: MedicalCost;
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
  medicalCost: 'unknown',
};

/** 住民票・保険情報・所得書類を情報連携で省略できるか（氏名変更は情報連携の対象外） */
export function linkCoversResidentDocs(a: Answers): boolean {
  return a.mynumberLink && !a.nameChanged;
}

/** 軽症かつ高額の基準（33,330円超が3か月以上）を満たす */
export const meetsKeishoKogaku = (a: Answers) => a.medicalCost === 'long_high' || a.medicalCost === 'mild_high';

/** 高額かつ長期の基準（50,000円超が6か月以上）を満たす */
export const meetsKogakuChoki = (a: Answers) => a.medicalCost === 'long_high';
