(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

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
          // 儿子有值，父没有值
          if (isArray(childVal)) {
            return childVal
          } else {
            return [childVal] // 如果没值就变成数组
          }
        }
      } else {
        return parentVal
      }
    };
  });

  strats.components = function (parentVal, childVal) {
    let res = Object.create(parentVal);

    if (childVal) {
      // 合并后产生新对象，不用原来的
      for (let key in childVal) {
        res[key] = childVal[key];
      }
    }
    return res
  };

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

  function makeMap(str) {
    let tagList = str.split(',');
    return function (tagName) {
      return tagList.includes(tagName)
    }
  }

  const isReservedTag = makeMap(
    'template,script,style,element,content,slot,link,meta,svg,view,button,' +
      'a,div,img,image,text,span,input,switch,textarea,spinner,select,' +
      'slider,slider-neighbor,indicator,canvas,' +
      'list,cell,header,loading,loading-indicator,refresh,scrollable,scroller,' +
      'video,web,embed,tabbar,tabheader,datepicker,timepicker,marquee,countdown'
  );

  function initGlobalApi(Vue) {
    Vue.options = {}; // 全局属性，在每个组件初始化的时候，将这些属性放到每个组件上
    Vue.mixin = function (options) {
      this.options = mergeOptions(this.options, options);
      return this
    };
    Vue.options._base = Vue;
    // 通过Vue.extend 方法可以产生一个子类，new子类的时候会执行代码初始化流程（组件的初始化）
    Vue.extend = function (opt) {
      // 会产生一个子类
      const Super = this;
      const Sub = function (options) {
        // 创造一个组件，就是new这个组件的类（组件初始化）
        this._init(options);
      };
      Sub.prototype = Object.create(Super.prototype); // 继承原型方法
      Sub.prototype.constructor = Sub; // Object.create 会产生一个新的实例作为子类的原型，此时constructor会指向错误
      Sub.options = mergeOptions(Super.options, opt);
      // Sub.mixin = Vue.mixin
      // ....
      return Sub
    };
    Vue.options.components = {};
    Vue.component = function (id, definition) {
      // definition可以传入对象或函数
      let name = definition.name || id;
      definition.name = name;
      if (isObject(definition)) {
        definition = Vue.extend(definition);
      }
      Vue.options.components[name] = definition;
    };
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

  function createComponent$1(vm, tag, data, children, key, Ctor) {
    if (isObject(Ctor)) {
      //组件的定义一定是通过Vue.extend 进行包裹的
      Ctor = vm.$options._base.extend(Ctor);
    }

    data.hook = {
      // 组件的生命周期
      init(vnode) {
        // vnode.componentInstance.$el -> 对应组件渲染后的结果
        let child = (vnode.componentInstance = new Ctor({})); // 获取组件的真实dom
        child.$mount();
        // mount 挂载完毕后，会产生一个真实节点，这个节点在vm.$el 上 => 对应的就是组件的真实内容
      }
    };
    let componentVnode = vnode(vm, tag, data, undefined, key, undefined, { Ctor, children, tag }); // componentOptions 存放了一个重要的属性
    return componentVnode
  }

  // 返回虚拟节点
  function createElement(vm, tag, data = {}, ...children) {
    // 如何区分是组件还是元素节点？
    if (!isReservedTag(tag)) {
      let Ctor = vm.$options.components[tag];
      return createComponent$1(vm, tag, data, children, data.key, Ctor)
    }

    return vnode(vm, tag, data, children, data.key, undefined)
  }

  function createText(vm, text) {
    return vnode(vm, undefined, undefined, undefined, undefined, text)
  }

  // 看两个节点是不是相同节点，就看是不是tag和key是不是一样
  // vue2就有一个性能问题，递归比对
  function isSameVnode(newVnode, oldVnode) {
    return newVnode.tag == oldVnode.tag && newVnode.key == oldVnode.key
  }

  function vnode(vm, tag, data, children, key, text, options) {
    return {
      vm,
      tag,
      children,
      data,
      key,
      text,
      componentOptions: options
    }
  }

  function patch(oldVnode, vnode) {
    if (!oldVnode) {
      // 组件的挂载流程
      return createElm(vnode) // 产生组件的真实节点
    }

    const isRealElement = oldVnode.nodeType;

    if (isRealElement) {
      const elm = createElm(vnode); // 根据虚拟节点创造了真实节点
      const parentNode = oldVnode.parentNode;
      parentNode.insertBefore(elm, oldVnode.nextSibling);
      parentNode.removeChild(oldVnode);
      return elm
    } else {
      // 不管想怎么diff 最终想更新渲染 => dom操作里去
      // diff算法
      // 只比较同级，如果不一样，儿子就不用比对了,根据当前节点，创建节点，全部替换掉
      if (!isSameVnode(vnode, oldVnode)) {
        // 如果新旧节点不是同一个，删除老的换成新的
        return oldVnode.el.parentNode.replaceChild(createElm(vnode), oldVnode.el)
      }
      let el = (vnode.el = oldVnode.el); // 复用节点
      if (!oldVnode.tag) {
        // 文本,另一个一定也是个文本
        if (oldVnode.text !== vnode.text) {
          return (el.textContent = vnode.text)
        }
      }
      // 元素 新的虚拟节点
      updataProperties(vnode, oldVnode.data);
      // 相同节点，复用节点，再更新不一样的内容（属性）
      // 比较儿子节点
      let oldChildren = oldVnode.children || [];
      let newChildren = vnode.children || [];
      // 情况1： 老的有儿子，新的没儿子
      if (oldChildren.length > 0 && newChildren.length == 0) {
        el.innerHTML = '';
      } else if (newChildren.length > 0 && oldChildren.length == 0) {
        // 新的有儿子节点，老的没有儿子节点，直接插入新的节点
        newChildren.forEach((child) => {
          el.appendChild(createElm(child));
        });
      } else {
        // 新老都有儿子节点
        updataChildren(el, oldChildren, newChildren);
      }
      return el
    }
  }

  function updataChildren(el, oldChildren, newChildren) {
    //vue2 中如何做的diff算法
    // console.log(oldChildren, newChildren)
    //vue内部做的优化（尽量提升性能， 如果实在不行，在暴力对比）
    //1.在列表中新增和删除指针
    let oldStartIndex = 0;
    let oldStartVnode = oldChildren[0];
    let oldEndIndex = oldChildren.length - 1;
    let oldEndVnode = oldChildren[oldEndIndex];

    let newStartIndex = 0;
    let newStartVnode = newChildren[0];
    let newEndIndex = newChildren.length - 1;
    let newEndVnode = newChildren[newEndIndex];

    function makeKeyByUIndex(children) {
      console.log(children);
      let map = {};
      children.forEach((item, index) => {
        map[item.key] = index;
      });
      return map
    }

    let mapping = makeKeyByUIndex(oldChildren);
    //diff算法的复杂度是O（n） 比对的时候， 指针交叉的时候就是对比完成了
    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
      if (!oldStartVnode) {
        // 在指针移动的时候。可能元素已经被移动走了，那就跳过这一项
        oldStartVnode = oldChildren[++oldStartIndex];
      } else if (!oldEndVnode) {
        oldEndVnode = oldChildren[--oldEndIndex];
      } else if (isSameVnode(oldStartVnode, newStartVnode)) {
        //头头比较
        patch(oldStartVnode, newStartVnode); // 会递归比较子节点，同时比对两个的差异
        oldStartVnode = oldChildren[++oldStartIndex];
        newStartVnode = newChildren[++newStartIndex];
      } else if (isSameVnode(oldEndVnode, newEndVnode)) {
        // 尾尾比较
        patch(oldEndVnode, newEndVnode);
        oldEndVnode = oldChildren[--oldEndIndex];
        newEndVnode = newChildren[--newEndIndex];
      } else if (isSameVnode(oldStartVnode, newEndVnode)) {
        //头尾
        patch(oldStartVnode, newEndVnode);
        el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling);
        oldStartVnode = oldChildren[++oldStartIndex];
        newEndVnode = newChildren[--newEndIndex];
      } else if (isSameVnode(oldEndVnode, newStartVnode)) {
        // 尾头
        patch(oldEndVnode, newStartVnode);
        el.insertBefore(oldEndVnode.el, oldStartVnode.el); // 将尾部的插入到头部去
        oldEndVnode = oldChildren[--oldEndIndex];
        newStartVnode = newChildren[++newStartIndex];
      } else {
        //之前的逻辑都是考虑用户一些特殊情况，但是有非特殊的，比如乱序
        let moveIndex = mapping[newStartVnode.key];
        console.log(moveIndex);
        if (moveIndex == undefined) {
          // 没有。直接将节点插入到开头的前面
          el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
        } else {
          //有的话需要复用
          let moveVnode = oldChildren[moveIndex];
          patch(moveVnode, newStartVnode);
          el.insertBefore(moveVnode.el, oldStartVnode.el);
          oldChildren[moveIndex] = undefined;
        }
        newStartVnode = newChildren[++newStartIndex];
      }
    }
    // console.log(oldEndVnode, newEndVnode)
    if (newStartIndex <= newEndIndex) {
      //  这里可能是向前追加，可能是想后追加
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        // 看一下，当前尾节点的下一个元素是否存在，如果存在则是插入到下一个元素的前面去
        let anchor = newChildren[newEndIndex + 1] == null ? null : newChildren[newEndIndex + 1].el; // 参照物是固定的
        el.insertBefore(createElm(newChildren[i]), anchor);
      }
    }
    if (oldStartIndex <= oldEndIndex) {
      for (let i = oldStartIndex; i <= oldEndIndex; i++) {
        // 老的多余的，需要删除掉
        let child = oldChildren[i]; // 因为child 可能是空节点，undefined，所以要跳过空节点
        child && el.removeChild(child.el);
      }
    }
  }

  function createComponent(vnode) {
    // 给组件预留一个初始化流程init
    let i = vnode.data;
    if ((i = i.hook) && (i = i.init)) {
      i(vnode);
    }
    if (vnode.componentInstance) {
      // 说明是组件
      return true
    }
  }

  function createElm(vnode) {
    let { tag, data, children, text, vm } = vnode;
    // 让虚拟节点和真实节点做映射关系, 后续某个节点更新了,可以跟踪到真实节点,并且更新真实节点
    if (typeof tag === 'string') {
      if (createComponent(vnode)) {
        return vnode.componentInstance.$el
      }
      vnode.el = document.createElement(tag);
      updataProperties(vnode);
      debugger
      children.forEach((child) => {
        vnode.el.appendChild(createElm(child));
      });
    } else {
      vnode.el = document.createTextNode(text);
    }
    return vnode.el
  }

  // 后续写diff算法的时候 在完善
  function updataProperties(vnode, oldProps = {}) {
    // for (let key in props) {
    //   el.setAttribute(key, props[key])
    // }
    // 这里的逻辑可能是初次渲染，初次渲染直接用oldProps 给vnode的el复制即可
    // 更新逻辑拿到老的props和vnode里面的data进行比对
    let el = vnode.el;
    let newProps = vnode.data || {};

    let newStyle = newProps.style || {};
    let oldStyle = oldProps.style || {};

    for (let key in oldStyle) {
      // 老的样式有，新的没有，就把页面上的样式删除掉
      if (!newStyle[key]) {
        el.style[key] = '';
      }
    }
    // 新旧比对，两个对象如何比对差异
    for (let key in newProps) {
      if (key == 'style') {
        for (let key in newStyle) {
          el.style[key] = newStyle[key];
        }
      } else {
        el.setAttribute(key, newProps[key]);
      }
    }
    for (let key in oldProps) {
      if (!newProps[key]) {
        el.removeAttribute(key);
      }
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
      let preVnode = vm._preVnode;
      // 第一次渲染是根据虚拟节点，生成真实节点，替换原来的节点
      vm._preVnode = vnode;
      // 第二次，生成一个新的虚拟节点，和老的虚拟节点进行对比
      if (!preVnode) {
        vm.$el = patch(vm.$el, vnode);
      } else {
        vm.$el = patch(preVnode, vnode);
      }
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
      // 因为全局定义的内容，会混合在当前实例上
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
        let template = opts.template;
        if (!template) {
          template = el.outerHTML;
        }
        let render = compileToFunction(template);
        opts.render = render;
      }
      mountComponent(vm);
    };
    Vue.prototype.$nextTick = nextTick;
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

  // 1. Vue.component 注册成全局组件，内部会自动调用Vue.extend方法，返回组件的构造函数
  // 2. 组件初始化的时候，会做成一个合并mergeOptions（自己的组件.__proto__ = 全局组件）
  // 3. 内部会对模板进行编译操作_c（组件名字）做筛查，如果是组件就创造一个组件的虚拟节点，还会判断Ctor如果是对象会调用Vue.extend， 所有的组件都是通过Vue.extend方法来实现的（componentOptions里面放着组件的所有内容 属性的实现， 事件的实现，插槽的内容，Ctor）
  // 4. 创建组件的真实节点，（new Ctor 拿到组件实例， 并且调用组件的$mount 方法 （会生成一个$el 对应组件模板渲染后的结果）） vnode.componentInstance = new Ctor() vnode.componentInstance => 组件渲染后结果
  // 5. 将组件的vnode.componentInstance.$el 插入到父标签中
  // 6. 组件在new Ctor()时 会进行组件的初始化， 给组件再次添加一个独立的渲染watcher（每个组件都有自己的watcher）更新时。只需要更新自己组件对用的渲染watcher（因为组件渲染时组件对用的属性会收集自己的渲染watcher

  return Vue;

}));
//# sourceMappingURL=vue.js.map
