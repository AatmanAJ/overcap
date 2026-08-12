import { configDefaults, defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const packageVersion = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export default defineConfig(({ mode }) => {
  const recorderEdition = mode === 'recorder';
  const requestedRecorderTheme = process.env.OVERCAP_RECORDER_THEME;
  const recorderDefaultTheme = requestedRecorderTheme === 'light' ? 'light' : 'dark';
  const recorderInvokeModule = '\0virtual:overcap-invoke';
  const recorderListenModule = '\0virtual:overcap-listen';

  return {
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(packageVersion),
      // This deliberately keys off Vite's explicit build mode instead of a VITE_* variable.
      // A normal production build therefore cannot accidentally include the synthetic backend.
      'import.meta.env.RECORDER_EDITION': JSON.stringify(recorderEdition),
      'import.meta.env.RECORDER_DEFAULT_THEME': JSON.stringify(recorderDefaultTheme),
    },
    plugins: [
      {
        name: 'overcap-backend-adapter',
        enforce: 'pre',
        resolveId(id) {
          if (id === 'virtual:overcap-invoke') return recorderInvokeModule;
          if (id === 'virtual:overcap-listen') return recorderListenModule;
        },
        load(id) {
          if (id === recorderInvokeModule) {
            return recorderEdition
              ? `
                import { invoke as nativeInvoke } from '@tauri-apps/api/core';
                import { recorderInvoke } from '/src/demo/installDemoBackend.ts';
                export const invoke = (command, args, options) =>
                  recorderInvoke(command, args, nativeInvoke, options);
              `
              : `export { invoke } from '@tauri-apps/api/core';`;
          }
          if (id === recorderListenModule) {
            return recorderEdition
              ? `export const listen = async () => () => {};`
              : `export { listen } from '@tauri-apps/api/event';`;
          }
        },
      },
      svelte(),
    ],
    resolve: {
      conditions: ['browser'],
    },
    clearScreen: false,
    server: {
      strictPort: true,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
      target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: !process.env.TAURI_ENV_DEBUG,
      sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      exclude: [...configDefaults.exclude, '.local/**', 'website/**'],
    },
  };
});
