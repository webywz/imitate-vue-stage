import { patch } from './vdom/patch'

export function mountComponent(vm) {
  vm._updata(vm._render())
}

export function lifeCycleMixin(Vue) {
  Vue.prototype._updata = function (vnode) {
    // 采用 先序深度遍历, 创建节点,(遇到节点就创造节点,递归创建)
    const vm = this
    vm.$el = patch(vm.$el, vnode)
  }
}
