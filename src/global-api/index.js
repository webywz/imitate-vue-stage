import { mergeOptions } from '../utils'

export function initGlobalApi(Vue) {
  Vue.options = {} // 全局属性，在每个组件初始化的时候，将这些属性放到每个组件上
  Vue.mixin = function (options) {
    this.options = mergeOptions(this.options, options)
    return this
  }
}
