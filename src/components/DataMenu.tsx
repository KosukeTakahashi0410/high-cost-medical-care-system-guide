interface Props {
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
}

export default function DataMenu({ onExport, onImport, onClear }: Props) {
  return (
    <details class="data-menu no-print">
      <summary>記録の書き出し・読み込み・削除</summary>
      <div class="data-menu-body">
        <p class="small muted">
          記録はこの端末のブラウザにだけ保存されます。別の端末で使うときや、念のための控えには、ファイルに書き出してください。
        </p>
        <div class="actions">
          <button class="btn" onClick={onExport}>
            ファイルに書き出す
          </button>
          <label class="btn">
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
          <button class="btn-text btn-danger" onClick={onClear}>
            この端末のデータを全部消す
          </button>
        </div>
      </div>
    </details>
  );
}
