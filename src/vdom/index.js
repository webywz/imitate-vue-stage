// 返回虚拟节点
export function createElement(vm, tag, data = {}, ...children) {
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

function vnode(vm, tag, data, children, key, text) {
  return {
    vm,
    tag,
    children,
    data,
    key,
    text
  }
}
