// Every API response uses the same envelope (same shape as the Health 360 backend).
export type ApiResponse<T> = {
  Success: boolean;
  StatusCode: number;
  Message: string;
  Data: T;
};

/** The five audit columns every table has (see database/schema.sql). */
export type AuditColumns = {
  isActive: boolean;
  insertedBy: number | null;
  insertedDate: string;
  updatedBy: number | null;
  updatedDate: string | null;
};

export type IdRequest = { id: number };
export type ReasonRequest = { id: number; reason: string };
