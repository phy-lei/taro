import { loadNavigationBarStyle } from './style'

import type { MpaRouterConfig, SpaRouterConfig } from '../types/router'

const home_svg_str = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.8899 12.2737C23.8232 12.3584 23.7237 12.3997 23.6198 12.3974H20.7994V23.5996C20.7994 23.8194 20.6213 24 20.4001 24H14.7994C14.5791 24 14.4002 23.8194 14.4002 23.5996V15.6H9.59963V23.5996C9.59963 23.8194 9.42075 24 9.20033 24H3.59968C3.48981 24 3.38964 23.954 3.31764 23.8811C3.24495 23.8091 3.2004 23.7087 3.2004 23.5996V12.3975H0.398546V12.3967C0.296893 12.396 0.194446 12.3544 0.11579 12.2738C-0.0371146 12.114 -0.0400714 11.864 0.11579 11.7076L11.7201 0.117284C11.8767 -0.0390948 12.1298 -0.0390948 12.2863 0.117284L23.8899 11.7076C24.0465 11.864 24.0265 12.0995 23.8899 12.2737ZM12.0029 0.964625L1.37086 11.5854L3.59968 11.5839V11.5999C3.65537 11.5999 3.70804 11.611 3.75557 11.6307C3.89952 11.692 4.00046 11.8339 4.00046 11.9996V23.1991H8.79955V15.2003C8.79955 14.9789 8.97917 14.8002 9.20033 14.8002H14.7995C15.0207 14.8002 15.2003 14.9789 15.2003 15.2003V23.1991H20.0001V11.9996C20.0001 11.8339 20.1003 11.692 20.2443 11.6307C20.2918 11.611 20.3453 11.5999 20.4001 11.5999V11.5713L22.6193 11.5691L12.0029 0.964625Z" fill="currentColor"/>
</svg>
`

const back_svg_str = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.8206 22.9016L7.45515 11.8756L17.8206 1.09845C18.0598 0.849741 18.0598 0.435233 17.8206 0.186528C17.5814 -0.0621762 17.1827 -0.0621762 16.9435 0.186528L6.1794 11.4611C5.9402 11.7098 5.9402 12.1244 6.1794 12.3731L16.9435 23.8135C17.1827 24.0622 17.5814 24.0622 17.8206 23.8135C18.0598 23.5648 18.0598 23.1503 17.8206 22.9016Z" fill="currentColor"/>
</svg>
`

const loading_svg_str = `
<svg t="1709608074670" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4741" width="24" height="24"><path d="M256 529.066667H85.333333a17.066667 17.066667 0 1 1 0-34.133334h170.666667a17.066667 17.066667 0 0 1 0 34.133334z" opacity=".278" p-id="4742"></path><path d="M99.84 640a17.066667 17.066667 0 0 1-4.437333-33.553067l164.693333-44.373333a17.066667 17.066667 0 1 1 8.891733 32.9728l-164.693333 44.373333a17.544533 17.544533 0 0 1-4.4544 0.580267z" opacity=".322" p-id="4743"></path><path d="M264.533333 462.523733a16.896 16.896 0 0 1-4.369066-0.580266l-164.693334-43.52a17.0496 17.0496 0 1 1 8.721067-32.989867l164.693333 43.52a17.066667 17.066667 0 1 1-4.352 33.570133z" opacity=".239" p-id="4744"></path><path d="M384.017067 307.2a17.032533 17.032533 0 0 1-14.7968-8.533333l-85.333334-147.626667a17.066667 17.066667 0 0 1 29.559467-17.083733l85.333333 147.626666A17.066667 17.066667 0 0 1 384.017067 307.2z" opacity=".122" p-id="4745"></path><path d="M639.982933 307.2a17.0496 17.0496 0 0 1-14.762666-25.6l85.333333-147.626667a17.066667 17.066667 0 1 1 29.559467 17.066667l-85.333334 147.626667a17.032533 17.032533 0 0 1-14.7968 8.533333z" opacity=".922" p-id="4746"></path><path d="M692.906667 347.306667a17.066667 17.066667 0 0 1-12.117334-29.098667l120.337067-121.173333a17.066667 17.066667 0 1 1 24.234667 24.046933l-120.337067 121.173333a17.1008 17.1008 0 0 1-12.117333 5.051734z" opacity=".878" p-id="4747"></path><path d="M733.883733 401.066667a17.066667 17.066667 0 0 1-8.5504-31.8464l147.626667-85.333334a17.0496 17.0496 0 1 1 17.066667 29.5424l-147.626667 85.333334a16.776533 16.776533 0 0 1-8.516267 2.304z" opacity=".839" p-id="4748"></path><path d="M512 273.066667a17.066667 17.066667 0 0 1-17.066667-17.066667V85.333333a17.066667 17.066667 0 0 1 34.133334 0v170.666667a17.066667 17.066667 0 0 1-17.066667 17.066667z" p-id="4749"></path><path d="M578.577067 281.6a17.066667 17.066667 0 0 1-16.520534-21.418667l43.52-164.693333a17.066667 17.066667 0 0 1 33.006934 8.721067l-43.52 164.693333a17.066667 17.066667 0 0 1-16.4864 12.6976z" opacity=".961" p-id="4750"></path><path d="M445.44 282.453333a17.066667 17.066667 0 0 1-16.469333-12.629333l-44.373334-164.693333a17.066667 17.066667 0 0 1 32.955734-8.891734l44.373333 164.693334a17.066667 17.066667 0 0 1-16.4864 21.521066z" opacity=".078" p-id="4751"></path><path d="M924.177067 640c-1.4848 0-2.9696-0.187733-4.4544-0.580267l-164.693334-44.373333a17.066667 17.066667 0 0 1 8.874667-32.9728l164.693333 44.373333a17.066667 17.066667 0 0 1-4.420266 33.553067z" opacity=".722" p-id="4752"></path><path d="M881.476267 742.4a17.015467 17.015467 0 0 1-8.482134-2.269867l-148.48-85.333333a17.0496 17.0496 0 1 1 16.9984-29.5936l148.48 85.333333a17.0496 17.0496 0 0 1-8.516266 31.863467z" opacity=".678" p-id="4753"></path><path d="M813.226667 830.293333a17.015467 17.015467 0 0 1-12.066134-5.000533l-120.337066-120.337067a17.0496 17.0496 0 1 1 24.132266-24.132266l120.337067 120.337066a17.0496 17.0496 0 0 1-12.066133 29.1328z" opacity=".639" p-id="4754"></path><path d="M938.666667 529.066667H768a17.066667 17.066667 0 1 1 0-34.133334h170.666667a17.066667 17.066667 0 1 1 0 34.133334z" opacity=".761" p-id="4755"></path><path d="M401.066667 941.226667a17.066667 17.066667 0 0 1-16.4864-21.504l44.373333-164.693334a17.066667 17.066667 0 1 1 32.955733 8.874667l-44.373333 164.693333a17.066667 17.066667 0 0 1-16.469333 12.629334z" opacity=".478" p-id="4756"></path><path d="M298.6496 898.56a17.066667 17.066667 0 0 1-14.779733-25.565867l85.333333-148.48a17.083733 17.083733 0 0 1 29.5936 16.9984l-85.333333 148.48a17.032533 17.032533 0 0 1-14.813867 8.567467z" opacity=".439" p-id="4757"></path><path d="M512 955.733333a17.066667 17.066667 0 0 1-17.066667-17.066666V768a17.066667 17.066667 0 1 1 34.133334 0v170.666667a17.066667 17.066667 0 0 1-17.066667 17.066666z" opacity=".522" p-id="4758"></path><path d="M725.3504 898.56a17.032533 17.032533 0 0 1-14.7968-8.533333l-85.333333-147.626667a17.066667 17.066667 0 0 1 29.559466-17.066667l85.333334 147.626667a17.066667 17.066667 0 0 1-14.762667 25.6z" opacity=".6" p-id="4759"></path><path d="M622.062933 942.08c-7.509333 0-14.421333-5.0176-16.469333-12.629333l-44.3904-164.693334a17.066667 17.066667 0 1 1 32.9728-8.874666l44.3904 164.693333a17.066667 17.066667 0 0 1-16.503467 21.504z" opacity=".561" p-id="4760"></path><path d="M759.4496 463.36a17.083733 17.083733 0 0 1-4.420267-33.553067l164.693334-44.373333a17.066667 17.066667 0 0 1 8.874666 32.955733l-164.693333 44.373334a16.657067 16.657067 0 0 1-4.4544 0.597333z" opacity=".702" p-id="4761"></path><path d="M330.24 347.306667a17.015467 17.015467 0 0 1-12.066133-5.000534l-120.32-120.32a17.0496 17.0496 0 1 1 24.132266-24.132266l120.32 120.32a17.0496 17.0496 0 0 1-12.066133 29.1328z" opacity=".161" p-id="4762"></path><path d="M290.116267 401.066667a17.032533 17.032533 0 0 1-8.533334-2.286934l-147.626666-85.333333a17.066667 17.066667 0 1 1 17.083733-29.5424l147.626667 85.333333a17.066667 17.066667 0 0 1-8.5504 31.829334z" opacity=".2" p-id="4763"></path><path d="M142.523733 742.4a17.066667 17.066667 0 0 1-8.567466-31.8464l147.626666-85.333333a17.066667 17.066667 0 1 1 17.083734 29.559466l-147.626667 85.333334a16.930133 16.930133 0 0 1-8.516267 2.286933z" opacity=".361" p-id="4764"></path><path d="M209.92 830.293333a17.066667 17.066667 0 0 1-12.117333-29.098666l120.32-121.173334a17.066667 17.066667 0 0 1 24.2176 24.029867l-120.32 121.1904a16.896 16.896 0 0 1-12.100267 5.051733z" opacity=".4" p-id="4765"></path></svg>
`

export function initNavigationBar (config: SpaRouterConfig | MpaRouterConfig, container: HTMLElement) {
  if (config.router.mode === 'multi') return

  const navigationBar = document.createElement('div')
  navigationBar.classList.add('taro-navigation-bar-no-icon')

  const navigationBarBackBtn = document.createElement('div')
  navigationBarBackBtn.classList.add('taro-navigation-bar-back')
  const navigationBarHomeBtn = document.createElement('div')
  navigationBarHomeBtn.classList.add('taro-navigation-bar-home')
  navigationBarBackBtn.innerHTML = back_svg_str
  navigationBarHomeBtn.innerHTML = home_svg_str

  const navigationBarTitleWrap = document.createElement('div')
  navigationBarTitleWrap.classList.add('taro-navigation-bar-title-wrap')
  const navigationBarLoading = document.createElement('div')
  navigationBarLoading.classList.add('taro-navigation-bar-loading')
  navigationBarLoading.innerHTML = loading_svg_str
  const navigationBarTitle = document.createElement('div')
  navigationBarTitle.classList.add('taro-navigation-bar-title')
  navigationBarTitleWrap.appendChild(navigationBarLoading)
  navigationBarTitleWrap.appendChild(navigationBarTitle)

  navigationBar.appendChild(navigationBarHomeBtn)
  navigationBar.appendChild(navigationBarBackBtn)
  navigationBar.appendChild(navigationBarTitleWrap)
  navigationBar.id = 'taro-navigation-bar'
  container.prepend(navigationBar)
  loadNavigationBarStyle()
}
