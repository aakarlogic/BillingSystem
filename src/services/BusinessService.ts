import ApiService from './ApiService';
import type {
  Business,
  BusinessListItem,
  BusinessSaveRequest,
  BusinessStatusRequest,
  Plan,
  PlanSaveRequest,
  PlatformStats,
  SettingsSaveRequest,
} from '@/types/business';
import type { IdRequest } from '@/types/api';

export const apiGetBusinesses = () => ApiService.post<BusinessListItem[]>('/Business/GetAll');
export const apiSaveBusiness = (data: BusinessSaveRequest) => ApiService.post<number, BusinessSaveRequest>('/Business/Save', data);
export const apiSetBusinessStatus = (data: BusinessStatusRequest) =>
  ApiService.post<boolean, BusinessStatusRequest>('/Business/SetStatus', data);
export const apiGetPlatformStats = () => ApiService.post<PlatformStats>('/Business/GetStats');
export const apiGetSettings = () => ApiService.post<Business>('/Business/GetSettings');
export const apiSaveSettings = (data: SettingsSaveRequest) => ApiService.post<Business, SettingsSaveRequest>('/Business/SaveSettings', data);

export const apiGetPlans = () => ApiService.post<Plan[]>('/Plan/GetAll');
export const apiSavePlan = (data: PlanSaveRequest) => ApiService.post<boolean, PlanSaveRequest>('/Plan/Save', data);
export const apiDeletePlan = (data: IdRequest) => ApiService.post<boolean, IdRequest>('/Plan/Delete', data);
