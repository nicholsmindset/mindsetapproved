import { defineConfig } from 'vitest/config';

// Unit tests cover src/core only: platform-free logic with injected I/O.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
});
