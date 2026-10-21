import ApiService from './ApiService';
import type { IdRequest } from '@/types/api';
import type { TableCard } from '@/types/table';

export const apiGetTableFloor = () => ApiService.post<TableCard[]>('/Table/GetFloor');
export const apiAddTable = () => ApiService.post<number>('/Table/Add');
export const apiRemoveTable = (data: IdRequest) => ApiService.post<boolean, IdRequest>('/Table/Remove', data);
