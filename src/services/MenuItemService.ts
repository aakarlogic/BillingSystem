import ApiService from './ApiService';
import type { IdRequest } from '@/types/api';
import type { CategorySaveRequest, ItemAvailabilityRequest, MenuCategory, MenuItem, MenuItemSaveRequest } from '@/types/menuItem';

export const apiGetCategories = () => ApiService.post<MenuCategory[]>('/MenuItem/GetCategories');
export const apiSaveCategory = (data: CategorySaveRequest) => ApiService.post<boolean, CategorySaveRequest>('/MenuItem/SaveCategory', data);
export const apiDeleteCategory = (data: IdRequest) => ApiService.post<boolean, IdRequest>('/MenuItem/DeleteCategory', data);
export const apiGetMenuItems = () => ApiService.post<MenuItem[]>('/MenuItem/GetAll');
export const apiSaveMenuItem = (data: MenuItemSaveRequest) => ApiService.post<boolean, MenuItemSaveRequest>('/MenuItem/Save', data);
export const apiSetItemAvailability = (data: ItemAvailabilityRequest) =>
  ApiService.post<boolean, ItemAvailabilityRequest>('/MenuItem/SetAvailability', data);
