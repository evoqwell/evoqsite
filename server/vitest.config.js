import { defineConfig } from 'vitest/config';

// The root vitest config is jsdom + React for the admin SPA. Server code is
// plain Node ESM and needs neither, so it gets its own config. Run with
// `npm run test:server` from the repo root.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.js']
  }
});
