import ApiService from './ApiService';
import type { MenuBindingData } from '@/types/menuPermission';

/** Side menu + page rights for the signed-in person (see database/README.md, section 4). */
export const apiGetMenuBinding = () => ApiService.post<MenuBindingData>('/Menu/GetMenuBinding');
