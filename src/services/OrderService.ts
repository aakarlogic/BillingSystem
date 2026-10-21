import ApiService from './ApiService';
import type { IdRequest, ReasonRequest } from '@/types/api';
import type { Order, OrderDetail, OrderFilter, OrderListItem, OrderSaveRequest } from '@/types/order';

export const apiGetOrders = (data: OrderFilter = {}) => ApiService.post<OrderListItem[], OrderFilter>('/Order/GetAll', data);
export const apiGetOrder = (data: IdRequest) => ApiService.post<OrderDetail, IdRequest>('/Order/GetById', data);
/** Create or update an open order; set makeBill to also give it a bill number. */
export const apiSaveOrder = (data: OrderSaveRequest) => ApiService.post<Order, OrderSaveRequest>('/Order/Save', data);
export const apiMakeBill = (data: IdRequest) => ApiService.post<Order, IdRequest>('/Order/MakeBill', data);
export const apiCancelOrder = (data: ReasonRequest) => ApiService.post<boolean, ReasonRequest>('/Order/Cancel', data);
