/// <reference types="vite/client" />

// 舊版 Safari 的 AudioContext / OfflineAudioContext 掛在 webkit 前綴下，lib.dom.d.ts 沒有這個宣告。
interface Window {
  webkitAudioContext?: typeof AudioContext
  webkitOfflineAudioContext?: typeof OfflineAudioContext
}
