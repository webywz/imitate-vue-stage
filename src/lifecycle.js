import Watcher from './observe/watcher'
import { patch } from './vdom/patch'

export function mountComponent(vm) {
  let updataComponent = () => {
    vm._updata(vm._render())
  }

  callHook(vm, 'beforeCreate')
  new Watcher(
    vm,
    updataComponent,
    () => {
      console.log('后续增添更新钩子函数 updata')
      callHook(vm, 'create')
    },
    true
  )
  callHook(vm, 'mounted')
}

export function lifeCycleMixin(Vue) {
  Vue.prototype._updata = function (vnode) {
    // 采用 先序深度遍历, 创建节点,(遇到节点就创造节点,递归创建)
    const vm = this
    let preVnode = vm._preVnode
    // 第一次渲染是根据虚拟节点，生成真实节点，替换原来的节点
    vm._preVnode = vnode
    // 第二次，生成一个新的虚拟节点，和老的虚拟节点进行对比
    if (!preVnode) {
      vm.$el = patch(vm.$el, vnode)
    } else {
      vm.$el = patch(preVnode, vnode)
    }
  }
}

export function callHook(vm, hook) {
  let handlers = vm.$options[hook]
  if (handlers) {
    handlers.forEach((fn) => {
      fn.call(vm) // 生命周期的this 永远指向实例
    })
  }
}
