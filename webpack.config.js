module.exports = {
  mode: process.env.NODE_ENV ?? 'production',
  entry: {
    index: './src/index.ts',
  },
  output: {
    path: `${process.cwd()}/dist`,
    publicPath: '/',
    filename: '[name].js',
    library: { name: 'helicon', type: 'umd' },
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }],
      },
    ],
  },
};
