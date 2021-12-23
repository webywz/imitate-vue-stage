import { parserHTML } from './parser'

export function compileToFunction(template) {
  // 1.将模板变成ast语法树
  let ast = parserHTML(template)
  // console.log(ast)
  // 代码优化 标记静态节点

  // 代码生成

  // 1. 编译原理
  // 2.响应式原理 依赖搜集
  // 3.组件化开发（贯穿了vue的流程）
  // 4.diff算法
}
