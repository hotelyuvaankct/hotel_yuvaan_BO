export type AppEnv = 'dev' | 'prod';

function required(value: string | undefined, key: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value.trim();
}

const backendApiUrl = required(
  import.meta.env.VITE_BACKEND_API_URL,
  'VITE_BACKEND_API_URL',
);

const apiVersionPath = required(
  import.meta.env.VITE_API_VERSION_PATH,
  'VITE_API_VERSION_PATH',
);

export const env = {
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'dev') as AppEnv,
  backendApiUrl,
  apiVersionPath,
} as const;

export function getApiBaseUrl(): string {
  return `${backendApiUrl.replace(/\/$/, '')}${apiVersionPath}`;
}
