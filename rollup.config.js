import commonjs from '@rollup/plugin-commonjs' // Convert CommonJS modules to ES6
import vue from 'rollup-plugin-vue' // Handle .vue SFC files
import buble from '@rollup/plugin-buble' // Transpile/polyfill with reasonable browser support
import { terser } from 'rollup-plugin-terser'
import cssnano from 'cssnano'

export default {
  input: 'src/wrapper.js', // Path relative to package.json
  output: {
    name: 'Calculator',
    exports: 'named',
      sourceMap: false,
      sourcemap: false,
  },
  plugins: [
    commonjs(),
    vue({
      sourcemap: false,
      sourceMap: false,
      style: {
        postcssPlugins: [cssnano],
      },
      css: true, // Dynamically inject css as a <style> tag
      compileTemplate: true, // Explicitly convert template to render function
    }),
    buble({
      objectAssign: true,
    }), // Transpile to ES5,
    terser({
      sourcemap: false,
      exclude: /\.esm\./,
    }),
  ],
}
