import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

const extensions = ['.js', '.jsx', '.ts', '.tsx'];
const isDev = process.env.mode !== 'production';
const banner = `/**
* vue3-virtual-scroll-list v${pkg.version}
* open source under the MIT license
* ${pkg.homepage}
*/`;

export default {
  external: ['vue'],
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    banner,
    sourcemap: isDev,
  },
  plugins: [
    resolve({
      extensions,
    }),
    // commonjs(),
    babel({ extensions, babelHelpers: 'bundled' }),
  ],
};
