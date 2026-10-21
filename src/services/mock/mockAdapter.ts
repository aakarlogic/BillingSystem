// Axios adapter that answers requests from the in-browser mock backend, so the
// app runs with no server. Turn it off with VITE_USE_MOCK_API=false.
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api';
import { handlers, MockHttpError, userFromToken } from './handlers';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  await delay(120); // feel like a network call
  const url = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '');
  const handler = handlers[url];
  const auth = String(config.headers?.Authorization ?? '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {});

  const respond = (status: number, payload: ApiResponse<unknown>): AxiosResponse => {
    const response: AxiosResponse = { data: payload, status, statusText: String(status), headers: {}, config, request: {} };
    if (status >= 400) {
      const err = Object.assign(new Error(payload.Message), { isAxiosError: true, response, config });
      throw err;
    }
    return response;
  };

  if (!handler) return respond(404, { Success: false, StatusCode: 404, Message: `No API for ${url}`, Data: null });
  try {
    const data = (handler as (b: unknown, c: unknown) => unknown)(body, { user: userFromToken(token) });
    return respond(200, { Success: true, StatusCode: 200, Message: 'OK', Data: data });
  } catch (e) {
    if (e instanceof MockHttpError) return respond(e.status, { Success: false, StatusCode: e.status, Message: e.message, Data: null });
    throw e;
  }
};
