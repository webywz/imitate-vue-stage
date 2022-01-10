import { isSameVnode } from '../vdom/index'

export function patch(oldVnode, vnode) {
  const isRealElement = oldVnode.nodeType

  if (isRealElement) {
    const elm = createElm(vnode) // 根据虚拟节点创造了真实节点
    const parentNode = oldVnode.parentNode
    parentNode.insertBefore(elm, oldVnode.nextSibling)
    parentNode.removeChild(oldVnode)
    return elm
  } else {
    // 不管想怎么diff 最终想更新渲染 => dom操作里去
    // diff算法
    // 只比较同级，如果不一样，儿子就不用比对了,根据当前节点，创建节点，全部替换掉
    if (!isSameVnode(vnode, oldVnode)) {
      // 如果新旧节点不是同一个，删除老的换成新的
      return oldVnode.el.parentNode.replaceChild(createElm(vnode), oldVnode.el)
    }
    let el = (vnode.el = oldVnode.el) // 复用节点
    if (!oldVnode.tag) {
      // 文本,另一个一定也是个文本
      if (oldVnode.text !== vnode.text) {
        return (el.textContent = vnode.text)
      }
    }
    // 元素 新的虚拟节点
    updataProperties(vnode, oldVnode.data)
    // 相同节点，复用节点，再更新不一样的内容（属性）
    // 比较儿子节点
    let oldChildren = oldVnode.children || []
    let newChildren = vnode.children || []
    // 情况1： 老的有儿子，新的没儿子
    if (oldChildren.length > 0 && newChildren.length == 0) {
      el.innerHTML = ''
    } else if (newChildren.length > 0 && oldChildren.length == 0) {
      // 新的有儿子节点，老的没有儿子节点，直接插入新的节点
      newChildren.forEach((child) => {
        el.appendChild(createElm(child))
      })
    } else {
      // 新老都有儿子节点
      updataChildren(el, oldChildren, newChildren)
    }
  }
}

function updataChildren(el, oldChildren, newChildren) {}

export function createElm(vnode) {
  let { tag, data, children, text, vm } = vnode
  // 让虚拟节点和真实节点做映射关系, 后续某个节点更新了,可以跟踪到真实节点,并且更新真实节点
  if (typeof tag === 'string') {
    vnode.el = document.createElement(tag)
    updataProperties(vnode)
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
function updataProperties(vnode, oldProps = {}) {
  // for (let key in props) {
  //   el.setAttribute(key, props[key])
  // }
  // 这里的逻辑可能是初次渲染，初次渲染直接用oldProps 给vnode的el复制即可
  // 更新逻辑拿到老的props和vnode里面的data进行比对
  let el = vnode.el
  let newProps = vnode.data || {}

  let newStyle = newProps.style || {}
  let oldStyle = oldProps.style || {}

  for (let key in oldStyle) {
    // 老的样式有，新的没有，就把页面上的样式删除掉
    if (!newStyle[key]) {
      el.style[key] = ''
    }
  }
  // 新旧比对，两个对象如何比对差异
  for (let key in newProps) {
    if (key == 'style') {
      for (let key in newStyle) {
        el.style[key] = newStyle[key]
      }
    } else {
      el.setAttribute(key, newProps[key])
    }
  }
  for (let key in oldProps) {
    if (!newProps[key]) {
      el.removeAttribute(key)
    }
  }
}
