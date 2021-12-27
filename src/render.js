import { isObject } from './utils'
import { createElement, createText } from './vdom/index'

export function renderMixin(Vue) {
  // createElement 创建元素型节点
  Vue.prototype._c = function () {
    const vm = this
    return createElement(vm, ...arguments)
  }
  // 创建文本的虚拟节点
  Vue.prototype._v = function (text) {
    const vm = this
    return createText(vm, text) // 描述虚拟节点是属于哪个实例
  }
  // JSON.stringify
  Vue.prototype._s = function (val) {
    if (isObject(val)) {
      return JSON.stringify(val)
    } else {
      return val
    }
  }
  Vue.prototype._render = function () {
    const vm = this
    let { render } = vm.$options
    let vnode = render.call(vm)
    return vnode
  }
}
