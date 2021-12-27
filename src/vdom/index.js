// 返回虚拟节点
export function createElement(vm, tag, data = {}, ...children) {
  return vnode(vm, tag, data, children, data.key, undefined)
}

export function createText(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text)
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
