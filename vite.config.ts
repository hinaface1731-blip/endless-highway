import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three-core', test: /three[./]core\.js$/, priority: 2 },
            { name: 'three-webgl', test: /three[./]module\.js$/, priority: 1 },
          ],
        },
      },
    },
  },
});
