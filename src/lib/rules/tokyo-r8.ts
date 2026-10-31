/**
 * 東京都 特定医療費（指定難病）更新手続のご案内 令和8年度版（v4.00）をもとにしたデータ。
 * 年度が変わったら、このファイルを複製して値を更新する。
 */

export type DocId =
  | 'application'
  | 'rinsho'
  | 'mynumberSheet'
  | 'juminhyo'
  | 'insuranceCopy'
  | 'incomeProof'
  | 'pensionDeclaration'
  | 'welfareCert'
  | 'medicalCostProof'
  | 'shomanCert'
  | 'householdNanbyoCert'
  | 'proxyLetter'
  | 'identityCheck'
  | 'mynumberCheck'
  | 'legalRepProof'
  | 'abroadProof';

export interface DocDef {
  id: DocId;
  /** 案内PDFでの番号（①など） */
  no: string;
  name: string;
  /** submit: 提出する書類 / present: 窓口で見せる物 */
  kind: 'submit' | 'present';
  /** 案内PDFのページ */
  page: string;
}

export interface Rules {
  id: string;
  prefecture: string;
  fiscalYear: number;
  fiscalYearLabel: string;
  /** 所得・国外滞在の基準日 */
  baseDateLabel: string;
  /** 所得書類の年度 */
  incomeYearLabel: string;
  /** 公的年金等の収入の対象期間 */
  pensionPeriodLabel: string;
  keishoKogakuThreshold: number;
  kogakuChokiThreshold: number;
  sourceUrl: string;
  portalUrl: string;
  checkedAt: string;
  documents: DocDef[];
}

export const TOKYO_R8: Rules = {
  id: 'tokyo-r8',
  prefecture: '東京都',
  fiscalYear: 2026,
  fiscalYearLabel: '令和8年度',
  baseDateLabel: '令和8年1月1日',
  incomeYearLabel: '令和8年度分',
  pensionPeriodLabel: '令和7年1月〜12月',
  keishoKogakuThreshold: 33330,
  kogakuChokiThreshold: 50000,
  sourceUrl: 'https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/r0812nanbyou_koushin',
  portalUrl: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/nanbyo/portal/seido/shinsei.html',
  checkedAt: '2026-10-31',
  documents: [
    { id: 'application', no: '①', name: '特定医療費支給認定申請書', kind: 'submit', page: '4〜5' },
    { id: 'rinsho', no: '②', name: '臨床調査個人票', kind: 'submit', page: '6' },
    { id: 'mynumberSheet', no: '③', name: '個人番号に係る調書', kind: 'submit', page: '6〜9' },
    { id: 'juminhyo', no: '④', name: '住民票', kind: 'submit', page: '10' },
    { id: 'insuranceCopy', no: '⑤', name: '医療保険情報に関する写し', kind: 'submit', page: '10〜11' },
    { id: 'incomeProof', no: '⑥', name: '世帯の所得を確認するための書類', kind: 'submit', page: '11〜13' },
    { id: 'pensionDeclaration', no: '⑦', name: '公的年金等の収入等に係る申出書', kind: 'submit', page: '13〜15' },
    { id: 'welfareCert', no: '⑧', name: '生活保護受給証明書', kind: 'submit', page: '16' },
    { id: 'medicalCostProof', no: '⑨', name: '指定難病に係る医療費等の総額が確認できる書類', kind: 'submit', page: '16, 18〜21' },
    { id: 'shomanCert', no: '⑩', name: '小児慢性特定疾病医療受給者証の写し', kind: 'submit', page: '16' },
    { id: 'householdNanbyoCert', no: '⑪', name: '世帯員の特定医療費（指定難病）受給者証の写し', kind: 'submit', page: '16' },
    { id: 'proxyLetter', no: '⑫', name: '委任状', kind: 'submit', page: '16〜17' },
    { id: 'identityCheck', no: '⑬', name: '身元確認に必要な物', kind: 'present', page: '17' },
    { id: 'mynumberCheck', no: '⑭', name: '個人番号の確認に必要な物', kind: 'present', page: '17' },
    { id: 'legalRepProof', no: '⑮', name: '法定代理人であることを証明する書類', kind: 'present', page: '17' },
    { id: 'abroadProof', no: '－', name: '国内に住んでいなかったことが確認できる書類', kind: 'submit', page: '8, 13' },
  ],
};
