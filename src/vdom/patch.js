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
    return el
  }
}

function updataChildren(el, oldChildren, newChildren) {
  //vue2 中如何做的diff算法
  // console.log(oldChildren, newChildren)
  //vue内部做的优化（尽量提升性能， 如果实在不行，在暴力对比）
  //1.在列表中新增和删除指针
  let oldStartIndex = 0
  let oldStartVnode = oldChildren[0]
  let oldEndIndex = oldChildren.length - 1
  let oldEndVnode = oldChildren[oldEndIndex]

  let newStartIndex = 0
  let newStartVnode = newChildren[0]
  let newEndIndex = newChildren.length - 1
  let newEndVnode = newChildren[newEndIndex]

  function makeKeyByUIndex(children) {
    console.log(children)
    let map = {}
    children.forEach((item, index) => {
      map[item.key] = index
    })
    return map
  }

  let mapping = makeKeyByUIndex(oldChildren)
  //diff算法的复杂度是O（n） 比对的时候， 指针交叉的时候就是对比完成了
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (!oldStartVnode) {
      // 在指针移动的时候。可能元素已经被移动走了，那就跳过这一项
      oldStartVnode = oldChildren[++oldStartIndex]
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex]
    } else if (isSameVnode(oldStartVnode, newStartVnode)) {
      //头头比较
      patch(oldStartVnode, newStartVnode) // 会递归比较子节点，同时比对两个的差异
      oldStartVnode = oldChildren[++oldStartIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      // 尾尾比较
      patch(oldEndVnode, newEndVnode)
      oldEndVnode = oldChildren[--oldEndIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else if (isSameVnode(oldStartVnode, newEndVnode)) {
      //头尾
      patch(oldStartVnode, newEndVnode)
      el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling)
      oldStartVnode = oldChildren[++oldStartIndex]
      newEndVnode = newChildren[--newEndIndex]
    } else if (isSameVnode(oldEndVnode, newStartVnode)) {
      // 尾头
      patch(oldEndVnode, newStartVnode)
      el.insertBefore(oldEndVnode.el, oldStartVnode.el) // 将尾部的插入到头部去
      oldEndVnode = oldChildren[--oldEndIndex]
      newStartVnode = newChildren[++newStartIndex]
    } else {
      //之前的逻辑都是考虑用户一些特殊情况，但是有非特殊的，比如乱序
      let moveIndex = mapping[newStartVnode.key]
      console.log(moveIndex)
      if (moveIndex == undefined) {
        // 没有。直接将节点插入到开头的前面
        el.insertBefore(createElm(newStartVnode), oldStartVnode.el)
      } else {
        //有的话需要复用
        let moveVnode = oldChildren[moveIndex]
        patch(moveVnode, newStartVnode)
        el.insertBefore(moveVnode.el, oldStartVnode.el)
        oldChildren[moveIndex] = undefined
      }
      newStartVnode = newChildren[++newStartIndex]
    }
  }
  // console.log(oldEndVnode, newEndVnode)
  if (newStartIndex <= newEndIndex) {
    //  这里可能是向前追加，可能是想后追加
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      // 看一下，当前尾节点的下一个元素是否存在，如果存在则是插入到下一个元素的前面去
      let anchor = newChildren[newEndIndex + 1] == null ? null : newChildren[newEndIndex + 1].el // 参照物是固定的
      el.insertBefore(createElm(newChildren[i]), anchor)
    }
  }
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      // 老的多余的，需要删除掉
      let child = oldChildren[i] // 因为child 可能是空节点，undefined，所以要跳过空节点
      child && el.removeChild(child.el)
    }
  }
}

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
