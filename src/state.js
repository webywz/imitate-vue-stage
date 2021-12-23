import { observe } from './observe/index'
import { isFunction } from './utils'

export function initState(vm) {
  const opts = vm.$options
  if (opts.data) {
    initData(vm)
  }
}

function proxy(vm, key, source) {
  // 取值的时候做代理, 不是暴力的把_data 属性赋值给vm, 而且直接赋值会有命名冲突问题
  Object.defineProperty(vm, key, {
    get() {
      return vm[source][key]
    },
    set(newValue) {
      vm[source][key] = newValue
    }
  })
}

function initData(vm) {
  let data = vm.$options.data
  // 如果用户传递的是一个函数,则取函数的返回值作为对象, 如果就是对象就直接使用那个对象
  data = vm._data = isFunction(data) ? data.call(vm) : data //_data已经是响应值了
  // 需要将data 变成响应式的,Object.defineProperty, 重写data中的所有属性
  observe(data)

  for (let key in data) {
    // vm.msg => vm._data.msg
    proxy(vm, key, '_data')
  }
}
