import { defineConfig } from 'vite'

export default defineConfig(({ mode, command }) => {
  const isMin = mode === 'min'

  if (command === 'serve') {
    return {
      root: 'examples',
      server: {
        open: true,
      },
    }
  }

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
