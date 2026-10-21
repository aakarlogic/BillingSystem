export type AppConfig = {
  apiPrefix: string;
  /** true = answer every API call from the in-browser mock backend (no server needed). */
  useMockApi: boolean;
  /** true = every request/response body is encrypted (src/utils/crypto). Real server only. */
  encryptApi: boolean;
  authenticatedEntryPath: string;
  unAuthenticatedEntryPath: string;
  defaultLanguage: 'mr' | 'hi' | 'en';
};

const appConfig: AppConfig = {
  apiPrefix: import.meta.env.VITE_API_BASE_URL || '/api',
  // Switch to false once the real backend is running.
  useMockApi: (import.meta.env.VITE_USE_MOCK_API ?? 'true') === 'true',
  encryptApi: (import.meta.env.VITE_ENCRYPT_API ?? 'true') !== 'false',
  authenticatedEntryPath: '/dashboard',
  unAuthenticatedEntryPath: '/auth/login',
  defaultLanguage: 'mr',
};

export default appConfig;
