import { initMixin } from './init'
// vue 要如何实现， 原型模式， 所有的功能都能通过原型扩展的方式来添加
function Vue(options) {
  // 实现vue的初始化
  this._init(options)
}
initMixin(Vue)

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
