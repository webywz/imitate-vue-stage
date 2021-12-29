import { isArray, isObject } from '../utils'
import { arrayMethods } from './array'
import Dep from './dep'
// 1.每个对象都有一个__proto__ 属性, 它指向所属类的原型本身
// 2. 每个原型上都有一个constructor 属性,指向函数本身
class Observer {
  constructor(value) {
    // 不让__ob__ 被遍历到
    // value.__ob__ = this // 给对象和数组添加一个自定义属性

    // 如果给一个对象添加一个不存在的属性，我希望也能更新视图{}.dep
    this.dep = new Dep() // 给对象和数组都增加dep属性
    Object.defineProperty(value, '__ob__', {
      value: this,
      enumerable: false //表示这个属性不能被列举出来，不能被循环到
    })

    if (isArray(value)) {
      // 更改数组原型方法, 如果是数组,就重写数组的原型链
      value.__proto__ = arrayMethods // 重写数组方法
      this.observeArray(value)

      // 数组如何依赖收集，数组更新的时候，如何触发更新
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

function dependArray(value) {
  // 让数组的引用类型都收集依赖
  for (let i = 0; i < value.length; i++) {
    let current = value[i]
    current.__ob__ && current.__ob__.dep.depend()
    if (Array.isArray(current)) {
      dependArray(current)
    }
  }
}

function defineReactive(obj, key, value) {
  let childOb = observe(value) // 递归进行观测数据. 不管有多少层,我都进行defineProperty
  //childOb 如果有值 那么就是数组或对象
  // 数组的dep

  // vue2 慢的原因 主要在这个方法中
  let dep = new Dep() // 每个属性都增加一个dep
  Object.defineProperty(obj, key, {
    get() {
      // debugger
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          // 取属性的时候，会对对应的值（对象本身和数组）进行依赖收集
          childOb.dep.depend() // 让数组和对象也记住当前的watcher
          if (Array.isArray(value)) {
            // 可能是数组套数组的可能
            dependArray(value)
          }
        }
      }

      return value // 闭包, 此value 会像上层的value进行查找
    },
    // 一个属性可能对应多个watcher， 数组也有更新
    set(newValue) {
      // 如果设置的是一个对象,那么会再次进行劫持
      if (newValue === value) return
      observe(newValue)
      // console.log('修改')
      value = newValue
      dep.notify()
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

// 1.默认vue在初始化的时候，会对对象每一个属性都进行劫持， 增加dep属性，当取值的时候会做依赖收集
// 2.默认还会对属性值是（对象和数组的本身进行增加dep属性） 进行依赖收集
// 3.如果是属性变化 触发属性对应的dep去更新
// 4.如果是数组更新，触发数组的本身的dep 进行更新
// 5.如果是数组还要 让数组中的对象类型也进行依赖收集（递归依赖收集）

// 6.如果数组里面放对象，默认对象里的属性是会进行依赖收集的，因为在取值时，会进行JSON.stringify操作
