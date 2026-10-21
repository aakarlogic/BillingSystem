export type MenuCategory = {
  categoryId: number;
  businessId: number;
  categoryName: string;
  sortOrder: number;
};

export type MenuItem = {
  itemId: number;
  businessId: number;
  categoryId: number | null;
  itemCode: string;
  itemName: string;
  imageUrl: string;
  unitName: string;
  price: number;
  taxRate: number;
  isVeg: boolean;
  isAvailable: boolean;
};

export type MenuItemSaveRequest = Omit<MenuItem, 'itemId' | 'businessId'> & { itemId?: number };
export type CategorySaveRequest = { categoryId?: number; categoryName: string };
export type ItemAvailabilityRequest = { itemId: number; isAvailable: boolean };
