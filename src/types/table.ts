export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'BILL_PENDING';

export type DiningTable = {
  tableId: number;
  businessId: number;
  tableName: string;
  areaName: string;
  seats: number;
  tableStatus: TableStatus;
  currentOrderId: number | null;
};

/** Table card on the floor screen, with the open order's numbers. */
export type TableCard = DiningTable & {
  orderTotal: number;
  orderBalance: number;
  itemCount: number;
  since: string | null;
};
