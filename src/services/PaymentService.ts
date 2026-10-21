import ApiService from './ApiService';
import type { Order, Payment } from '@/types/order';
import type { PaymentSaveRequest, RefundRequest } from '@/types/payment';

export const apiGetPayments = () => ApiService.post<Payment[]>('/Payment/GetAll');
/** Customer paid outside the app (cash or UPI scanner); this only records it. */
export const apiSavePayment = (data: PaymentSaveRequest) => ApiService.post<Order, PaymentSaveRequest>('/Payment/Save', data);
export const apiRefundPayment = (data: RefundRequest) => ApiService.post<boolean, RefundRequest>('/Payment/Refund', data);
