// 站名與 <title> 樣板，router 的 afterEach 用 SITE_TITLE_TEMPLATE 組出完整標題。
export const SITE_NAME = 'AIHub 工作台'
export const SITE_TAGLINE = 'iai.nkust.edu.tw/aihub · v1'
export const SITE_TITLE_TEMPLATE = (pageTitle: string) => `${pageTitle} - ${SITE_NAME}`
