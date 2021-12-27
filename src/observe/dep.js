let id = 0
// dep.subs = [watcher]
// watcher.deps = [dep]
class Dep {
  constructor() {
    // 把watcher 放到dep
    this.subs = []
    this.id = id++
  }
  depend() {
    // 要给watcher 也加一个标识，防止重复
    // 让dep记住这个watcher watcher还要记住dep 相互关系
    Dep.target.addDep(this) // 在watcher中在调用addSub方法
  }
  addSub(watcher) {
    this.subs.push(watcher)
  }
  notify() {
    this.subs.forEach((watcher) => watcher.updata())
  }
}
Dep.target = null // 这里是一个全局的变量 window.target 静态属性

export default Dep
