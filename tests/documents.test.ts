import { describe, expect, it } from 'vitest';
import { DEFAULT_ANSWERS, type Answers, type Insurance } from '../src/lib/answers';
import { deriveConditions, resolveDocuments, type DocStatus } from '../src/lib/documents';
import { normalizeAnswers, visibleQuestions } from '../src/lib/questions';
import { TOKYO_R8, type DocId } from '../src/lib/rules/tokyo-r8';

const answers = (over: Partial<Answers> = {}): Answers => ({ ...DEFAULT_ANSWERS, ...over });

function statuses(a: Answers): Record<DocId, DocStatus> {
  return Object.fromEntries(resolveDocuments(a, TOKYO_R8).map((d) => [d.id, d.status])) as Record<DocId, DocStatus>;
}

function notesOf(a: Answers, id: DocId): string {
  return resolveDocuments(a, TOKYO_R8)
    .find((d) => d.id === id)!
    .notes.join('\n');
}

const INSURANCES: Insurance[] = ['employee_insured', 'employee_dependent', 'kokuho', 'kokuho_kumiai', 'kouki'];

describe('resolveDocuments', () => {
  it('全員が出す書類は常に required', () => {
    for (const insurance of INSURANCES) {
      const s = statuses(answers({ insurance }));
      expect(s.application).toBe('required');
      expect(s.rinsho).toBe('required');
    }
  });

  describe.each(INSURANCES)('保険の種類: %s', (insurance) => {
    it('情報連携ありなら 住民票・保険情報・所得書類 を省略し、年金申出書と窓口提示物が必要', () => {
      const s = statuses(answers({ insurance, mynumberLink: true }));
      expect(s.mynumberSheet).toBe('required');
      expect(s.juminhyo).toBe('omitted');
      expect(s.insuranceCopy).toBe('omitted');
      expect(s.incomeProof).toBe('omitted');
      expect(s.pensionDeclaration).toBe('required');
      expect(s.identityCheck).toBe('present');
      expect(s.mynumberCheck).toBe('present');
    });

    it('情報連携なしなら 住民票・保険情報・所得書類 が必要で、調書は任意', () => {
      const s = statuses(answers({ insurance, mynumberLink: false }));
      expect(s.mynumberSheet).toBe('optional');
      expect(s.juminhyo).toBe('required');
      expect(s.insuranceCopy).toBe('required');
      expect(s.incomeProof).toBe('required');
      expect(s.pensionDeclaration).toBe('omitted');
    });
  });

  it('保険情報・所得書類の対象者が保険の種類で変わる', () => {
    const base = { mynumberLink: false };
    expect(notesOf(answers({ ...base, insurance: 'employee_insured' }), 'incomeProof')).toContain('誰の分：被保険者');
    expect(notesOf(answers({ ...base, insurance: 'kokuho' }), 'insuranceCopy')).toContain('同じ記号・番号の人全員');
    expect(notesOf(answers({ ...base, insurance: 'kokuho' }), 'incomeProof')).toContain('義務教育を終えていない子');
    expect(notesOf(answers({ ...base, insurance: 'kouki' }), 'insuranceCopy')).toContain('住民票上同じ世帯');
    expect(notesOf(answers({ ...base, insurance: 'employee_dependent', insuredNonTaxable: 'yes' }), 'incomeProof')).toContain(
      '患者本人の分も',
    );
    expect(notesOf(answers({ ...base, insurance: 'employee_insured' }), 'insuranceCopy')).toContain('現住所');
  });

  it('氏名変更があると情報連携でも住民票などを省略できない', () => {
    const s = statuses(answers({ mynumberLink: true, nameChanged: true }));
    expect(s.juminhyo).toBe('required');
    expect(s.insuranceCopy).toBe('required');
    expect(s.incomeProof).toBe('required');
  });

  it('上位所得の承諾があれば所得書類を省略できる', () => {
    expect(statuses(answers({ mynumberLink: false, topIncomeConsent: true })).incomeProof).toBe('omitted');
  });

  it('世帯全員が非課税なら情報連携なしでも年金申出書が必要。不明なら要確認', () => {
    expect(statuses(answers({ mynumberLink: false, allNonTaxable: 'yes' })).pensionDeclaration).toBe('required');
    expect(statuses(answers({ mynumberLink: false, allNonTaxable: 'unknown' })).pensionDeclaration).toBe('optional');
  });

  describe('生活保護', () => {
    it('医療保険なし・情報連携ありなら、ほぼすべて省略できる', () => {
      const s = statuses(answers({ welfare: true, insurance: 'none', mynumberLink: true }));
      expect(s.juminhyo).toBe('omitted');
      expect(s.insuranceCopy).toBe('omitted');
      expect(s.incomeProof).toBe('omitted');
      expect(s.pensionDeclaration).toBe('omitted');
      expect(s.welfareCert).toBe('omitted');
    });

    it('情報連携なしなら生活保護受給証明書が必要。住民票は省略できる', () => {
      const s = statuses(answers({ welfare: true, insurance: 'none', mynumberLink: false }));
      expect(s.welfareCert).toBe('required');
      expect(s.juminhyo).toBe('omitted');
    });

    it('町村部や住所地以外で受給していると、情報連携でも証明書を省略できない', () => {
      expect(statuses(answers({ welfare: true, insurance: 'none', welfareOutsideOrTown: true })).welfareCert).toBe('required');
    });

    it('会社の保険に入っている場合は保険情報が必要（情報連携なし）', () => {
      expect(statuses(answers({ welfare: true, insurance: 'employee_insured', mynumberLink: false })).insuranceCopy).toBe(
        'required',
      );
    });
  });

  it('生活保護でなければ受給証明書は不要', () => {
    expect(statuses(answers()).welfareCert).toBe('omitted');
  });

  describe('医療費（軽症かつ高額・高額かつ長期）', () => {
    it('基準を超えた月があれば医療費の書類が必要', () => {
      expect(statuses(answers({ medicalCost: 'mild_high' })).medicalCostProof).toBe('required');
      expect(statuses(answers({ medicalCost: 'long_high' })).medicalCostProof).toBe('required');
    });

    it('わからないなら要確認、ないなら不要', () => {
      expect(statuses(answers({ medicalCost: 'unknown' })).medicalCostProof).toBe('optional');
      expect(statuses(answers({ medicalCost: 'none' })).medicalCostProof).toBe('omitted');
    });

    it('申請書の☑と変更申請の注意を出す', () => {
      expect(notesOf(answers({ medicalCost: 'none' }), 'application')).toContain('該当しない欄に☑');
      expect(notesOf(answers({ medicalCost: 'long_high' }), 'application')).toContain('高額かつ長期');
      expect(notesOf(answers({ medicalCost: 'mild_high' }), 'application')).not.toContain('高額かつ長期');
      expect(notesOf(answers({ medicalCost: 'long_high' }), 'medicalCostProof')).toContain('変更申請');
    });

    it('50,000円超が6か月以上なら、軽症かつ高額と高額かつ長期の両方に当てはまる', () => {
      const ids = deriveConditions(answers({ medicalCost: 'long_high' }), TOKYO_R8).map((c) => c.id);
      expect(ids).toEqual(expect.arrayContaining(['keishoKogaku', 'kogakuChoki']));
      const mild = deriveConditions(answers({ medicalCost: 'mild_high' }), TOKYO_R8).map((c) => c.id);
      expect(mild).toContain('keishoKogaku');
      expect(mild).not.toContain('kogakuChoki');
    });
  });

  it('18歳未満なら保護者に関する注意を出す', () => {
    const a = answers({ under18: true, submitter: 'guardian' });
    expect(notesOf(a, 'mynumberSheet')).toContain('「保護者」欄を必ず書く');
    expect(notesOf(a, 'application')).toContain('申請者（医療券の送付先）');
    expect(notesOf(a, 'pensionDeclaration')).toContain('保護者の名前');
  });

  it('代理人なら委任状、法定代理人なら証明書類', () => {
    expect(statuses(answers({ submitter: 'proxy' })).proxyLetter).toBe('required');
    expect(statuses(answers({ submitter: 'proxy', mynumberLink: false })).proxyLetter).toBe('optional');
    expect(statuses(answers({ submitter: 'self' })).proxyLetter).toBe('omitted');
    expect(statuses(answers({ submitter: 'legal_rep' })).legalRepProof).toBe('present');
    expect(statuses(answers({ submitter: 'self' })).legalRepProof).toBe('omitted');
  });

  it('小慢・世帯員の難病受給者証', () => {
    expect(statuses(answers({ shoman: 'self' })).shomanCert).toBe('required');
    expect(notesOf(answers({ shoman: 'household' }), 'shomanCert')).toContain('医療保険情報の写し');
    expect(statuses(answers({ shoman: 'none' })).shomanCert).toBe('omitted');
    expect(statuses(answers({ nanbyoHousehold: true })).householdNanbyoCert).toBe('required');
    expect(statuses(answers({ nanbyoHousehold: false })).householdNanbyoCert).toBe('omitted');
  });

  it('1月1日時点で国外にいた人がいれば証明書類が必要', () => {
    expect(statuses(answers({ abroadOnBaseDate: true })).abroadProof).toBe('required');
    expect(statuses(answers({ abroadOnBaseDate: false })).abroadProof).toBe('omitted');
  });

  it('有効期限切れ後の申請なら申請書の開始年月日欄の注意を出す', () => {
    expect(notesOf(answers({ expiry: 'after_within_6m' }), 'application')).toContain('支給を開始することが適当');
  });
});

describe('deriveConditions', () => {
  it('6か月を過ぎていたら新規申請の扱い', () => {
    const ids = deriveConditions(answers({ expiry: 'after_over_6m' }), TOKYO_R8).map((c) => c.id);
    expect(ids).toContain('newApplication');
  });

  it('情報連携と軽症高額を表示する', () => {
    const ids = deriveConditions(answers({ mynumberLink: true, medicalCost: 'mild_high' }), TOKYO_R8).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['mynumberLink', 'keishoKogaku']));
  });
});

describe('questions', () => {
  it('生活保護でない人には生活保護の詳細を聞かない', () => {
    const keys = visibleQuestions(answers({ welfare: false })).map((q) => q.key);
    expect(keys).not.toContain('welfareOutsideOrTown');
    expect(visibleQuestions(answers({ welfare: true })).map((q) => q.key)).toContain('welfareOutsideOrTown');
  });

  it('選べなくなった選択肢は最初の選択肢に戻す', () => {
    const a = normalizeAnswers(answers({ under18: false, submitter: 'guardian', welfare: false, insurance: 'none' }));
    expect(a.submitter).toBe('self');
    expect(a.insurance).toBe('employee_insured');
  });
});
