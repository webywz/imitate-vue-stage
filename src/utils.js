export function isFunction(val) {
  return typeof val == 'function'
}

export function isObject(val) {
  return typeof val == 'object' && val !== null
}

let callbacks = []
let waiting = false
function flushCallbacks() {
  callbacks.forEach((fn) => fn())
  callbacks = []
  waiting = false
}
export function nextTick(fn) {
  // vue3里面的nextTick 就是promise , vue2里面做了一些兼容性处理
  // return Promise.resolve().then(fn)
  callbacks.push(fn)
  if (!waiting) {
    Promise.resolve().then(flushCallbacks)
    waiting = true
  }
}

export let isArray = Array.isArray
