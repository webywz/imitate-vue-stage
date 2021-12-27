import { nextTick } from '../utils'

let queue = [] // 这个存放要更新的watcher
let has = {}

function flushSchedulerQueue() {
  queue.forEach((watcher) => watcher.run())
  queue = []
  has = {}
  pending = false
}

let pending = false
export function queueWatcher(watcher) {
  // 一般情况下，写去重，可以采用这种方式，如果你使用set的时候
  let id = watcher.id
  if (has[id] == null) {
    has[id] = true
    queue.push(watcher)
    if (!pending) {
      // 防抖 多次执行， 只走1次
      // setTimeout(() => {
      //   queue.forEach((watcher) => watcher.run())
      //   queue = []
      //   has = {}
      //   pending = false
      // }, 0)
      nextTick(flushSchedulerQueue)
      pending = true
    }
  }
}
