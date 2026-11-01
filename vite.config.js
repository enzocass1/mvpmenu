import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  // In produzione rimuove console.log/console.debug (console.error e console.warn restano)
  esbuild: mode === 'production' ? { pure: ['console.log', 'console.debug'] } : {}
}))
