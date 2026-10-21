export type Customer = {
  customerId: number;
  businessId: number;
  customerName: string;
  mobileNo: string;
  email: string;
  addressLine: string;
  gstin: string;
};

export type CustomerListItem = Customer & { billCount: number; billed: number; balance: number };
export type CustomerSaveRequest = Omit<Customer, 'customerId' | 'businessId'> & { customerId?: number };
