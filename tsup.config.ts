import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    classic: 'src/classic/index.ts',
    okey101: 'src/okey101/index.ts',
    helpers: 'src/helpers.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2022',
  splitting: true,
  treeshake: true,
})
