interface Props {
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
}

export default function DataMenu({ onExport, onImport, onClear }: Props) {
  return (
    <details class="card data-menu no-print">
      <summary>記録の書き出し・読み込み・削除</summary>
      <p class="small">
        記録はこのブラウザの中だけに保存され、外部には送信されません。別の端末で使うときや、念のための控えには、ファイルに書き出してください。
      </p>
      <div class="actions">
        <button onClick={onExport}>ファイルに書き出す</button>
        <label class="button">
          ファイルを読み込む
          <input
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            onChange={(e) => {
              const input = e.currentTarget as HTMLInputElement;
              const file = input.files?.[0];
              if (file) onImport(file);
              input.value = '';
            }}
          />
        </label>
        <button class="danger" onClick={onClear}>
          この端末のデータを全部消す
        </button>
      </div>
    </details>
  );
}
