# 難病更新ナビ（東京都版）

指定難病の医療費助成（特定医療費受給者証）の更新手続きで、自分に必要な書類とその理由を整理するツールです。入力はすべてブラウザの中で完結し、外部には送信しません。

- 条件判定ウィザード：質問に答えて、当てはまる条件を表示する
- 書類チェックリスト：書類ごとに「必要な理由」「省略できる理由」と注意点を表示する
- 前回との違い：年度ごとの記録（どの書類が必要で、どれを出したか）を保存し、翌年に比べられる

根拠資料：東京都「特定医療費更新手続のご案内」令和8年度版。ルールは `src/lib/rules/tokyo-r8.ts`（データ）と `src/lib/documents.ts`（分岐）にあります。

## 開発

```sh
npm install
npm run dev      # 開発サーバー
npm test         # Vitest
npm run check    # 型チェック
npm run build    # dist/ に静的ファイルを出力
npm run preview  # ビルド結果を確認
```

## デプロイ（Cloudflare Pages）

- フレームワークのプリセット：Astro
- ビルドコマンド：`npm run build`
- 出力ディレクトリ：`dist`

CSPはビルド時に `<meta>` として出力されます（`astro.config.mjs` の `security.csp`）。その他のセキュリティヘッダーは `public/_headers` で設定しています。

## 年度の更新

`src/lib/rules/tokyo-r8.ts` を複製し、新しい案内PDFに合わせて値と分岐を見直したうえで、`src/components/Navi.tsx` が参照するルールを差し替えます。
