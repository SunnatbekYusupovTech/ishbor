import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Satisfy the fail-fast env validation at import time. The integration test
    // connects mongoose to a separate in-memory server, so MONGO_URI is a stub.
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://127.0.0.1:27017/ishbor_test_stub',
      JWT_SECRET: 'test-secret-not-for-production',
      // The `cloudinary` package itself is mocked in upload-related tests, but
      // imageStorage.ts's ensureConfigured() still checks these are non-empty
      // before ever calling it — stub values so that check passes.
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/controllers/**'],
    },
    // Give MongoMemoryServer time to download/spin up on first run.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
