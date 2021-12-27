import Watcher from './observe/watcher'
import { patch } from './vdom/patch'

export function mountComponent(vm) {
  let updataComponent = () => {
    vm._updata(vm._render())
  }

  new Watcher(
    vm,
    updataComponent,
    () => {
      console.log('后续增添更新钩子函数 updata')
    },
    true
  )
}

export function lifeCycleMixin(Vue) {
  Vue.prototype._updata = function (vnode) {
    // 采用 先序深度遍历, 创建节点,(遇到节点就创造节点,递归创建)
    const vm = this
    vm.$el = patch(vm.$el, vnode)
  }
}
