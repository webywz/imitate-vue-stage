import { compileToFunction } from './compiler/index'
import { initGlobalApi } from './global-api/index'
import { initMixin } from './init'
import { lifeCycleMixin } from './lifecycle'
import { renderMixin } from './render'
import { createElm, patch } from './vdom/patch'
// vue 要如何实现， 原型模式， 所有的功能都能通过原型扩展的方式来添加
function Vue(options) {
  // 实现vue的初始化
  this._init(options)
}
initMixin(Vue)
renderMixin(Vue)
lifeCycleMixin(Vue)
initGlobalApi(Vue)

// 先生成一个虚拟节点
// let vm1 = new Vue({
//   data() {
//     return {
//       name: 'jw'
//     }
//   }
// })
// let render1 = compileToFunction(`<div>
//   <li key="A">A</li>
//   <li key="B">B</li>
//   <li key="C">C</li>
//   <li key="D">D</li>
// </div>`)
// let oldVnode = render1.call(vm1)
// let el1 = createElm(oldVnode)
// document.body.appendChild(el1)
// // 在生成一个新的虚拟节点， patch
// let vm2 = new Vue({
//   data() {
//     return {
//       name: 'zf'
//     }
//   }
// })
// {
//   /* <li key="F" style="color: green;">F</li>
//   <li key="B" style="color: grey;">B</li>
//   <li key="A" style="color: red;">A</li>
//   <li key="E" style="color: blue;">E</li>
//   <li key="P" style="color: blue;">P</li> */
// }
// let render2 = compileToFunction(`<div>
// <li key="F">F</li>
// <li key="B">B</li>
// <li key="A">A</li>
// <li key="E">E</li>
// <li key="P">P</li>
// </div>`)
// let newVnode = render2.call(vm2)
// setTimeout(() => {
//   patch(oldVnode, newVnode) // 比对两个虚拟节点差异，更新需要更新的地方
// }, 2000)
export default Vue

// 1.new Vue 会调用_init方法进行初始化
// 2.会将用户的选项放到vm.$options 上
// 3.会对当前属性上搜索有没有data数据
// 4.有data判断data是不是一个函数,如果是函数返回值 initData
// 5.observe 去观测data中的数据
// 6.vm上像取值也能取到data中的数据, vm._data = data 这样用户能取到data
// 7.用户觉得有点麻烦 vm.xxx => vm._data

// 8.如果更新对象不存在的属性,会导致视图不更新, 如果是数组更新索引和长度不会触发更新
// 9.如果替换成一个新对象,新对象会被进行劫持,如果是数组通过方法改变,也会被劫持
// 通过__ob__进行标识这个对象被监控过, (在vue中被监控对象身上都有一个__ob__ 这个属性)
// 10.如果你就像改索引，可以使用$set 方法，内部就是splice()

// 如果有el 需要挂载到页面上

// 依赖更新
//只有在根组件的情况， 每个属性都有一个dep
//1.vue里面用到了观察者模式，默认组件渲染的时候，会创建一个watcher （并且渲染视图）
//2.当视图渲染的时候，会取data中的数据，会走每个属性的get方法，就让这个属性的dep记录watcher
//3.同时让watcher 也记住dep （这个逻辑目前没用到）dep和watcher 是多对多的关系，因为一个属性可能对应多个视图，一个视图对应多个数据
//4.如果数据发生变化，会通知对应属性的dep ，依次通知存放的watcher去更新

// 1. Vue.component 注册成全局组件，内部会自动调用Vue.extend方法，返回组件的构造函数
// 2. 组件初始化的时候，会做成一个合并mergeOptions（自己的组件.__proto__ = 全局组件）
// 3. 内部会对模板进行编译操作_c（组件名字）做筛查，如果是组件就创造一个组件的虚拟节点，还会判断Ctor如果是对象会调用Vue.extend， 所有的组件都是通过Vue.extend方法来实现的（componentOptions里面放着组件的所有内容 属性的实现， 事件的实现，插槽的内容，Ctor）
// 4. 创建组件的真实节点，（new Ctor 拿到组件实例， 并且调用组件的$mount 方法 （会生成一个$el 对应组件模板渲染后的结果）） vnode.componentInstance = new Ctor() vnode.componentInstance => 组件渲染后结果
// 5. 将组件的vnode.componentInstance.$el 插入到父标签中
// 6. 组件在new Ctor()时 会进行组件的初始化， 给组件再次添加一个独立的渲染watcher（每个组件都有自己的watcher）更新时。只需要更新自己组件对用的渲染watcher（因为组件渲染时组件对用的属性会收集自己的渲染watcher
