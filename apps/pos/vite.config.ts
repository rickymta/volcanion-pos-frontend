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
    host: true,         // lắng nghe mọi hostname, kể cả *.localhost
    port: 3002,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '.localhost',  // *.localhost — Chrome/Firefox hỗ trợ natively
      '.pos.local',
      '.nip.io',
    ],
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
