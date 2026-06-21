/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'dev' | 'prod';
  readonly VITE_BACKEND_API_URL: string;
  readonly VITE_API_VERSION_PATH: string;
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
