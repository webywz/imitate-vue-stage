import { isObject, mergeOptions } from '../utils'

export function initGlobalApi(Vue) {
  Vue.options = {} // 全局属性，在每个组件初始化的时候，将这些属性放到每个组件上
  Vue.mixin = function (options) {
    this.options = mergeOptions(this.options, options)
    return this
  }
  Vue.options._base = Vue
  // 通过Vue.extend 方法可以产生一个子类，new子类的时候会执行代码初始化流程（组件的初始化）
  Vue.extend = function (opt) {
    // 会产生一个子类
    const Super = this
    const Sub = function (options) {
      // 创造一个组件，就是new这个组件的类（组件初始化）
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype) // 继承原型方法
    Sub.prototype.constructor = Sub // Object.create 会产生一个新的实例作为子类的原型，此时constructor会指向错误
    Sub.options = mergeOptions(Super.options, opt)
    // Sub.mixin = Vue.mixin
    // ....
    return Sub
  }
  Vue.options.components = {}
  Vue.component = function (id, definition) {
    // definition可以传入对象或函数
    let name = definition.name || id
    definition.name = name
    if (isObject(definition)) {
      definition = Vue.extend(definition)
    }
    Vue.options.components[name] = definition
  }
}
