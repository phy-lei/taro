import { fs, REG_TARO_H5 } from '@tarojs/helper'
import { isString } from '@tarojs/shared'

import { h5iVitePlugin } from './vite.h5'
import { harmonyVitePlugin } from './vite.harmony'
import { miniVitePlugin } from './vite.mini'
import { modifyH5WebpackChain } from './webpack.h5'
import { modifyHarmonyWebpackChain } from './webpack.harmony'
import { modifyMiniWebpackChain } from './webpack.mini'

import type { IPluginContext } from '@tarojs/service'
import type { PluginOption } from 'vite'

export const RECONCILER_NAME = '@tarojs/plugin-framework-solid/dist/reconciler'

export default (ctx: IPluginContext) => {
  const { framework } = ctx.initialConfig

  if (framework !== 'solid') return

  ctx.modifyWebpackChain(({ chain }) => {
    // 通用

    chain.plugin('definePlugin').tap((args) => {
      const config = args[0]
      config.__TARO_FRAMEWORK__ = `"${framework}"`
      return args
    })

    if (process.env.TARO_PLATFORM === 'web') {
      // H5
      modifyH5WebpackChain(ctx, chain)
    } else if (process.env.TARO_PLATFORM === 'harmony' || process.env.TARO_ENV === 'harmony') {
      // 鸿蒙
      modifyHarmonyWebpackChain(chain)
    } else {
      // 小程序
      modifyMiniWebpackChain(chain)
    }
  })

  ctx.modifyRunnerOpts(({ opts }) => {
    if (!opts?.compiler) return

    if (isString(opts.compiler)) {
      opts.compiler = {
        type: opts.compiler,
      }
    }

    const { compiler } = opts
    if (compiler.type === 'webpack5') {
      // 提供给 webpack5 依赖预编译收集器的第三方依赖
      const deps = ['@tarojs/plugin-framework-solid/dist/runtime']
      compiler.prebundle ||= {}
      const prebundleOptions = compiler.prebundle
      prebundleOptions.include ||= []
      prebundleOptions.include = prebundleOptions.include.concat(deps)

      const taroSolidPlugin = {
        name: 'taroSolidPlugin',
        setup (build) {
          build.onLoad({ filter: REG_TARO_H5 }, ({ path }) => {
            const content = fs.readFileSync(path).toString()
            return {
              contents: require('./api-loader')(content),
            }
          })
          build.onLoad({ filter: /taro-platform-harmony-hybrid[\\/]dist[\\/]api[\\/]apis[\\/]taro/ }, ({ path }) => {
            const content = fs.readFileSync(path).toString()
            return {
              contents: require('./api-loader')(content)
            }
          })
        },
      }

      prebundleOptions.esbuild ||= {}
      const esbuildConfig = prebundleOptions.esbuild
      esbuildConfig.plugins ||= []
      esbuildConfig.plugins.push(taroSolidPlugin)
    } else if (compiler.type === 'vite') {
      compiler.vitePlugins ||= []
      compiler.vitePlugins.push(viteCommonPlugin())
      compiler.vitePlugins.push(VitePresetPlugin())
      if (process.env.TARO_PLATFORM === 'web') {
        // H5
        compiler.vitePlugins.push(h5iVitePlugin(ctx))
      } else if (process.env.TARO_PLATFORM === 'harmony' || process.env.TARO_ENV === 'harmony') {
        // 鸿蒙
        compiler.vitePlugins.push(harmonyVitePlugin(ctx))
      } else {
        // 小程序
        compiler.vitePlugins.push(miniVitePlugin(ctx))
      }
    }
  })
}

function VitePresetPlugin (): PluginOption {
  return require('vite-plugin-solid')
}

function viteCommonPlugin (): PluginOption {
  return {
    name: 'taro-solid:common',
    config () {
      const alias = [{ find: 'react/jsx-runtime', replacement: RECONCILER_NAME }]

      return {
        resolve: {
          alias,
        },
      }
    },
  }
}
