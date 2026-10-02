// 跨元件共用的純 UI 型別，與外部 API 契約無關。

export interface SelectOption {
  label: string
  value: string
}

/** usePanelStatus 回報的面板狀態，對應 .status 的 idle/busy/ok/err 四態 */
export type PanelStatus = 'idle' | 'busy' | 'ok' | 'err'

/** HealthChip／models store 的連線健康狀態 */
export type HealthState = 'idle' | 'loading' | 'live' | 'down'
