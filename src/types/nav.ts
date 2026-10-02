// 功能軌（rail）導覽用的純 UI 型別，資料來源見 constants/consoleNav.ts。

export interface ConsoleNavItem {
  /** 對應 router route name */
  routeName: string
  /** 顯示於 rail 的標籤，如「對話」 */
  label: string
  /** 顯示於 rail 的兩位數序號，如「01」 */
  index: string
}
