import { REG_NODE_MODULES_DIR, REG_TARO_SCOPED_PACKAGE, resolveSync } from '@tarojs/helper'
import VirtualModulesPlugin from 'webpack-virtual-modules'

import { parsePublicPath } from '../utils'
import AppHelper from '../utils/app'
import { componentConfig } from '../utils/component'
import { Combination } from './Combination'
import { H5BaseConfig } from './H5BaseConfig'
import { H5WebpackModule } from './H5WebpackModule'
import { H5WebpackPlugin } from './H5WebpackPlugin'
import WebpackPlugin from './WebpackPlugin'

import type { Configuration, EntryNormalized, LibraryOptions } from 'webpack'
import type { IH5BuildConfig } from '../utils/types'

type Output = Required<Configuration>['output']
type Optimization = Required<Configuration>['optimization']
type OptimizationSplitChunksOptions = Required<Optimization>['splitChunks']

export class H5Combination extends Combination<IH5BuildConfig> {
  appHelper: AppHelper
  webpackPlugin = new H5WebpackPlugin(this)
  webpackModule = new H5WebpackModule(this)

  isMultiRouterMode = false
  isVirtualEntry = false

  /** special mode */
  noInjectGlobalStyle = false

  constructor(appPath: string, config: IH5BuildConfig) {
    super(appPath, config)
    this.noInjectGlobalStyle = !!config.noInjectGlobalStyle
  }

  process (config: Partial<IH5BuildConfig>) {
    const baseConfig = new H5BaseConfig(this.appPath, config)
    const chain = this.chain = baseConfig.chain
    const {
      entry = {},
      output = {},
      entryFileName = 'app',
      mode = 'production',
      sourceMapType = 'eval-cheap-module-source-map',
      publicPath = '/',
      chunkDirectory = 'chunk',
      alias = {},
      defineConstants = {},
      router,
      frameworkExts,
      /** special mode */
      /** hooks */
      modifyAppConfig,
      modifyComponentConfig,
    } = config
    const externals: Configuration['externals'] = []
    const routerMode = router?.mode || 'hash'
    this.isMultiRouterMode = routerMode === 'multi'
    this.appHelper = new AppHelper(entry as EntryNormalized, {
      sourceDir: this.sourceDir,
      frameworkExts,
      entryFileName,
      alias,
      defineConstants,
      modifyAppConfig,
    })

    modifyComponentConfig?.(componentConfig, config)

    const virtualEntryMap: { [entryPath: string]: string } = {}
    if (this.isBuildNativeComp) {
      delete entry[entryFileName]
      this.appHelper.compsConfigList.forEach((comp, index) => {
        try {
          resolveSync(comp, { extensions: ['.js', '.ts'] })
        } catch (e) {
          // 报错证明没有入口文件，通过虚拟模块补全入口文件
          this.isVirtualEntry = true
          // 添加后缀，否则 module.resource 解析出来的 name 是不带后缀的，导致 h5-loader 无法加入编译流程
          comp += '.js'
          virtualEntryMap[comp] = 'export default {}'
        }

        entry[index] = [comp]
      })
      this.webpackPlugin.pages = this.appHelper.appConfig?.components
    } else if (this.isMultiRouterMode) {
      delete entry[entryFileName]
      this.appHelper.pagesConfigList.forEach((page, index) => {
        entry[index] = [page]
      })
      this.webpackPlugin.pages = this.appHelper.appConfig?.pages
    }

    const webpackOutput = this.getOutput({
      publicPath,
      chunkDirectory,
      customOutput: output as Output,
      entryFileName
    })
    const module = this.webpackModule.getModules()
    const [, pxtransformOption] = this.webpackModule.__postcssOption.find(([name]) => name === 'postcss-pxtransform') || []
    this.webpackPlugin.pxtransformOption = pxtransformOption as any
    const plugin = this.webpackPlugin.getPlugins()

    if (this.isBuildNativeComp) {
      if (this.isVirtualEntry) {
        plugin.VirtualModule = WebpackPlugin.getPlugin(VirtualModulesPlugin, [virtualEntryMap])
      }

      // Note: 当开发者没有配置时，优先使用 module 导出组件
      if (!webpackOutput.libraryTarget && !(webpackOutput.library as LibraryOptions)?.type) {
        webpackOutput.library = {
          name: webpackOutput.library as (Exclude<typeof webpackOutput.library, LibraryOptions>),
          type: 'umd',
        }
      }
    }

    chain.merge({
      entry,
      output: webpackOutput,
      mode,
      devtool: this.getDevtool(sourceMapType),
      resolve: { alias },
      plugin,
      module,
      optimization: this.getOptimization(mode),
      externals,
    })
  }

  getOutput ({
    publicPath = '/', chunkDirectory, customOutput = {}, entryFileName = 'app'
  }: {
    publicPath: string
    chunkDirectory: IH5BuildConfig['chunkDirectory']
    customOutput?: Output
    entryFileName?: string
  }): Output {
    const filename: Output['filename'] = (chunk) => chunk.runtime === entryFileName ? 'js/[name].js' : '[name].js'
    return {
      path: this.outputDir,
      filename,
      chunkFilename: `${chunkDirectory}/[name].js`,
      publicPath: parsePublicPath(publicPath),
      ...customOutput
    }
  }

  getOptimization (nodeEnv: string) {
    const isProd = nodeEnv === 'production'

    const cacheGroups: Exclude<OptimizationSplitChunksOptions, false>['cacheGroups'] = {
      default: false,
      defaultVendors: false,
      common: {
        name: isProd ? false : 'common',
        minChunks: 2,
        priority: 1
      },
      vendors: {
        name: isProd ? false : 'vendors',
        minChunks: 2,
        test: (module: any) => {
          const nodeModulesDirRegx = new RegExp(REG_NODE_MODULES_DIR)
          return nodeModulesDirRegx.test(module.resource)
        },
        priority: 10
      },
      taro: {
        name: isProd ? false : 'taro',
        test: (module: any) => REG_TARO_SCOPED_PACKAGE.test(module.context),
        priority: 100
      }
    }
    const optimization: Optimization = {
      nodeEnv,
      chunkIds: isProd ? 'deterministic' : 'named', // false 或导致编译错误，natural、size、total-size 与 prebundle 特性不兼容
      removeEmptyChunks: true,
      splitChunks: {
        chunks: 'initial',
        hidePathInfo: true,
        minSize: 0,
        cacheGroups
      }
    }
    if (!isProd) {
      cacheGroups.name = false
      optimization.runtimeChunk = 'single'
    }
    // 组件编译模式下不做代码分割
    if (this.isBuildNativeComp) {
      optimization.splitChunks = false
      optimization.runtimeChunk = false
    }
    return optimization
  }
}
