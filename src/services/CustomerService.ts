import ApiService from './ApiService';
import type { IdRequest } from '@/types/api';
import type { CustomerListItem, CustomerSaveRequest } from '@/types/customer';

export const apiGetCustomers = () => ApiService.post<CustomerListItem[]>('/Customer/GetAll');
export const apiSaveCustomer = (data: CustomerSaveRequest) => ApiService.post<number, CustomerSaveRequest>('/Customer/Save', data);
export const apiDeleteCustomer = (data: IdRequest) => ApiService.post<boolean, IdRequest>('/Customer/Delete', data);
