import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isMin = mode === 'min'

  return {
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'Umination',
        fileName: () => isMin ? 'umination.min.js' : 'umination.js',
        formats: ['es'],
      },
      minify: isMin ? 'esbuild' : false,
      cssMinify: isMin,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          assetFileNames: isMin ? 'umination.min.[ext]' : 'umination.[ext]',
        },
      },
      emptyOutDir: !isMin,
    },
  }
})
