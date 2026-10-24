// embed + rerank 共用的格式化小工具。

export function formatBytesKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 把多行文字輸入拆成非空白的行陣列，embed 的輸入文字、rerank 的候選文件皆用此。
export function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
