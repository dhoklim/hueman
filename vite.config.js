import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/hueman/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), 'index.html'),
        receive: resolve(process.cwd(), 'receive.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
