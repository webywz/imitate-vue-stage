import { isObject, isReservedTag } from '../utils'

function createComponent(vm, tag, data, children, key, Ctor) {
  if (isObject(Ctor)) {
    //组件的定义一定是通过Vue.extend 进行包裹的
    Ctor = vm.$options._base.extend(Ctor)
  }

  data.hook = {
    // 组件的生命周期
    init(vnode) {
      // vnode.componentInstance.$el -> 对应组件渲染后的结果
      let child = (vnode.componentInstance = new Ctor({})) // 获取组件的真实dom
      child.$mount()
      // mount 挂载完毕后，会产生一个真实节点，这个节点在vm.$el 上 => 对应的就是组件的真实内容
    }
  }
  let componentVnode = vnode(vm, tag, data, undefined, key, undefined, { Ctor, children, tag }) // componentOptions 存放了一个重要的属性
  return componentVnode
}

// 返回虚拟节点
export function createElement(vm, tag, data = {}, ...children) {
  // 如何区分是组件还是元素节点？
  if (!isReservedTag(tag)) {
    let Ctor = vm.$options.components[tag]
    return createComponent(vm, tag, data, children, data.key, Ctor)
  }

  return vnode(vm, tag, data, children, data.key, undefined)
}

export function createText(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text)
}

// 看两个节点是不是相同节点，就看是不是tag和key是不是一样
// vue2就有一个性能问题，递归比对
export function isSameVnode(newVnode, oldVnode) {
  return newVnode.tag == oldVnode.tag && newVnode.key == oldVnode.key
}

function vnode(vm, tag, data, children, key, text, options) {
  return {
    vm,
    tag,
    children,
    data,
    key,
    text,
    componentOptions: options
  }
}
