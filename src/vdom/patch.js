export function patch(el, vnode) {
  const elm = createElm(vnode) // 根据虚拟节点创造了真实节点
  const parentNode = el.parentNode
  parentNode.insertBefore(elm, el.nextSibling)
  parentNode.removeChild(el)
}

function createElm(vnode) {
  let { tag, data, children, text, vm } = vnode
  // 让虚拟节点和真实节点做映射关系, 后续某个节点更新了,可以跟踪到真实节点,并且更新真实节点
  if (typeof tag === 'string') {
    vnode.el = document.createElement(tag)
    updataProperties(vnode.el, data)
    children.forEach((child) => {
      let childs = createElm(child)
      vnode.el.appendChild(childs)
    })
  } else {
    vnode.el = document.createTextNode(text)
  }
  return vnode.el
}

// 后续写diff算法的时候 在完善
function updataProperties(el, props = {}) {
  for (let key in props) {
    el.setAttribute(key, props[key])
  }
}
