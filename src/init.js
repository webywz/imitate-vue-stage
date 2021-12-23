import { compileToFunction } from './compiler/index'
import { initState } from './state'

export function initMixin(Vue) {
  // 后续组件化开发的时候，Vue.extend 可以创造子组件， 子组件可以继承Vue，子组件也可以调用_init 方法
  Vue.prototype._init = function (options) {
    const vm = this
    // 把用户的选项放vm上， 这样在其他方法中都可以获取到options
    vm.$options = options

    //$options选项
    // options 中是用户传入的数据 el， data
    initState(vm)
    if (vm.$options.el) {
      // 要将数据挂载到页面上
      // 现在数据已经被劫持了，数据变化需要更新视图，diff算法更新需要更新的部分
      // vue => template (写起来更符合直觉) => jsx(灵活)
      // vue3 template 写起来性能会更高一些， 内部做了跟多优化
      // template -> ast 语法树(用来描述语法的，描述语法本身的) => 描述成一个树结构 => 将代码重组成js语法
      // 模板编译原理(把template 模板编译成 render函数 => 虚拟dom => diff算法比对虚拟dom)
      // ast => render返回 => vnode => 生成真是dom
      //        更新的时候调用render => 新的vnode => 新旧对比 => 更新真实dom
      vm.$mount(vm.$options.el)
    }
  }
  Vue.prototype.$mount = function (el) {
    const vm = this
    const opts = vm.$options
    el = document.querySelector(el) // 获取真实元素
    vm.$el = el // 页面真实元素

    if (!opts.render) {
      // 模板编译
      let template = opts.template
      if (!template) {
        template = el.outerHTML
      }
      let render = compileToFunction(el.outerHTML)
      opts.render = render
    }
  }
}
