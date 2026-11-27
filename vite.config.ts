import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        components: resolve('src/components.ts'),
        index: resolve('src/index.ts'),
        'boot/register': resolve('src/boot/register.ts'),
      },
      formats: ['es'],
    },
    sourcemap: true,
    rollupOptions: {
      external: (id) =>
        ['vue', 'quasar', 'radashi', 'zod', '@quasar/app-vite'].some(
          (dependency) => id === dependency || id.startsWith(`${dependency}/`),
        ),
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
})
