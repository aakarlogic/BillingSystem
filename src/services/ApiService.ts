import type { AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api';
import BaseService from './BaseService';

const ApiService = {
  /** Same call shape as Health 360's ApiService.fetchData. */
  fetchData<Response = unknown, Request = Record<string, unknown>>(param: AxiosRequestConfig<Request>) {
    return BaseService.request<ApiResponse<Response>>(param);
  },

  /** Shortcut used by the services: POST, then return only `Data`. */
  async post<Response, Request = Record<string, unknown>>(url: string, data?: Request): Promise<Response> {
    const res = await ApiService.fetchData<Response, Request>({ url, method: 'post', data: data ?? ({} as Request) });
    return res.data.Data;
  },
};

export default ApiService;
