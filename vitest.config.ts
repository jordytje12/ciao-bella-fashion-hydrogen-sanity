import {defineConfig} from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Separate from vite.config.ts on purpose — that config wires up the
 * Hydrogen/Oxygen/Sanity Vite plugins, which expect to run inside the
 * Shopify CLI's dev/build pipeline, not a plain Node test runner. Unit
 * tests here only need the `~/*` path alias from tsconfig.json.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
});
