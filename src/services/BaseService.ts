import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import appConfig from '@/configs/app.config';
import { getAccessToken, getRefreshToken, setSession } from '@/guards/jwt/jwt';
import { setSessionUser } from '@/utils/session';
import type { ApiResponse } from '@/types/api';
import type { SignInData } from '@/types/auth';
import { mockAdapter } from './mock/mockAdapter';
import {
  ENCRYPTED_HEADER,
  KEY_CHANGED,
  decryptResponse,
  encryptRequest,
  encryptionEnabled,
  endpointOf,
  forgetServerKey,
  getServerKey,
  isEncryptedResponse,
} from '@/utils/crypto';

const TOKEN_TYPE = 'Bearer ';
/** Calls made before sign-in: a 401 here is a wrong password / OTP, not an ended session. */
const OPEN_AUTH_PATHS = ['/Auth/Login', '/Auth/Register', '/Auth/SendOtp', '/Auth/ResetPassword', '/Auth/Refresh'];
const isOpenAuthRequest = (url?: string) => !!url && OPEN_AUTH_PATHS.some((p) => url.replace(/\/+$/, '').endsWith(p));

type RetryConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  /** encryption: the plain body (kept so a retry can encrypt it again), this call's AES key and API name */
  _plainData?: unknown;
  _aesKey?: CryptoKey;
  _endpoint?: string;
  _keyId?: string;
  _keyRetried?: boolean;
};

/** Error with the backend's message, so pages can show it in a toast. */
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const BaseService = axios.create({
  timeout: 60000,
  baseURL: appConfig.apiPrefix,
  headers: { 'Content-Type': 'application/json' },
  adapter: appConfig.useMockApi ? mockAdapter : undefined,
});

BaseService.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `${TOKEN_TYPE}${token}`;

  // Encrypt the body (src/utils/crypto). The server decrypts it before the controller sees it.
  if (encryptionEnabled()) {
    const c = config as RetryConfig;
    if (c._plainData === undefined) c._plainData = config.data ?? {};
    c._endpoint = endpointOf(config.url);
    const server = await getServerKey();
    const { body, aesKey } = await encryptRequest(c._plainData, c._endpoint, server);
    c._aesKey = aesKey;
    c._keyId = server.keyId;
    config.data = body;
    config.headers[ENCRYPTED_HEADER] = '1';
  }
  return config;
});

/** Encrypted answer -> the normal { Success, StatusCode, Message, Data }. */
async function openResponse(response?: AxiosResponse) {
  const c = response?.config as RetryConfig | undefined;
  if (response && c?._aesKey && isEncryptedResponse(response.data)) {
    response.data = await decryptResponse(response.data, c._aesKey, c._endpoint ?? '');
  }
}

/** One /Auth/Refresh at a time: calls that fail together wait for the same new token. */
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);
  refreshing ??= BaseService.post<ApiResponse<SignInData>>('/Auth/Refresh', { refreshToken })
    .then((res) => {
      const data = res.data.Data;
      setSession(data.accessToken, data.refreshToken ?? refreshToken);
      setSessionUser(data.user);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function endSession() {
  setSession(null);
  setSessionUser(null);
  if (!window.location.pathname.startsWith('/auth/')) {
    window.location.assign(appConfig.unAuthenticatedEntryPath);
  }
}

BaseService.interceptors.response.use(
  async (response) => {
    await openResponse(response);
    const body = response.data as ApiResponse<unknown> | undefined;
    if (body && body.Success === false) {
      return Promise.reject(new ApiError(body.Message || 'Something went wrong.', body.StatusCode || response.status));
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    try {
      await openResponse(error.response);
    } catch {
      // a broken encrypted error body: fall through to the general message
    }
    const status = error.response?.status ?? 0;
    const config = error.config as RetryConfig | undefined;
    // The server has a new encryption key (e.g. it was moved): get it and send the call again, once.
    if (status === 409 && config && !config._keyRetried && error.response?.data?.Data === KEY_CHANGED) {
      await forgetServerKey(config._keyId);
      config._keyRetried = true;
      return BaseService(config);
    }
    // A 401 on a signed-in call: try the refresh token once, then repeat the call.
    // If that fails too, the session has ended: go to the login page.
    if (status === 401 && config && !isOpenAuthRequest(config.url)) {
      if (!config._retried && (await refreshSession())) {
        config._retried = true;
        return BaseService(config);
      }
      endSession();
    }
    const message =
      error.response?.data?.Message || (status === 0 ? 'Cannot reach the server. Check the internet.' : 'Something went wrong.');
    return Promise.reject(new ApiError(message, status));
  },
);

export default BaseService;
