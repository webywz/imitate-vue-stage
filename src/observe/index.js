import { isArray, isObject } from '../utils'
import { arrayMethods } from './array'
// 1.每个对象都有一个__proto__ 属性, 它指向所属类的原型本身
// 2. 每个原型上都有一个constructor 属性,指向函数本身
class Observer {
  constructor(value) {
    // 不让__ob__ 被遍历到
    // value.__ob__ = this // 给对象和数组添加一个自定义属性

    Object.defineProperty(value, '__ob__', {
      value: this,
      enumerable: false //表示这个属性不能被列举出来，不能被循环到
    })

    if (isArray(value)) {
      // 更改数组原型方法, 如果是数组,就重写数组的原型链
      value.__proto__ = arrayMethods // 重写数组方法
      this.observeArray(value)
    } else {
      this.walk(value) // 核心就是循环对象
    }
  }
  observeArray(data) {
    // 递归遍历数组,对数组内部的对象再次重写[[]] [{}]
    data.forEach((item) => {
      // 数组里如果是引用类型,那么是响应式
      observe(item)
    })
  }
  walk(data) {
    Object.keys(data).forEach((key) => {
      // 使用defineProperty重新定义
      defineReactive(data, key, data[key])
    })
  }
}
// vue2应用了defineProperty 需要一加载的时候就进行递归操作,如果层次过深也会浪费性能
// 1.性能优化的原则
// 1) 不要把所有的数据都放在data中,因为所有的数据都会增加get和set
// 2)不要写数据的时候层次过深, 尽量扁平化
// 3) 不要频繁获取数据
// 4)如果数据不需要响应式,可以使用Object.freeze 冻结属性

function defineReactive(obj, key, value) {
  observe(value) // 递归进行观测数据. 不管有多少层,我都进行defineProperty
  // vue2 慢的原因 主要在这个方法中
  Object.defineProperty(obj, key, {
    get() {
      return value // 闭包, 此value 会像上层的value进行查找
    },
    set(newValue) {
      // 如果设置的是一个对象,那么会再次进行劫持
      if (newValue === value) return
      observe(newValue)
      console.log('修改')
      value = newValue
    }
  })
}

export function observe(value) {
  // 1.如果value不是对象就不用观测了,说明写的有问题
  if (!isObject(value)) return

  if (value.__ob__) return // 一个对象不需要重新被观测

  // 2.需要对 对象进行观测, 最外层必须是一个{}, 不能是数组
  // 如果一个数据已经被观测过了, 就不要在进行观测了, 用类来实现, 观测过就增加一个标识,再观测的时候,可以先检测是否观测过,观测过了就跳过检测
  return new Observer(value)
}
