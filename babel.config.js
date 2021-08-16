module.exports = {
  presets: ['@babel/preset-typescript', '@babel/preset-env'],
  plugins: [
    // https://github.com/vuejs/jsx-next
    ['@vue/babel-plugin-jsx', { mergeProps: false, enableObjectSlots: false }],
  ],
};
