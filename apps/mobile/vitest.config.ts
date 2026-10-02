import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const testFile = (name: string) => fileURLToPath(new URL(`./src/test/${name}`, import.meta.url));

export default defineConfig({
  resolve: {
  alias: {
    'react-native': testFile('reactNativeStub.ts'),
    'expo-secure-store': testFile('secureStoreStub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    clearMocks: true,
  },
});
