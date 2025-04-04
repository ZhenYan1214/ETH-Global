// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ✅ 定義 @ 指向 src 資料夾
    },
  },
  server: {
    port: 3009, // 指定伺服器端口
  },
})
