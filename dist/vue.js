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

  function patch(el, vnode) {
    const elm = createElm(vnode); // 根据虚拟节点创造了真实节点
    const parentNode = el.parentNode;
    parentNode.insertBefore(elm, el.nextSibling);
    console.log(parentNode);
    parentNode.removeChild(elm);
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
    vm._updata(vm._render());
  }

  function lifeCycleMixin(Vue) {
    Vue.prototype._updata = function (vnode) {
      // 采用 先序深度遍历, 创建节点,(遇到节点就创造节点,递归创建)
      const vm = this;
      vm.$el = patch(vm.$el, vnode);
    };
  }

  function isFunction(val) {
    return typeof val == 'function'
  }

  function isObject(val) {
    return typeof val == 'object' && val !== null
  }

  let isArray = Array.isArray;

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

      Object.defineProperty(value, '__ob__', {
        value: this,
        enumerable: false //表示这个属性不能被列举出来，不能被循环到
      });

      if (isArray(value)) {
        // 更改数组原型方法, 如果是数组,就重写数组的原型链
        value.__proto__ = arrayMethods; // 重写数组方法
        this.observeArray(value);
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

  function defineReactive(obj, key, value) {
    observe(value); // 递归进行观测数据. 不管有多少层,我都进行defineProperty
    // vue2 慢的原因 主要在这个方法中
    Object.defineProperty(obj, key, {
      get() {
        return value // 闭包, 此value 会像上层的value进行查找
      },
      set(newValue) {
        // 如果设置的是一个对象,那么会再次进行劫持
        if (newValue === value) return
        observe(newValue);
        console.log('修改');
        value = newValue;
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
      vm.$options = options;

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

  return Vue;

}));
//# sourceMappingURL=vue.js.map
