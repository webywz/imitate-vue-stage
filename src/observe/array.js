let oldArrayPrototype = Array.prototype // 获取老的数组的原型方法

export let arrayMethods = Object.create(oldArrayPrototype) // 让arrayMethods 通过__proto__能获取到数组的方法

let methods = ['push', 'shift', 'pop', 'unshift', 'reverse', 'sort', 'splice']

methods.forEach((method) => {
  arrayMethods[method] = function (...args) {
    // 数组的方法进行重写
    // console.log('数组的方法进行重写')
    // 数组新增的属性，要看一下是不是对象，如果是对象，继续进行劫持

    // 需要调用数组原生逻辑
    oldArrayPrototype[method].call(this, ...args)
    // 可以添加自己逻辑，函数劫持，切片
    let inserted = []
    let ob = this.__ob__
    switch (method) {
      case 'splice': // 修改 删除 添加
        inserted = args.slice(2) // splice 方法从第三个参数起，是增添的新数据
        break
      case 'push':
      case 'unshift':
        inserted = args
        break
    }
    // inserted[] 遍历数组 看一下他是否需要进行二次劫持
    if (inserted) {
      ob.observeArray(inserted)
    }
    ob.dep.notify() // 触发页面更新流程
  }
})

// 属性的查找: 是先找自己身上的,找不到去原型上查找
// arrayMethods.push()
// arrayMethods.shift()
// arrayMethods.pop()
// arrayMethods.unshift()
// arrayMethods.reverse()
// arrayMethods.sort()
// arrayMethods.splice()
