/**
 * @app POS Manager — Ứng dụng quản lý bán hàng dành cho nhân viên/quản lý cửa hàng
 * @port 3000  (strictPort: true — không tự fallback sang port khác)
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
    port: 3000,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '.localhost',  // *.localhost — Chrome/Firefox hỗ trợ natively
      '.pos.local',  // hosts file: 127.0.0.1 tenant-a.pos.local
      '.nip.io',     // DNS trick: tenant-a.127.0.0.1.nip.io (cần internet)
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
