import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: ['**/src/assets/**', '**/public/assets/**', '**/public/frames/**']
    }
  }
});
