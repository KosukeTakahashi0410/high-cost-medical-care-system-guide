import type { Answers } from './answers';

type Key = keyof Answers;

export interface Option<V> {
  value: V;
  label: string;
  /** false を返すと、この選択肢は出さない */
  when?: (a: Answers) => boolean;
}

export interface Question<K extends Key = Key> {
  key: K;
  title: string;
  help?: string;
  options: Option<Answers[K]>[];
  /** false を返すと、この質問は飛ばす */
  when?: (a: Answers) => boolean;
}

const yesNo = (yes: string, no: string): Option<boolean>[] => [
  { value: true, label: yes },
  { value: false, label: no },
];

function q<K extends Key>(question: Question<K>): Question<K> {
  return question;
}

export const QUESTIONS: Question[] = [
  q({
    key: 'expiry',
    title: 'いまお持ちの受給者証の有効期限は？',
    help: '期限の6か月後を過ぎると、更新ではなく新規申請になります。',
    options: [
      { value: 'before', label: 'まだ切れていない' },
      { value: 'after_within_6m', label: '切れてから6か月以内' },
      { value: 'after_over_6m', label: '切れてから6か月を過ぎた' },
    ],
  }),
  q({
    key: 'under18',
    title: '患者さんは18歳未満ですか？',
    options: yesNo('18歳未満', '18歳以上'),
  }),
  q({
    key: 'submitter',
    title: '窓口に書類を出すのは誰ですか？',
    options: [
      { value: 'self', label: '患者本人' },
      { value: 'guardian', label: '保護者', when: (a) => a.under18 },
      { value: 'legal_rep', label: '法定代理人（成年後見人など）' },
      { value: 'proxy', label: 'それ以外の人（家族などに頼む）' },
    ],
  }),
  q({
    key: 'welfare',
    title: '生活保護を受けていますか？',
    options: yesNo('受けている', '受けていない'),
  }),
  q({
    key: 'welfareOutsideOrTown',
    title: '町村部にお住まい、または住んでいる区市町村以外で生活保護を受けていますか？',
    help: '当てはまる場合、生活保護受給証明書はマイナンバー連携で省略できません。',
    options: yesNo('当てはまる', '当てはまらない'),
    when: (a) => a.welfare,
  }),
  q({
    key: 'insurance',
    title: '患者さんが入っている医療保険は？',
    help: '資格確認書やマイナポータルで確認できます。会社の保険＝健康保険組合・協会けんぽ・共済組合など。',
    options: [
      { value: 'employee_insured', label: '会社の保険（自分が被保険者）' },
      { value: 'employee_dependent', label: '会社の保険（家族の扶養に入っている）' },
      { value: 'kokuho', label: '国民健康保険' },
      { value: 'kokuho_kumiai', label: '国民健康保険組合' },
      { value: 'kouki', label: '後期高齢者医療制度' },
      { value: 'none', label: '加入していない（生活保護）', when: (a) => a.welfare },
    ],
  }),
  q({
    key: 'insuredNonTaxable',
    title: '扶養してくれている人（被保険者）は住民税が非課税ですか？',
    help: '非課税の場合は、患者さん本人の所得の書類も必要になります。',
    options: [
      { value: 'no', label: '課税されている' },
      { value: 'yes', label: '非課税' },
      { value: 'unknown', label: 'わからない' },
    ],
    when: (a) => a.insurance === 'employee_dependent',
  }),
  q({
    key: 'mynumberLink',
    title: 'マイナンバーを使って書類を省略しますか？（情報連携）',
    help: '「個人番号に係る調書」にマイナンバーを書くと、住民票・保険情報の写し・所得の書類を出さずに済みます。',
    options: yesNo('省略する（おすすめ）', '省略しない（書類を自分で集める）'),
  }),
  q({
    key: 'nameChanged',
    title: '前回の申請から氏名が変わりましたか？',
    help: '氏名変更は情報連携の対象外のため、住民票などを省略できません。',
    options: yesNo('変わった', '変わっていない'),
  }),
  q({
    key: 'allNonTaxable',
    title: '患者さんと同じ医療保険の世帯の人は、全員が住民税非課税ですか？',
    help: '全員非課税なら「公的年金等の収入等に係る申出書」が必要です。',
    options: [
      { value: 'no', label: '課税されている人がいる' },
      { value: 'yes', label: '全員非課税' },
      { value: 'unknown', label: 'わからない' },
    ],
    when: (a) => !a.welfare,
  }),
  q({
    key: 'topIncomeConsent',
    title: '住民税の所得割が25.1万円以上で「上位所得」になるのが明らかですか？',
    help: '明らかな場合は、窓口で申し出れば所得の書類を省略できます（上位所得の区分で認定されます）。',
    options: yesNo('明らかなので省略したい', '当てはまらない／わからない'),
    when: (a) => !a.welfare && a.insurance !== 'none' && !(a.mynumberLink && !a.nameChanged),
  }),
  q({
    key: 'abroadOnBaseDate',
    title: '今年の1月1日時点で、国外に住んでいた人はいますか？',
    help: '患者さん、または同じ医療保険の世帯で所得を確認される人が対象です。',
    options: yesNo('いる', 'いない'),
  }),
  q({
    key: 'shoman',
    title: '小児慢性特定疾病の医療費助成を受けている人はいますか？',
    options: [
      { value: 'none', label: 'いない' },
      { value: 'self', label: '患者本人' },
      { value: 'household', label: '同じ医療保険の世帯の人' },
      { value: 'both', label: '本人と世帯の人の両方' },
    ],
  }),
  q({
    key: 'nanbyoHousehold',
    title: '同じ医療保険の世帯に、ほかにも難病の医療費助成を受けている人はいますか？',
    options: yesNo('いる', 'いない'),
  }),
  q({
    key: 'medicalCost',
    title: '過去12か月で、この難病の医療費（10割）が多かった月はどれくらいありますか？',
    help:
      'オレンジ色の「自己負担上限額管理票」で確認できます。窓口で払った額にすると、33,330円は2割負担で6,670円・1割負担で3,330円、50,000円は2割負担で10,000円・1割負担で5,000円です。',
    options: [
      { value: 'long_high', label: '50,000円を超えた月が6か月以上' },
      { value: 'mild_high', label: '33,330円を超えた月が3か月以上' },
      { value: 'none', label: 'どちらもない' },
      { value: 'unknown', label: 'わからない' },
    ],
  }),
];

export function visibleQuestions(a: Answers): Question[] {
  return QUESTIONS.filter((question) => !question.when || question.when(a));
}

export function visibleOptions<K extends Key>(question: Question<K>, a: Answers): Option<Answers[K]>[] {
  return question.options.filter((o) => !o.when || o.when(a));
}

/** 前の回答が変わって選べなくなった選択肢を、最初の選択肢に戻す */
export function normalizeAnswers(a: Answers): Answers {
  const next = { ...a };
  for (const question of QUESTIONS) {
    const options = visibleOptions(question, next);
    if (!options.some((o) => o.value === next[question.key])) {
      (next as Record<Key, unknown>)[question.key] = options[0].value;
    }
  }
  return next;
}

export function optionLabel(key: Key, value: unknown): string {
  const question = QUESTIONS.find((x) => x.key === key);
  return question?.options.find((o) => o.value === value)?.label ?? String(value);
}

export function questionTitle(key: Key): string {
  return QUESTIONS.find((x) => x.key === key)?.title ?? key;
}
