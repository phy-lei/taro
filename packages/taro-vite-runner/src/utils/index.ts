import { isNpmPkg, NODE_MODULES_REG, recursiveMerge, resolveSync } from '@tarojs/helper'
import { isFunction, isString } from '@tarojs/shared'
import path from 'path'
import querystring from 'querystring'

import { backSlashRegEx, MINI_EXCLUDE_POSTCSS_PLUGIN_NAME, needsEscapeRegEx, quoteNewlineRegEx } from './constants'
import createFilter from './createFilter'
import { logger } from './logger'

import type { RollupBabelInputPluginOptions } from '@rollup/plugin-babel'
import type { IPostcssOption } from '@tarojs/taro/types/compile'
import type { TRollupResolveMethod } from '@tarojs/taro/types/compile/config/plugin'
import type {
  ViteH5BuildConfig,
  ViteH5CompilerContext,
  ViteHarmonyBuildConfig,
  ViteHarmonyCompilerContext,
  ViteMiniBuildConfig,
  ViteMiniCompilerContext,
  VitePageMeta
} from '@tarojs/taro/types/compile/viteCompilerContext'
import type { CSSModulesOptions } from 'vite'
import type { Target } from 'vite-plugin-static-copy'

export function convertCopyOptions (taroConfig: ViteMiniBuildConfig | ViteH5BuildConfig | ViteHarmonyBuildConfig) {
  const copy = taroConfig.copy
  const copyOptions: Target[] = []
  copy?.patterns.forEach(({ from, to }) => {
    const { base, ext } = path.parse(to)
    to = to
      .replace(new RegExp('^' + taroConfig.outputRoot + '/'), '')
    let rename

    if (ext) {
      to = to.replace(base, '')
      rename = base
    } else {
      rename = '/'
    }

    copyOptions.push({
      src: from,
      dest: to,
      rename
    })
  })
  return copyOptions
}

export function prettyPrintJson (obj = {}) {
  return JSON.stringify(obj, null, 2)
}

export function getComponentName (viteCompilerContext: ViteH5CompilerContext | ViteHarmonyCompilerContext | ViteMiniCompilerContext, componentPath: string) {
  let componentName: string
  if (NODE_MODULES_REG.test(componentPath)) {
    componentName = componentPath
      .replace(viteCompilerContext.cwd, '')
      .replace(backSlashRegEx, '/')
      .replace(path.extname(componentPath), '')
      .replace(/node_modules/gi, 'npm')
  } else {
    componentName = componentPath
      .replace(viteCompilerContext.sourceDir, '')
      .replace(backSlashRegEx, '/')
      .replace(path.extname(componentPath), '')
  }

  return componentName.replace(/^(\/|\\)/, '')
}

const virtualModulePrefix ='\0'
export const virtualModulePrefixREG = new RegExp(`^${virtualModulePrefix}`)

export function appendVirtualModulePrefix (id: string): string {
  return virtualModulePrefix + id
}

export function stripVirtualModulePrefix (id: string): string {
  return id.replace(virtualModulePrefixREG, '')
}

export function isVirtualModule (id: string): boolean {
  return virtualModulePrefixREG.test(id)
}

export function isRelativePath (id: string | undefined): boolean {
  if (!isString(id)) return false

  if (path.isAbsolute(id)) return false

  if (/^[a-z][a-z0-9+.-]*:/i.test(id)) return false

  return true
}

export function stripMultiPlatformExt (id: string): string {
  return id.replace(new RegExp(`\\.${process.env.TARO_ENV}$`), '')
}

export const addLeadingSlash = (url = '') => (url.charAt(0) === '/' ? url : '/' + url)
export const addTrailingSlash = (url = '') => (url.charAt(url.length - 1) === '/' ? url : url + '/')
export const stripTrailingSlash = (url = '') => (url.charAt(url.length - 1) === '/' ? url.substring(0, url.length - 1) : url)

export function getMode (config: ViteH5BuildConfig | ViteHarmonyBuildConfig | ViteMiniBuildConfig) {
  const preMode = config.mode || process.env.NODE_ENV
  const modes: ('production' | 'development' | 'none')[] = ['production', 'development', 'none']
  const mode = modes.find(e => e === preMode)
    || (!config.isWatch || process.env.NODE_ENV === 'production' ? 'production' : 'development')
  return mode
}

export function genRouterResource (page: VitePageMeta) {
  return [
    'Object.assign({',
    `  path: '${page.name}',`,
    '  load: async function(context, params) {',
    `    const page = await import("${page.scriptPath}")`,
    '    return [page, context, params]',
    '  }',
    `}, ${JSON.stringify(page.config)})`
  ].join('\n')
}

export function getQueryParams (path: string) {
  return querystring.parse(path.split('?')[1])
}

export function generateQueryString (params: { [key: string] : string }): string {
  return querystring.stringify(params)
}

export function getPostcssPlugins (appPath: string, option = {} as IPostcssOption, excludePluginNames = MINI_EXCLUDE_POSTCSS_PLUGIN_NAME) {
  const plugins: any[] = []

  option.forEach(([pluginName, pluginOption, pluginPkg]) => {
    if (!pluginOption || excludePluginNames.includes(pluginName)) return
    if (Object.hasOwnProperty.call(pluginOption, 'enable') && !pluginOption.enable) return

    if (pluginPkg) {
      plugins.push(pluginPkg(pluginOption.config || {}))
      return
    }

    if (!isNpmPkg(pluginName)) {
      // local plugin
      pluginName = path.join(appPath, pluginName)
    }

    try {
      const pluginPath = resolveSync(pluginName, { basedir: appPath }) || ''
      plugins.push(require(pluginPath)(pluginOption.config || {}))
    } catch (e) {
      const msg = e.code === 'MODULE_NOT_FOUND' ? `缺少 postcss 插件 "${pluginName}", 已忽略` : e
      logger.info(msg)
    }
  })

  return plugins
}

export function getMinify (taroConfig: ViteMiniBuildConfig | ViteH5BuildConfig | ViteHarmonyBuildConfig): 'terser' | 'esbuild' | boolean {
  const isProd = getMode(taroConfig) === 'production'
  return !isProd
    ? false
    : taroConfig.jsMinimizer === 'esbuild'
      ? taroConfig.esbuild?.minify?.enable === false
        ? false // 只有在明确配置了 esbuild.minify.enable: false 时才不启用压缩
        : 'esbuild'
      : taroConfig.terser?.enable === false
        ? false // 只有在明确配置了 terser.enable: false 时才不启用压缩
        : 'terser'
}


export function getCSSModulesOptions(taroConfig: ViteMiniBuildConfig | ViteH5BuildConfig | ViteHarmonyBuildConfig): false | CSSModulesOptions {
  if (taroConfig.postcss?.cssModules?.enable !== true) return false
  const config = recursiveMerge(
    {},
    {
      namingPattern: 'module',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    taroConfig.postcss.cssModules.config
  )
  return {
    generateScopedName: config.generateScopedName,
  }
}


export function getBabelOption (
  taroConfig: ViteMiniBuildConfig | ViteH5BuildConfig | ViteHarmonyBuildConfig,
  filterConfig: {
    babelOption?: Partial<RollupBabelInputPluginOptions>
    defaultInclude?: (string | RegExp)[]
    defaultExclude?: (string | RegExp)[]
  } = {}
): RollupBabelInputPluginOptions {
  const { compile = {} } = taroConfig
  const { defaultExclude = [], defaultInclude = [], babelOption } = filterConfig
  const opts: RollupBabelInputPluginOptions = {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.es6', '.es', '.mjs', '.mts'],
    babelHelpers: 'runtime',
    skipPreflightCheck: true,
    compact: false,
    ...babelOption,
  }
  const filter = compile.filter
  if (isFunction(filter)) {
    opts.filter = filter
  } else {
    let exclude: (string | RegExp)[] = []
    let include: (string | RegExp)[] = []

    if (compile.exclude?.length) {
      const list = compile.exclude
      const isNodeModuleReseted = list.find((reg) => reg.toString().includes('node_modules'))
      if (!isNodeModuleReseted) list.push(...defaultExclude)
      exclude = list
    } else if (compile.include?.length) {
      include = [...compile.include, ...defaultInclude]
    } else {
      exclude = [...defaultExclude]
    }
    const filter = createFilter(include, exclude)
    opts.filter = filter
  }

  return opts
}

export function escapePath (p: string) {
  return p.replace(/\\{1,2}/g, '/')
}

export function parseRelativePath (from: string, to: string) {
  const relativePath = escapePath(path.relative(from, to))

  return /^\.{1,2}[\\/]/.test(relativePath)
    ? relativePath
    : /^\.{1,2}$/.test(relativePath)
      ? `${relativePath}/`
      : `./${relativePath}`
}

export function escapeId(id: string): string {
  if (!needsEscapeRegEx.test(id)) return id
  return id.replace(backSlashRegEx, '\\\\').replace(quoteNewlineRegEx, '\\$1')
}

export function resolveAbsoluteRequire ({
  name = '',
  importer = '',
  outputRoot = '',
  targetRoot = '',
  code = '',
  resolve,
  modifyResolveId
}: {
  importer: string
  code: string
  name?: string
  outputRoot?: string
  targetRoot?: string
  resolve?: TRollupResolveMethod
  modifyResolveId?: unknown
}) {
  outputRoot = escapePath(outputRoot)
  targetRoot = escapePath(targetRoot)
  return code.replace(/(?:import\s|from\s|require\()['"]([^.][^'"\s]+)['"]\)?/g, (src: string, source: string) => {
    importer = stripVirtualModulePrefix(importer)
    const absolutePath: string = escapePath(isFunction(modifyResolveId) ? modifyResolveId({
      source,
      importer,
      options: {
        isEntry: false,
        skipSelf: true,
      },
      name,
      resolve,
    })?.id || source : source)
    if (absolutePath.startsWith(outputRoot)) {
      const outputFile = path.resolve(
        outputRoot,
        path.isAbsolute(importer) ? path.relative(targetRoot, importer) : importer
      )
      const outputDir = path.dirname(outputFile)
      return src.replace(source, parseRelativePath(outputDir, absolutePath))
    } else if (absolutePath.startsWith(targetRoot)) {
      return src.replace(source, parseRelativePath(path.dirname(importer), absolutePath))
    }
    return src.replace(source, absolutePath)
  })
}