import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 相对路径产物：同一份 dist 既能放站点根目录，也能放任意子目录（如 /proto/），无需重新配置
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})
