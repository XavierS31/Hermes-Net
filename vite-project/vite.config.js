import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mapbox GL v3 workers use modern JS; transpiling below ES2022 can break the worker bundle in Vite.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    include: ['mapbox-gl', 'react-map-gl'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})