import ApiService from './ApiService';
import type { AuditLog, DashboardSummary, ReportRequest, SalesReport } from '@/types/report';

export const apiGetDashboard = () => ApiService.post<DashboardSummary>('/Report/GetDashboard');
export const apiGetSalesReport = (data: ReportRequest) => ApiService.post<SalesReport, ReportRequest>('/Report/GetSales', data);
export const apiGetAuditLog = () => ApiService.post<AuditLog[]>('/Audit/GetAll');
