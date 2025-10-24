import { defineConfig } from 'vitest/config'
import path from 'path'
import tsconfig from './tsconfig.json'
import swc from 'unplugin-swc'

const aliases = Object.entries(tsconfig.compilerOptions.paths || {}).reduce(
  (acc, [alias, paths]) => {
    const formattedAlias = alias.replace('/*', '')
    const resolvedPath = path.resolve(__dirname, paths[0].replace('/*', ''))
    acc[formattedAlias] = resolvedPath
    return acc
  },
  {} as Record<string, string>
)

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  resolve: {
    alias: aliases
  }
})

