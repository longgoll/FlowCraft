import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@tracelens/protocol': path.resolve(__dirname, 'packages/protocol/src/index.ts'),
      '@tracelens/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@tracelens/plugins': path.resolve(__dirname, 'packages/plugins/src/index.ts'),
      '@tracelens/express': path.resolve(__dirname, 'packages/express/src/index.ts'),
      '@tracelens/fastify': path.resolve(__dirname, 'packages/fastify/src/index.ts'),
      '@tracelens/nestjs': path.resolve(__dirname, 'packages/nestjs/src/index.ts'),
      '@tracelens/browser': path.resolve(__dirname, 'packages/browser/src/index.ts'),
    },
  },
});
