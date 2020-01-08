import commonjs from '@rollup/plugin-commonjs' // Convert CommonJS modules to ES6
import vue from 'rollup-plugin-vue' // Handle .vue SFC files
import buble from '@rollup/plugin-buble' // Transpile/polyfill with reasonable browser support
import { terser } from 'rollup-plugin-terser'
import cssnano from 'cssnano'

export default {
  input: './src/wrapper.js', // Path relative to package.json
  output: [
    {
      file: 'build/calculator.umd.js',
      format: 'umd',
      plugins: [terser()],
      name: 'VueCalculator',
    },
    {
      file: 'build/calculator.js',
      format: 'cjs',
      plugins: [terser()],
    },
    {
      file: 'build/calculator.esm.js',
      format: 'esm',
    },
  ],
  plugins: [
    commonjs(),
    vue({
      // sourcemap: false,
      // sourceMap: false,
      style: {
        postcssPlugins: [cssnano],
      },
      css: true, // Dynamically inject css as a <style> tag
      compileTemplate: true, // Explicitly convert template to render function
    }),
    buble({
      objectAssign: true,
    }), // Transpile to ES5,
  ],
  external: ['Vue', 'vue-runtime-helpers'],
}
