/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
  readonly RECORDER_EDITION: boolean;
  readonly RECORDER_DEFAULT_THEME: 'dark' | 'light';
}

declare module 'virtual:overcap-invoke' {
  export const invoke: typeof import('@tauri-apps/api/core').invoke;
}

declare module 'virtual:overcap-listen' {
  export const listen: typeof import('@tauri-apps/api/event').listen;
}
