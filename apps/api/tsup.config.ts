import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle internal workspace packages (they ship TS source); keep node deps external.
  noExternal: [/^@taskflow\//],
  skipNodeModulesBundle: true,
});
