import type { InjectionKey } from 'vue'

export interface ConsoleMenuControl {
  openTokenPanel: () => void
  closeTokenPanel: () => void
  isTokenPanelOpen: () => boolean
}

// masthead 的金鑰 chip 與各 view 的「401 提示去設定」都要能開啟同一個 token 面板，
// 兩處互不是父子關係，provide/inject 正是這個用例。由 ConsoleLayout provide。
export const CONSOLE_MENU_KEY: InjectionKey<ConsoleMenuControl> = Symbol('console-menu')
