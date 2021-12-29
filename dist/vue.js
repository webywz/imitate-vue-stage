(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  function isFunction(val) {
    return typeof val == 'function'
  }

  function isObject(val) {
    return typeof val == 'object' && val !== null
  }

  let callbacks = [];
  let waiting = false;
  function flushCallbacks() {
    callbacks.forEach((fn) => fn());
    callbacks = [];
    waiting = false;
  }
  function nextTick(fn) {
    // vue3里面的nextTick 就是promise , vue2里面做了一些兼容性处理
    // return Promise.resolve().then(fn)
    callbacks.push(fn);
    if (!waiting) {
      Promise.resolve().then(flushCallbacks);
      waiting = true;
    }
  }

  let isArray = Array.isArray;

  // {} {beforeCreate: fn} => {beforeCreate: [fn]}
  // {beforeCreate: [fn]} {beforeCreate: fn} => {beforeCreate: [fn, fn]}

  let strats = {}; // 存放所有策略
  let lifeCycle = ['beforeCreate', 'created', 'beforeMount', 'mounted'];
  lifeCycle.forEach((hook) => {
    strats[hook] = function (parentVal, childVal) {
      if (childVal) {
        if (parentVal) {
          // 父子都有值 ，用父和子拼接在一起 ， 父有值就一直是数组
          return parentVal.concat(childVal)
        } else {
          return [childVal] // 如果没值就变成数组
        }
      } else {
        return parentVal
      }
    };
  });
  function mergeOptions(parentVal, childVal) {
    const options = {};
    for (const key in parentVal) {
      mergeFiled(key);
    }
    for (const key in childVal) {
      if (!parentVal.hasOwnProperty(key)) {
        mergeFiled(key);
      }
    }
    function mergeFiled(key) {
      // 设计模式   策略模式
      let strat = strats[key];
      if (strat) {
        options[key] = strat(parentVal[key], childVal[key]); // 合并两个值
      } else {
        options[key] = childVal[key] || parentVal[key];
      }
    }
    return options
  }

  function initGlobalApi(Vue) {
    Vue.options = {}; // 全局属性，在每个组件初始化的时候，将这些属性放到每个组件上
    Vue.mixin = function (options) {
      this.options = mergeOptions(this.options, options);
      return this
    };
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  function genProps(attrs) {
    //[key: value , key:value]
    let str = '';
    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];
      if (attr.name === 'style') {
        let styles = {};
        attr.value.replace(/([^;:]+):([^;:]+)/g, function () {
          styles[arguments[1]] = arguments[2];
        });
        attr.value = styles;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0, -1)}}`
  }

  function gen(el) {
    if (el.type == 1) {
      return generate(el) // 如果是元素就递归生成
    } else {
      let text = el.text;
      if (!defaultTagRE.test(text)) return `_v('${text}')` // 说明就是普通文本
      // 说明有表达式， 需要做一个表达式和普通值的拼接_v['aaa',_s(msg),'bbbb'].join('+')
      // _v('aaa' + _s(msg)+'bbb')
      let lastIndex = (defaultTagRE.lastIndex = 0);
      let tokens = [];
      let match;
      while ((match = defaultTagRE.exec(text))) {
        // 如果正则 + g 配合exec 就会有一个lastIndex 的问题
        let index = match.index;
        if (index > lastIndex) {
          tokens.push(JSON.stringify(text.slice(lastIndex, index)));
        }
        tokens.push(`_s(${match[1].trim()})`);
        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)));
      }
      return `_v(${tokens.join('+')})`
    }
  }

  function genChildren(el) {
    let children = el.children;
    if (children) {
      return children.map((item) => gen(item)).join(',')
    }
    return false
  }
  function generate(ast) {
    let children = genChildren(ast);
    let code = `_c('${ast.tag}', ${ast.attrs.length ? genProps(ast.attrs) : 'undefined'}${
    children ? `,${children}` : ''
  })`;
    return code
  }

  const ncname = `[a-zA-z_][\\-\\.0-9_a-zA-Z]*`;
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 标签开头的正则， 捕获的内容是标签名
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的
  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>']+)))?/; // 属性匹配
  const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的
  function parserHTML(html) {
    // 可以不停的截取模板 ， 直到把模板全部解析完毕
    // 构建父子关系
    let stack = [];
    let root = null;
    function createASTElement(tag, attrs, parent = null) {
      return {
        tag,
        type: 1, // 元素
        children: [],
        parent,
        attrs
      }
    }
    function start(tag, attrs) {
      // 遇到开始标签就取栈中的最后一个作为父节点
      let parent = stack[stack.length - 1];
      let element = createASTElement(tag, attrs, parent);
      if (root == null) {
        // 说明当前节点就是根节点
        root = element;
      }
      if (parent) {
        element.parent = parent; // 更新p的parent属性，指向parent
        parent.children.push(element);
      }
      stack.push(element);
    }
    function end(tagName) {
      let endTag = stack.pop();
      if (endTag.tag != tagName) {
        console.log('标签出错');
      }
    }
    function text(chars) {
      let parent = stack[stack.length - 1];
      chars = chars.replace(/\s/g, '');
      if (chars) {
        parent.children.push({
          type: 2,
          text: chars
        });
      }
    }
    function advance(len) {
      html = html.substring(len);
    }
    function parserStartTag() {
      const start = html.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          attrs: []
        };
        advance(start[0].length);
        let end;
        let attr;
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          // 1.要有属性，不能为开始的结束标签
          match.attrs.push({ name: attr[1], value: attr[3] || attr[4] || attr[5] });
          advance(attr[0].length);
        }
        if (end) {
          advance(end[0].length);
        }
        return match
      }
      return false
    }
    while (html) {
      // 解析标签和文本
      let index = html.indexOf('<');
      if (index == 0) {
        // 解析开始标签， 并且把属性也解析出来
        const startTagMatch = parserStartTag();
        if (startTagMatch) {
          // 开始标签
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue
        }
        let endTagMatch;
        if ((endTagMatch = html.match(endTag))) {
          // 结束标签
          end(endTagMatch[1]);
          advance(endTagMatch[0].length);
          continue
        }
        break
      }
      // 文本
      if (index > 0) {
        let chars = html.substring(0, index);
        text(chars);
        advance(chars.length);
      }
    }
    return root
  }

  function compileToFunction(template) {
    // 1.将模板变成ast语法树
    let ast = parserHTML(template);
    // console.log(ast)
    // 代码优化 标记静态节点

    // 代码生成
    let code = generate(ast);
    let render = new Function(`with(this){return ${code}}`);
    return render
    // 1. 编译原理
    // 2.响应式原理 依赖搜集
    // 3.组件化开发（贯穿了vue的流程）
    // 4.diff算法
  }

  let id$1 = 0;
  // dep.subs = [watcher]
  // watcher.deps = [dep]
  class Dep {
    constructor() {
      // 把watcher 放到dep
      this.subs = [];
      this.id = id$1++;
    }
    depend() {
      // 要给watcher 也加一个标识，防止重复
      // 让dep记住这个watcher watcher还要记住dep 相互关系
      Dep.target.addDep(this); // 在watcher中在调用addSub方法
    }
    addSub(watcher) {
      this.subs.push(watcher);
    }
    notify() {
      this.subs.forEach((watcher) => watcher.updata());
    }
  }
  Dep.target = null; // 这里是一个全局的变量 window.target 静态属性

  let queue = []; // 这个存放要更新的watcher
  let has = {};

  function flushSchedulerQueue() {
    queue.forEach((watcher) => watcher.run());
    queue = [];
    has = {};
    pending = false;
  }

  let pending = false;
  function queueWatcher(watcher) {
    // 一般情况下，写去重，可以采用这种方式，如果你使用set的时候
    let id = watcher.id;
    if (has[id] == null) {
      has[id] = true;
      queue.push(watcher);
      if (!pending) {
        // 防抖 多次执行， 只走1次
        // setTimeout(() => {
        //   queue.forEach((watcher) => watcher.run())
        //   queue = []
        //   has = {}
        //   pending = false
        // }, 0)
        nextTick(flushSchedulerQueue);
        pending = true;
      }
    }
  }

  let id = 0;
  class Watcher {
    constructor(vm, fn, cb, options) {
      this.vm = vm;
      this.fn = fn;
      this.cb = cb;
      this.options = options;
      this.id = id++;
      this.depsId = new Set();
      this.deps = [];

      this.getter = fn; // fn就是页面渲染逻辑
      this.get(); // 表示上来后就做一次初始化
    }
    addDep(dep) {
      let did = dep.id;
      if (!this.depsId.has(did)) {
        this.depsId.add(did);
        this.deps.push(dep);
        dep.addSub(this);
      }
    }
    get() {
      // debugger
      Dep.target = this; // window.target = watcher
      this.getter(); // 页面渲染逻辑
      Dep.target = null; // 渲染完毕后，就将标识清空了，只有在渲染的时候才会进行依赖收集
    }
    updata() {
      // 每次更新数据都会同步调用这个updata方法，可以将更新的逻辑缓存起来，等会同步更新数据的逻辑执行完毕后，依次调用（去重逻辑）
      console.log('缓存更新');
      queueWatcher(this);
      // 可以做异步更新
      // this.get() vue.nextTick
    }
    run() {
      console.log('真正更新');
      this.get(); // render() 取最新的vm上的数据
    }
  }

  function patch(el, vnode) {
    const elm = createElm(vnode); // 根据虚拟节点创造了真实节点
    const parentNode = el.parentNode;
    parentNode.insertBefore(elm, el.nextSibling);
    parentNode.removeChild(el);
    return elm
  }

  function createElm(vnode) {
    let { tag, data, children, text, vm } = vnode;
    // 让虚拟节点和真实节点做映射关系, 后续某个节点更新了,可以跟踪到真实节点,并且更新真实节点
    if (typeof tag === 'string') {
      vnode.el = document.createElement(tag);
      updataProperties(vnode.el, data);
      children.forEach((child) => {
        let childs = createElm(child);
        vnode.el.appendChild(childs);
      });
    } else {
      vnode.el = document.createTextNode(text);
    }
    return vnode.el
  }

  // 后续写diff算法的时候 在完善
  function updataProperties(el, props = {}) {
    for (let key in props) {
      el.setAttribute(key, props[key]);
    }
  }

  function mountComponent(vm) {
    let updataComponent = () => {
      vm._updata(vm._render());
    };

    callHook(vm, 'beforeCreate');
    new Watcher(
      vm,
      updataComponent,
      () => {
        console.log('后续增添更新钩子函数 updata');
        callHook(vm, 'create');
      },
      true
    );
    callHook(vm, 'mounted');
  }

  function lifeCycleMixin(Vue) {
    Vue.prototype._updata = function (vnode) {
      // 采用 先序深度遍历, 创建节点,(遇到节点就创造节点,递归创建)
      const vm = this;
      vm.$el = patch(vm.$el, vnode);
    };
  }

  function callHook(vm, hook) {
    let handlers = vm.$options[hook];
    if (handlers) {
      handlers.forEach((fn) => {
        fn.call(vm); // 生命周期的this 永远指向实例
      });
    }
  }

  let oldArrayPrototype = Array.prototype; // 获取老的数组的原型方法

  let arrayMethods = Object.create(oldArrayPrototype); // 让arrayMethods 通过__proto__能获取到数组的方法

  let methods = ['push', 'shift', 'pop', 'unshift', 'reverse', 'sort', 'splice'];

  methods.forEach((method) => {
    arrayMethods[method] = function (...args) {
      // 数组的方法进行重写
      // console.log('数组的方法进行重写')
      // 数组新增的属性，要看一下是不是对象，如果是对象，继续进行劫持

      // 需要调用数组原生逻辑
      oldArrayPrototype[method].call(this, ...args);
      // 可以添加自己逻辑，函数劫持，切片
      let inserted = [];
      let ob = this.__ob__;
      switch (method) {
        case 'splice': // 修改 删除 添加
          inserted = args.slice(2); // splice 方法从第三个参数起，是增添的新数据
          break
        case 'push':
        case 'unshift':
          inserted = args;
          break
      }
      // inserted[] 遍历数组 看一下他是否需要进行二次劫持
      if (inserted) {
        ob.observeArray(inserted);
      }
      ob.dep.notify(); // 触发页面更新流程
    };
  });

  // 属性的查找: 是先找自己身上的,找不到去原型上查找
  // arrayMethods.push()
  // arrayMethods.shift()
  // arrayMethods.pop()
  // arrayMethods.unshift()
  // arrayMethods.reverse()
  // arrayMethods.sort()
  // arrayMethods.splice()

  // 1.每个对象都有一个__proto__ 属性, 它指向所属类的原型本身
  // 2. 每个原型上都有一个constructor 属性,指向函数本身
  class Observer {
    constructor(value) {
      // 不让__ob__ 被遍历到
      // value.__ob__ = this // 给对象和数组添加一个自定义属性

      // 如果给一个对象添加一个不存在的属性，我希望也能更新视图{}.dep
      this.dep = new Dep(); // 给对象和数组都增加dep属性
      Object.defineProperty(value, '__ob__', {
        value: this,
        enumerable: false //表示这个属性不能被列举出来，不能被循环到
      });

      if (isArray(value)) {
        // 更改数组原型方法, 如果是数组,就重写数组的原型链
        value.__proto__ = arrayMethods; // 重写数组方法
        this.observeArray(value);

        // 数组如何依赖收集，数组更新的时候，如何触发更新
      } else {
        this.walk(value); // 核心就是循环对象
      }
    }
    observeArray(data) {
      // 递归遍历数组,对数组内部的对象再次重写[[]] [{}]
      data.forEach((item) => {
        // 数组里如果是引用类型,那么是响应式
        observe(item);
      });
    }
    walk(data) {
      Object.keys(data).forEach((key) => {
        // 使用defineProperty重新定义
        defineReactive(data, key, data[key]);
      });
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
      let current = value[i];
      current.__ob__ && current.__ob__.dep.depend();
      if (Array.isArray(current)) {
        dependArray(current);
      }
    }
  }

  function defineReactive(obj, key, value) {
    let childOb = observe(value); // 递归进行观测数据. 不管有多少层,我都进行defineProperty
    //childOb 如果有值 那么就是数组或对象
    // 数组的dep

    // vue2 慢的原因 主要在这个方法中
    let dep = new Dep(); // 每个属性都增加一个dep
    Object.defineProperty(obj, key, {
      get() {
        // debugger
        if (Dep.target) {
          dep.depend();
          if (childOb) {
            // 取属性的时候，会对对应的值（对象本身和数组）进行依赖收集
            childOb.dep.depend(); // 让数组和对象也记住当前的watcher
            if (Array.isArray(value)) {
              // 可能是数组套数组的可能
              dependArray(value);
            }
          }
        }

        return value // 闭包, 此value 会像上层的value进行查找
      },
      // 一个属性可能对应多个watcher， 数组也有更新
      set(newValue) {
        // 如果设置的是一个对象,那么会再次进行劫持
        if (newValue === value) return
        observe(newValue);
        // console.log('修改')
        value = newValue;
        dep.notify();
      }
    });
  }

  function observe(value) {
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

  function initState(vm) {
    const opts = vm.$options;
    if (opts.data) {
      initData(vm);
    }
  }

  function proxy(vm, key, source) {
    // 取值的时候做代理, 不是暴力的把_data 属性赋值给vm, 而且直接赋值会有命名冲突问题
    Object.defineProperty(vm, key, {
      get() {
        return vm[source][key]
      },
      set(newValue) {
        vm[source][key] = newValue;
      }
    });
  }

  function initData(vm) {
    let data = vm.$options.data;
    // 如果用户传递的是一个函数,则取函数的返回值作为对象, 如果就是对象就直接使用那个对象
    data = vm._data = isFunction(data) ? data.call(vm) : data; //_data已经是响应值了
    // 需要将data 变成响应式的,Object.defineProperty, 重写data中的所有属性
    observe(data);

    for (let key in data) {
      // vm.msg => vm._data.msg
      proxy(vm, key, '_data');
    }
  }

  function initMixin(Vue) {
    // 后续组件化开发的时候，Vue.extend 可以创造子组件， 子组件可以继承Vue，子组件也可以调用_init 方法
    Vue.prototype._init = function (options) {
      const vm = this;
      // 把用户的选项放vm上， 这样在其他方法中都可以获取到options
      vm.$options = mergeOptions(vm.constructor.options, options);

      //$options选项
      // options 中是用户传入的数据 el， data
      initState(vm);
      if (vm.$options.el) {
        // 要将数据挂载到页面上
        // 现在数据已经被劫持了，数据变化需要更新视图，diff算法更新需要更新的部分
        // vue => template (写起来更符合直觉) => jsx(灵活)
        // vue3 template 写起来性能会更高一些， 内部做了跟多优化
        // template -> ast 语法树(用来描述语法的，描述语法本身的) => 描述成一个树结构 => 将代码重组成js语法
        // 模板编译原理(把template 模板编译成 render函数 => 虚拟dom => diff算法比对虚拟dom)
        // ast => render返回 => vnode => 生成真是dom
        //        更新的时候调用render => 新的vnode => 新旧对比 => 更新真实dom
        vm.$mount(vm.$options.el);
      }
    };
    Vue.prototype.$mount = function (el) {
      const vm = this;
      const opts = vm.$options;
      el = document.querySelector(el); // 获取真实元素
      vm.$el = el; // 页面真实元素

      if (!opts.render) {
        // 模板编译
        opts.template;
        let render = compileToFunction(el.outerHTML);
        opts.render = render;
      }
      mountComponent(vm);
    };
    Vue.prototype.$nextTick = nextTick;
  }

  // 返回虚拟节点
  function createElement(vm, tag, data = {}, ...children) {
    return vnode(vm, tag, data, children, data.key, undefined)
  }

  function createText(vm, text) {
    return vnode(vm, undefined, undefined, undefined, undefined, text)
  }

  function vnode(vm, tag, data, children, key, text) {
    return {
      vm,
      tag,
      children,
      data,
      key,
      text
    }
  }

  function renderMixin(Vue) {
    // createElement 创建元素型节点
    Vue.prototype._c = function () {
      const vm = this;
      return createElement(vm, ...arguments)
    };
    // 创建文本的虚拟节点
    Vue.prototype._v = function (text) {
      const vm = this;
      return createText(vm, text) // 描述虚拟节点是属于哪个实例
    };
    // JSON.stringify
    Vue.prototype._s = function (val) {
      if (isObject(val)) {
        return JSON.stringify(val)
      } else {
        return val
      }
    };
    Vue.prototype._render = function () {
      const vm = this;
      let { render } = vm.$options;
      let vnode = render.call(vm);
      return vnode
    };
  }

  // vue 要如何实现， 原型模式， 所有的功能都能通过原型扩展的方式来添加
  function Vue(options) {
    // 实现vue的初始化
    this._init(options);
  }
  initMixin(Vue);
  renderMixin(Vue);
  lifeCycleMixin(Vue);
  initGlobalApi(Vue);

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

  // 依赖更新
  //只有在根组件的情况， 每个属性都有一个dep
  //1.vue里面用到了观察者模式，默认组件渲染的时候，会创建一个watcher （并且渲染视图）
  //2.当视图渲染的时候，会取data中的数据，会走每个属性的get方法，就让这个属性的dep记录watcher
  //3.同时让watcher 也记住dep （这个逻辑目前没用到）dep和watcher 是多对多的关系，因为一个属性可能对应多个视图，一个视图对应多个数据
  //4.如果数据发生变化，会通知对应属性的dep ，依次通知存放的watcher去更新

  return Vue;

}));
//# sourceMappingURL=vue.js.map
