// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 最小配置：确保 Vercel 正确构建到 dist
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
});
