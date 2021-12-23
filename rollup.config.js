import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
export default {
  input: './src/index.js', // 打包入口
  output: {
    file: 'dist/vue.js', // 打包出口
    // 打包常见格式：IIFE ESM CJS UMD
    format: 'umd',
    name: 'Vue', // umd模块需要配置name，会将导出的模块放在window上。如果在node中使用cjs，如果只是打包webpack里面导入 esm模块。 前端里使用script  iife，umd
    sourcemap: true
  },
  Plugin: [
    resolve(),
    babel({
      exclude: 'node_modules/**' // glob写法，去掉依赖库下的所有文件夹下的文件
    })
  ]
}
