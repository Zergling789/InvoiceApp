import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const requiredLegal = ['VITE_LEGAL_NAME', 'VITE_LEGAL_REPRESENTATIVE', 'VITE_LEGAL_STREET', 'VITE_LEGAL_POSTAL_CODE', 'VITE_LEGAL_CITY', 'VITE_LEGAL_EMAIL', 'VITE_LEGAL_PRIVACY_EMAIL', 'VITE_LEGAL_SUPPORT_EMAIL'];
  const missingLegal = requiredLegal.filter((key) => !env[key]?.trim());
  if (env.VERCEL_ENV === 'production' && missingLegal.length > 0) {
    throw new Error(`Production legal operator configuration missing: ${missingLegal.join(', ')}`);
  }
  if (mode === 'development' && missingLegal.length > 0) console.warn(`Legal operator configuration incomplete: ${missingLegal.join(', ')}`);

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY ?? 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: 'src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/**', 'server/tests/**'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
