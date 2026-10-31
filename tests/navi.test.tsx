// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import Navi from '../src/components/Navi';
import { STORAGE_KEY } from '../src/lib/storage';

function click(el: Element | null | undefined) {
  if (!el) throw new Error('element not found');
  act(() => {
    (el as HTMLElement).click();
  });
}

function button(root: HTMLElement, text: string) {
  return [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
}

function mount() {
  const root = document.createElement('div');
  document.body.append(root);
  act(() => {
    render(<Navi />, root);
  });
  return root;
}

describe('Navi（画面の通し操作）', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('質問に答えて、チェックリストを出し、記録を保存できる', () => {
    const root = mount();
    click(button(root, '質問に答える'));
    expect(root.textContent).toContain('有効期限');

    // 「次へ」で最後まで進む（既定の答えのまま）
    for (let i = 0; i < 30 && !button(root, '結果を見る')?.textContent?.startsWith('結果を見る'); i++) {
      click(button(root, '次へ'));
    }
    click(button(root, '結果を見る'));

    expect(root.textContent).toContain('書類チェックリスト');
    expect(root.textContent).toContain('特定医療費支給認定申請書');
    expect(root.textContent).toContain('マイナンバーの情報連携');

    // 申請書を提出済みにして保存
    const first = root.querySelector<HTMLInputElement>('.doc input[type=checkbox]');
    click(first);
    expect(root.textContent).toContain('1 / ');
    click(button(root, '記録として保存'));
    expect(root.textContent).toContain('記録として保存しました');

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.records).toHaveLength(1);
    expect(saved.records[0].documents.find((d: { id: string }) => d.id === 'application').submitted).toBe(true);
    // 中身（氏名や番号）は保存していない：回答とIDとフラグだけ
    expect(Object.keys(saved.records[0])).toEqual(['fiscalYear', 'fiscalYearLabel', 'rulesId', 'savedAt', 'answers', 'documents']);
  });

  it('前年度の記録があれば、前回の答えから始めて違いを表示する', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        records: [
          {
            fiscalYear: 2025,
            fiscalYearLabel: '令和7年度',
            rulesId: 'tokyo-r7',
            savedAt: '2025-08-01T00:00:00.000Z',
            answers: { mynumberLink: false },
            documents: [
              { id: 'application', status: 'required', submitted: true },
              { id: 'juminhyo', status: 'required', submitted: true },
              { id: 'pensionDeclaration', status: 'omitted', submitted: false },
            ],
          },
        ],
      }),
    );
    const root = mount();
    click(button(root, '前回（令和7年度）の答えから始める'));
    expect(root.textContent).toContain('前回の答え');

    // 情報連携の質問まで進んで「省略する」に変える
    for (let i = 0; i < 30 && !root.textContent?.includes('マイナンバーを使って書類を省略'); i++) {
      click(button(root, '次へ'));
    }
    const link = [...root.querySelectorAll('.option')].find((o) => o.textContent?.includes('省略する（おすすめ）'));
    click(link?.querySelector('input'));
    click(root.querySelector('button.link'));

    expect(root.textContent).toContain('前回（令和7年度）との違い');
    expect(root.textContent).toContain('今回は不要になった');
    expect(root.textContent).toContain('④ 住民票');
    expect(root.textContent).toContain('今回から新しく必要');
    expect(root.textContent).toContain('前回も提出');
  });
});
