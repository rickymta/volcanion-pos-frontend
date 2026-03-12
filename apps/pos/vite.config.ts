/**
 * @app POS Terminal — Giao diện thu ngân / bán hàng tại quầy
 * @port 3002  (strictPort: true — không tự fallback sang port khác)
 * @tech Vite + React + React Router
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    strictPort: true, // Báo lỗi ngay nếu port 3002 bị chiếm, không tự chuyển sang port khác
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
