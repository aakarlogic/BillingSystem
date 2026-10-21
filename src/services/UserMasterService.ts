import ApiService from './ApiService';
import type { User, UserSaveRequest, UserStatusRequest } from '@/types/user';

/** Owner: own team. Platform admin: everyone. */
export const apiGetUsers = () => ApiService.post<User[]>('/User/GetAll');
export const apiSaveUser = (data: UserSaveRequest) => ApiService.post<boolean, UserSaveRequest>('/User/Save', data);
export const apiSetUserStatus = (data: UserStatusRequest) => ApiService.post<boolean, UserStatusRequest>('/User/SetStatus', data);
