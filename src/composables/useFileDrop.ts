// dragenter/dragover/dragleave/drop 四個事件 + click 轉發到隱藏的 <input type="file">，
// 樣板 ASR 面板的拖拉邏輯（aihub-console.html L1322-1333）包成可重用 composable。
import { ref } from 'vue'

export function useFileDrop(onFile: (file: File) => void) {
  const isOver = ref(false)

  function handleDragEnter(e: DragEvent): void {
    e.preventDefault()
    isOver.value = true
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault()
    isOver.value = true
  }

  function handleDragLeave(e: DragEvent): void {
    e.preventDefault()
    isOver.value = false
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault()
    isOver.value = false
    const file = e.dataTransfer?.files?.[0]
    if (file) onFile(file)
  }

  function handleInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) onFile(file)
  }

  return { isOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop, handleInputChange }
}
