import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import cjs from 'rollup-plugin-cjs-es';

export default {
  input: 'index.js',
  output: {
    file: 'browser.js',
    format: 'es'
  },
  plugins: [
    cjs({
      nested: true
    }),
    nodeResolve({
      jsnext: true,
      main: true
    }),

    commonjs({
      // non-CommonJS modules will be ignored, but you can also
      // specifically include/exclude files
      include: 'node_modules/**', // Default: undefined
    })
  ]
}
