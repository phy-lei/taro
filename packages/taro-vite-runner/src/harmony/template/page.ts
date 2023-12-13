import { isFunction } from '@tarojs/shared'
import path from 'path'

import { escapePath, resolveAbsoluteRequire } from '../../utils'
import { TARO_COMP_SUFFIX } from '../entry'
import { TARO_TABBAR_PAGE_PATH } from '../page'
import BaseParser from './base'

import type { AppConfig, TabBarItem } from '@tarojs/taro'
import type { TRollupResolveMethod } from '@tarojs/taro/types/compile/config/plugin'
import type { ViteHarmonyBuildConfig, VitePageMeta } from '@tarojs/taro/types/compile/viteCompilerContext'

const SHOW_TREE = false
const showTreeFunc = (isTabbarPage: boolean) => `async showTree() {
  const taskQueen = []

  function showTree (tree, level = 1) {
    const res: Record<string, string> = {}
    Object.keys(tree).forEach(k => {
      const item = tree[k]
      if (k === 'nodeName' && item === 'TEXT') {
        return
      }
      // 匹配的属性
      if (['nodeName', '_st', '_textContent', '_attrs'].includes(k)) {
        res[k] = item
      }
    })
    let attr = ''
    Object.keys(res).forEach(k => {
      // 过滤空的
      if (k === 'nodeName') {
        return
      } else  if (k === '_textContent' && !res[k]) {
        return
      } else if (k === '_st' && !Object.keys(res[k]).length) {
        return
      } else if (k === '_attrs' && !Object.keys(res[k]).length) {
        return
      }
      attr += \`\${k}=\${JSON.stringify(res[k])} \`
    })

    if(tree.childNodes?.length) {
      taskQueen.push(() => {
        console.info('taro-ele' + new Array(level).join('   '), \`<\${res.nodeName} \${attr}>\`)
      })
      tree.childNodes.forEach(child => {
        showTree(child, level+1)
      })
      taskQueen.push(() => {
        console.info('taro-ele' + new Array(level).join('   '), \`</\${res.nodeName}>\`)
      })
    } else {
      taskQueen.push(() => {
        console.info('taro-ele' + new Array(level).join('   '), \`<\${res.nodeName} \${attr}/>\`)
      })
    }
  }

  showTree(this.node${isTabbarPage ? '[this.tabBarCurrentIndex]' : ''})
  for (let i = 0; i < taskQueen.length; i++) {
    taskQueen[i]()
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
}`
const SHOW_TREE_BTN = `Button({ type: ButtonType.Circle, stateEffect: true }) {
  Text('打印 NodeTree')
    .fontSize(7).fontColor(Color.White)
    .size({ width: 25, height: 25 })
    .textAlign(TextAlign.Center)
}
.width(55).height(55).margin({ left: 20 }).backgroundColor(Color.Blue)
.position({ x: '75%', y: '80%' })
.onClick(this.showTree.bind(this))`

export default class Parser extends BaseParser {
  page: VitePageMeta | VitePageMeta[]
  isTabbarPage: boolean
  enableRefresh: number // 0: false, 1: true, 2: part
  tabbarList: TabBarItem[]

  constructor (
    protected appPath: string,
    protected appConfig: AppConfig,
    protected buildConfig: ViteHarmonyBuildConfig,
    protected loaderMeta: Record<string, unknown>,
  ) {
    super()
    this.init()
  }

  init () {
    this.tabbarList = this.appConfig.tabBar?.list || []
  }

  isEnable (app?: boolean, page?: boolean) {
    if (app && page !== false) return true
    return !!page
  }

  renderPage (isTabPage: boolean, appEnableRefresh = false, enableRefresh = 0) {
    let pageStr = `Stack({ alignContent: Alignment.TopStart }) {
  Scroll(${isTabPage ? 'this.scroller[index]' : 'this.scroller'}) {
    Column() {
      if (this.node) {
        TaroView(${isTabPage ? 'this.node[index]' : 'this.node'} as TaroViewElement)
      }
    }
  }
  .onScroll(() => {
    if (!this.page) return

    const offset: TaroObject = ${isTabPage ? 'this.scroller[index]' : 'this.scroller'}?.currentOffset()
    callFn(this.page.onPageScroll, {
      scrollTop: offset.xOffset || 0,
      scrollLeft: offset.yOffset || 0,
    })
  })
}
.width('100%')
.height('100%')`

    if (isTabPage && enableRefresh > 1) {
      pageStr = `if (${appEnableRefresh
        ? `config${isTabPage ? '[index]' : ''}.enablePullDownRefresh !== false`
        : `config${isTabPage ? '[index]' : ''}.enablePullDownRefresh`}) {
  Refresh({ refreshing: ${isTabPage ? 'this.isRefreshing[index]' : 'this.isRefreshing'} }) {
${this.transArr2Str(pageStr.split('\n'), 4)}
  }
  .onStateChange(bindFn(this.handleRefreshStatus, this, index))
} else {
${this.transArr2Str(pageStr.split('\n'), 2)}
}`
    } else if (enableRefresh === 1) {
      pageStr = `Refresh({ refreshing: ${isTabPage ? 'this.isRefreshing[index]' : 'this.isRefreshing'} }) {
${this.transArr2Str(pageStr.split('\n'), 2)}
}
.onStateChange(bindFn(this.handleRefreshStatus, ${isTabPage ? 'this, index' : ''}))
})`
    }

    if (isTabPage) {
      // TODO: 根据页面配置判断每个页面是否需要注入下拉刷新模块
      pageStr = `Tabs({
  barPosition: this.tabBarPosition !== 'top' ? BarPosition.End : BarPosition.Start,
  controller: this.tabBarController,
  index: this.tabBarCurrentIndex,
}) {
  ForEach(this.tabBarList, (item: ITabBarItem, index) => {
    TabContent() {
${this.transArr2Str(pageStr.split('\n'), 6)}
    }.tabBar(this.renderTabItemBuilder(index, item))
  }, (item: ITabBarItem, index) => \`\${item.key || index}\`)
}
.vertical(false)
.barMode(BarMode.Fixed)
.barHeight(this.isTabBarShow ? 56 : 0)
.animationDuration(this.tabBarAnimationDuration)
.onChange((index: number) => {
  if (this.tabBarCurrentIndex !== index) {
    callFn(this.page?.onHide, this)
    this.setTabBarCurrentIndex(index)
  }
  this.handlePageAppear()
  callFn(this.page?.onShow, this)
})
.backgroundColor(this.tabBarBackgroundColor)`
    }
    if (SHOW_TREE) {
      pageStr = this.transArr2Str([
        'if (true) {',
        this.transArr2Str(pageStr.split('\n'), 2),
        this.transArr2Str(SHOW_TREE_BTN.split('\n'), 2),
        '}',
      ])
    }
    return pageStr
  }

  get instantiatePage () {
    const { modifyInstantiate } = this.loaderMeta
    const structCodeArray: unknown[] = [
      '@Entry',
      '@Component',
      'struct Index {',
    ]
    const generateState = [
      'page?: PageInstance',
      this.isTabbarPage
        ? [
          `scroller: Scroller[] = [${
            this.tabbarList.map(() => 'new Scroller()').join(', ')
          }]`,
          `@State node: TaroElement[] | null[] = [${
            this.tabbarList.map(() => 'null').join(', ')
          }]`,
          this.enableRefresh
            ? `@State isRefreshing: boolean[] = [${
              this.tabbarList.map(() => 'false').join(', ')
            }]`
            : null,
          `@State pageList: PageInstance[] = []`,
        ]
        : [
          'scroller: Scroller = new Scroller()',
          '@State node: TaroElement | null = null',
          this.enableRefresh
            ? '@State isRefreshing: boolean = false'
            : null,
        ],
      '@State appConfig: AppConfig = window.__taroAppConfig || {}',
      '@StorageLink("__TARO_PAGE_STACK") pageStack: router.RouterState[] = []',
    ].flat()
    if (this.isTabbarPage) {
      generateState.push(
        '@StorageProp("__TARO_ENTRY_PAGE_PATH") entryPagePath: string = ""',
        '@State isTabBarShow: boolean = true',
        '@State tabBar: Partial<TabBar> = this.appConfig.tabBar || {}',
        '@State tabBarList: ITabBarItem[] = this.tabBar.list || []',
        '@State tabBarColor: string = this.tabBar.color || "#7A7E83"',
        '@State tabBarSelectedColor: string = this.tabBar.selectedColor || "#3CC51F"',
        '@State tabBarBackgroundColor: string = this.tabBar.backgroundColor || "#FFFFFF"',
        '@State tabBarBorderStyle: "white" | "black" = this.tabBar.borderStyle || "black"',
        '@State tabBarPosition: "top" | "bottom" = this.tabBar.position || "bottom"',
        '@State tabBarWithImage: boolean = this.tabBarList.every(e => !!e.iconPath)',
        '@State tabBarAnimationDuration: number = 400',
        '@State tabBarCurrentIndex: number = 0',
        'private tabBarController: TabsController = new TabsController()',
      )
    }
    structCodeArray.push(
      this.transArr2Str(generateState, 2),
      '',
      this.transArr2Str(`aboutToAppear() {
  const state = router.getState()
  state.path ||= '${this.isTabbarPage ? TARO_TABBAR_PAGE_PATH : (this.page as VitePageMeta).name}'
  if (this.pageStack.length >= state.index) {
    this.pageStack.length = state.index - 1
  }
  this.pageStack.push(state)
  ${this.isTabbarPage ? `const params = router.getParams() as Record<string, string> || {}
  let index = params.$page
    ? this.tabBarList.findIndex(e => e.pagePath === params.$page)
    : this.tabBarList.findIndex(e => e.pagePath === this.entryPagePath)
  index = index >= 0 ? index : 0
  this.handlePageAppear(index)
  this.setTabBarCurrentIndex(index)
  this.bindEvent()` : 'this.handlePageAppear()'}
}

onPageShow () {
  const state = router.getState()
  state.path ||= '${this.isTabbarPage ? TARO_TABBAR_PAGE_PATH : (this.page as VitePageMeta).name}'
  if (this.pageStack[this.pageStack.length - 1].path !== state.path) {
    this.pageStack.length = state.index
    this.pageStack[state.index - 1] = state
  }
  ${this.isTabbarPage ? `this.switchTabHandler({ params: router.getParams() || {} })
  this.pageList?.forEach(item => {
    callFn(item?.onShow, this)
  })` : 'callFn(this.page?.onShow, this)'}
}

onPageHide () {
  ${this.isTabbarPage ? `this.pageList?.forEach(item => {
    callFn(item?.onHide, this)
  })` : 'callFn(this.page?.onHide, this)'}
}

aboutToDisappear () {
  ${this.isTabbarPage ? `this.pageList?.forEach(item => {
    callFn(item?.onUnload, this)
  })
  this.removeEvent()` : 'callFn(this.page?.onUnload, this)'}
}
`.split('\n'), 2),
      SHOW_TREE ? this.transArr2Str(showTreeFunc(this.isTabbarPage).split('\n'), 2) : null,
      this.transArr2Str(`
handlePageAppear(${this.isTabbarPage ? 'index = this.tabBarCurrentIndex' : ''}) {
  const isCustomStyle = this.appConfig.window?.navigationStyle === 'custom'
  if ((isCustomStyle && config${this.isTabbarPage ? '[index]' : ''}.navigationStyle !== 'default') || config${this.isTabbarPage ? '[index]' : ''}.navigationStyle === 'custom') {
    Current.contextPromise
      .then((context: common.BaseContext) => {
        const win = window.__ohos.getLastWindow(context)
        win.then(mainWindow => {
          mainWindow.setFullScreen(true)
          mainWindow.setSystemBarEnable(["status", "navigation"])
        })
      })
  }
  const params = router.getParams() as Record<string, string> || {}

${this.isTabbarPage
    ? this.transArr2Str([
      'this.pageList ||= []',
      'if (!this.pageList[index]) {',
      '  this.pageList[index] = createComponent[index]()',
      '  this.page = this.pageList[index]',
      '  callFn(this.page.onLoad, this, params, (instance: TaroElement) => {',
      '    this.node[index] = instance',
      '  })',
      '}',
    ], 4)
    : this.transArr2Str([
      `this.page = createComponent()`,
      'callFn(this.page.onLoad, this, params, (instance: TaroElement) => {',
      '  this.node = instance',
      '})',
    ], 4)}
}
`.split('\n'), 2),
      this.isTabbarPage ? this.transArr2Str(`
setTabBarCurrentIndex(index: number) {
  this.tabBarCurrentIndex = index
  this.page = this.pageList[index]
}

updateTabBarKey = (index = 0, odd: Partial<ITabBarItem> = {}) => {
  const obj: Partial<ITabBarItem> = this.tabBarList[index]
  if (Object.keys(obj).every(key => odd[key] === obj[key])) return

  const idx = obj.key || index
  const len = this.tabBarList.length
  obj.key = (Math.floor(idx / len) + 1) * len + index
}

routerChangeHandler = () => {}

switchTabHandler = (option: TaroObject) => {
  const index = this.tabBarList.findIndex(e => e.pagePath === option.params.$page)
  if (index >= 0 && this.tabBarCurrentIndex !== index) {
    this.page?.onHide?.()
    this.setTabBarCurrentIndex(index)
  }
}

setTabBarBadgeHandler = (option: TaroObject) => {
  const list = [...this.tabBarList]
  if (!!list[option.index]) {
    const obj = list[option.index]
    const odd: ITabBarItem = ObjectAssign(obj)
    obj.showRedDot = false
    obj.badgeText = option.text
    this.updateTabBarKey(option.index, odd)
  }
  this.tabBarList = list
}

removeTabBarBadgeHandler = (option: TaroObject) => {
  const list = [...this.tabBarList]
  if (!!list[option.index]) {
    const obj = list[option.index]
    const odd: ITabBarItem = ObjectAssign(obj)
    obj.badgeText = undefined
    this.updateTabBarKey(option.index, odd)
  }
  this.tabBarList = list
}

showTabBarRedDotHandler = (option: TaroObject) => {
  const list = [...this.tabBarList]
  if (!!list[option.index]) {
    const obj = list[option.index]
    const odd: ITabBarItem = ObjectAssign(obj)
    obj.badgeText = undefined
    obj.showRedDot = true
    this.updateTabBarKey(option.index, odd)
  }
  this.tabBarList = list
}

hideTabBarRedDotHandler = (option: TaroObject) => {
  const list = [...this.tabBarList]
  if (!!list[option.index]) {
    const obj = list[option.index]
    const odd: ITabBarItem = ObjectAssign(obj)
    obj.showRedDot = false
    this.updateTabBarKey(option.index, odd)
  }
  this.tabBarList = list
}

showTabBarHandler = (option: TaroObject) => {
  if (option.animation) {
    animateTo({
      duration: this.tabBarAnimationDuration,
      tempo: 1,
      playMode: PlayMode.Normal,
      iterations: 1,
    }, () => {
      this.isTabBarShow = true
    })
  } else {
    this.isTabBarShow = true
  }
}

hideTabBarHandler = (option: TaroObject) => {
  if (option.animation) {
    animateTo({
      duration: this.tabBarAnimationDuration,
      tempo: 1,
      playMode: PlayMode.Normal,
      iterations: 1,
    }, () => {
      this.isTabBarShow = false
    })
  } else {
    this.isTabBarShow = false
  }
}

setTabBarStyleHandler = (option: TaroObject) => {
  if (option.backgroundColor) this.tabBarBackgroundColor = option.backgroundColor
  if (option.borderStyle) this.tabBarBorderStyle = option.borderStyle
  if (option.color) this.tabBarColor = option.color
  if (option.selectedColor) this.tabBarSelectedColor = option.selectedColor
}

setTabBarItemHandler = (option: TaroObject) => {
  const list = [...this.tabBarList]
  if (!!list[option.index]) {
    const obj = list[option.index]
    const odd: ITabBarItem = ObjectAssign(obj)
    if (option.iconPath) {
      obj.iconPath = option.iconPath
      this.tabBarWithImage = true
    }
    if (option.selectedIconPath) obj.selectedIconPath = option.selectedIconPath
    if (option.text) obj.text = option.text
    this.updateTabBarKey(option.index, odd)
  }
  this.tabBarList = list
}

bindEvent () {
  eventCenter.on('__taroRouterChange', this.routerChangeHandler)
  eventCenter.on('__taroSwitchTab', this.switchTabHandler)
  eventCenter.on('__taroSetTabBarBadge', this.setTabBarBadgeHandler)
  eventCenter.on('__taroRemoveTabBarBadge', this.removeTabBarBadgeHandler)
  eventCenter.on('__taroShowTabBarRedDotHandler', this.showTabBarRedDotHandler)
  eventCenter.on('__taroHideTabBarRedDotHandler', this.hideTabBarRedDotHandler)
  eventCenter.on('__taroShowTabBar', this.showTabBarHandler)
  eventCenter.on('__taroHideTabBar', this.hideTabBarHandler)
  eventCenter.on('__taroSetTabBarStyle', this.setTabBarStyleHandler)
  eventCenter.on('__taroSetTabBarItem', this.setTabBarItemHandler)
}

removeEvent () {
  eventCenter.off('__taroRouterChange', this.routerChangeHandler)
  eventCenter.off('__taroSwitchTab', this.switchTabHandler)
  eventCenter.off('__taroSetTabBarBadge', this.setTabBarBadgeHandler)
  eventCenter.off('__taroRemoveTabBarBadge', this.removeTabBarBadgeHandler)
  eventCenter.off('__taroShowTabBarRedDotHandler', this.showTabBarRedDotHandler)
  eventCenter.off('__taroHideTabBarRedDotHandler', this.hideTabBarRedDotHandler)
  eventCenter.off('__taroShowTabBar', this.showTabBarHandler)
  eventCenter.off('__taroHideTabBar', this.hideTabBarHandler)
  eventCenter.off('__taroSetTabBarStyle', this.setTabBarStyleHandler)
  eventCenter.off('__taroSetTabBarItem', this.setTabBarItemHandler)
}

@Builder renderTabBarInnerBuilder(index: number, item: ITabBarItem) {
  Column() {
    if (this.tabBarWithImage) {
      Image(this.tabBarCurrentIndex === index && item.selectedIconPath || item.iconPath)
        .width(24)
        .height(24)
        .objectFit(ImageFit.Contain)
      Text(item.text)
        .fontColor(this.tabBarCurrentIndex === index ? this.tabBarSelectedColor : this.tabBarColor)
        .fontSize(10)
        .fontWeight(this.tabBarCurrentIndex === index ? 500 : 400)
        .lineHeight(14)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .margin({ top: 7, bottom: 7 })
    } else {
      Text(item.text)
        .fontColor(this.tabBarCurrentIndex === index ? this.tabBarSelectedColor : this.tabBarColor)
        .fontSize(16)
        .fontWeight(this.tabBarCurrentIndex === index ? 500 : 400)
        .lineHeight(22)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .margin({ top: 17, bottom: 7 })
    }
  }
}

@Builder renderTabItemBuilder(index: number, item: ITabBarItem) {
  Column() {
    if (!!item.badgeText || item.showRedDot) {
      Badge({
        value: item.badgeText || '',
        position: BadgePosition.RightTop,
        style: {
          badgeSize: !!item.badgeText ? 16 : 6,
          badgeColor: Color.Red,
        }
      }) {
        this.renderTabBarInnerBuilder(index, item)
      }
    } else {
      this.renderTabBarInnerBuilder(index, item)
    }
  }
  .margin({ top: 4 })
  .width('100%').height('100%')
  .justifyContent(FlexAlign.SpaceEvenly)
}
`.split('\n'), 2) : null,
      this.enableRefresh ? this.transArr2Str(`
handleRefreshStatus(${this.isTabbarPage ? 'index = this.tabBarCurrentIndex, ' : ''}state: RefreshStatus) {
  if (state === RefreshStatus.Refresh) {
    ${this.isTabbarPage ? 'this.isRefreshing[index]' : 'this.isRefreshing'} = true
    callFn(this.page?.onPullDownRefresh, this)
  } else if (state === RefreshStatus.Done) {
    ${this.isTabbarPage ? 'this.isRefreshing[index]' : 'this.isRefreshing'} = false
  } else if (state === RefreshStatus.Drag) {
    callFn(this.page?.onPullIntercept, this)
  }
}
`.split('\n'), 2): null,
      this.transArr2Str([
        'build() {',
        this.transArr2Str(this.renderPage(this.isTabbarPage, this.appConfig.window?.enablePullDownRefresh, this.enableRefresh).split('\n'), 2).split('\n'),
        '}',
      ], 2)
    )

    structCodeArray.push('}', '')

    let instantiatePage = this.transArr2Str(structCodeArray)
    if (isFunction(modifyInstantiate)) {
      instantiatePage = modifyInstantiate(instantiatePage, 'page')
    }

    return instantiatePage
  }

  parse (rawId: string, page: VitePageMeta | VitePageMeta[], name = 'TaroPage', resolve?: TRollupResolveMethod) {
    const { modifyResolveId } = this.loaderMeta
    this.page = page
    this.isTabbarPage = page instanceof Array
    const pageRefresh: boolean[] = page instanceof Array
      ? page.map(e => this.isEnable(this.appConfig.window?.enablePullDownRefresh, e.config.enablePullDownRefresh))
      : [this.isEnable(this.appConfig.window?.enablePullDownRefresh, (page as VitePageMeta)?.config.enablePullDownRefresh)]
    if (pageRefresh.every(e => !!e)) {
      this.enableRefresh = 1
    } else {
      this.enableRefresh = pageRefresh.some(e => !!e) ? 2 : 0
    }

    const code = this.transArr2Str([
      'import type { AppConfig, TabBar, TabBarItem } from "@tarojs/taro/types"',
      'import type common from "@ohos.app.ability.common"',
      '',
      'import router from "@ohos.router"',
      'import TaroView from "@tarojs/components/view"',
      'import { bindFn, callFn, Current, ObjectAssign, TaroObject, window } from "@tarojs/runtime"',
      'import { TaroElement, TaroViewElement } from "@tarojs/runtime"',
      'import { eventCenter, PageInstance } from "@tarojs/runtime/dist/runtime.esm"',
      this.isTabbarPage
        ? [
          this.tabbarList.map((e, i) => `import page${i}, { config as config${i} } from './${e.pagePath}${TARO_COMP_SUFFIX}'`),
          '',
          `const createComponent = [${this.tabbarList.map((_, i) => `page${i}`).join(', ')}]`,
          `const config = [${this.tabbarList.map((_, i) => `config${i}`).join(', ')}]`,
          '',
          'interface ITabBarItem extends TabBarItem {',
          this.transArr2Str([
            'key?: number',
            'badgeText?: string',
            'showRedDot?: boolean',
          ], 2),
          '}',
        ]
        : [
          `import createComponent, { config } from "${rawId + TARO_COMP_SUFFIX}"`,
        ],
      '',
      this.instantiatePage,
    ])

    const { outputRoot = 'dist', sourceRoot = 'src' } = this.buildConfig
    return resolveAbsoluteRequire({
      name,
      importer: rawId,
      code,
      outputRoot,
      targetRoot: path.resolve(this.appPath, sourceRoot),
      resolve,
      modifyResolveId,
    })
  }

  parseEntry (rawId: string, page: VitePageMeta) {
    const { creatorLocation, importFrameworkStatement } = this.loaderMeta
    const createPage = `createPageConfig(component, '${page.name}', config)`

    return this.transArr2Str([
      `import { createPageConfig } from '${creatorLocation}'`,
      `import component from "${escapePath(rawId)}"`,
      importFrameworkStatement,
      `export const config = ${this.prettyPrintJson(page.config)}`,
      page?.config.enableShareTimeline ? 'component.enableShareTimeline = true' : null,
      page?.config.enableShareAppMessage ? 'component.enableShareAppMessage = true' : null,
      `export default () => ${createPage}`,
    ])
  }
}