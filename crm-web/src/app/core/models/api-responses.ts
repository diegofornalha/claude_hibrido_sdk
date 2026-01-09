import { Report } from '../services/reports.service';
import { User } from '../services/auth.service';

/**
 * Device information collected from client
 */
export interface DeviceInfo {
  model?: string;
  os?: string;
  userAgent?: string;
  browser?: string;
  [key: string]: string | undefined;
}

/**
 * Response from GET /api/reports
 */
export interface GetReportsResponse {
  status: 'success' | 'error';
  reports: Report[];
  pagination?: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total_reports?: number;
  };
}

/**
 * Response from POST /api/reports
 */
export interface CreateReportResponse {
  status: 'success' | 'error';
  message: string;
  report_id?: number;
  report?: Report;
}

/**
 * Response from PATCH /api/users/{id}
 */
export interface UpdateUserResponse {
  status: 'success' | 'error';
  message: string;
  user: User;
}
