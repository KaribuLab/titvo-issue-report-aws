const { IgnorePlugin, CopyRspackPlugin } = require('@rspack/core')
const path = require('path')
const tsconfig = require('./tsconfig.json')

const aliases = Object.entries(tsconfig.compilerOptions.paths || {}).reduce(
  (acc, [alias, paths]) => {
    const formattedAlias = alias.replace('/*', '')
    const resolvedPath = path.resolve(__dirname, paths[0].replace('/*', ''))
    acc[formattedAlias] = resolvedPath
    return acc
  },
  {}
)

module.exports = {
  context: __dirname,
  target: 'node',
  mode: 'production',
  devtool: 'source-map',
  entry: {
    entrypoint: ['./src/entrypoint.ts']
  },
  output: {
    path: path.resolve(__dirname, 'build/src'),
    filename: '[name].mjs',
    library: {
      type: 'module'
    },
    chunkFormat: 'module',
    clean: true,
    pathinfo: true
  },
  experiments: {
    outputModule: true,
    topLevelAwait: true
  },
  plugins: [
    new IgnorePlugin({
      resourceRegExp: /^@nestjs\/(websockets|microservices|platform-express)/
    }),
    // Copiar archivos estáticos al directorio build
    new CopyRspackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/templates'),
          to: path.resolve(__dirname, 'build/templates'),
          globOptions: {
            ignore: ['**/*.js', '**/*.ts']
          }
        },
      ]
    })
  ],
  resolve: {
    extensions: ['...', '.ts'],
    alias: aliases
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                decorators: true
              },
              transform: {
                legacyDecorator: true,
                decoratorMetadata: true
              }
            },
            sourceMaps: true,
            inlineSourcesContent: false
          }
        }
      }
    ]
  },
  optimization: {
    minimize: false
  },
  externalsType: 'module',
  externals: [
    function (obj, callback) {
      const resource = obj.request
      const lazyImports = [
        '@nestjs/core',
        'class-validator',
        'class-transformer',
      ]
      if (!lazyImports.includes(resource)) {
        return callback()
      }
      try {
        require.resolve(resource)
      } catch (err) {
        callback(null, resource)
      }
      callback()
    }
  ]
}
