import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { environment } from '../../../environments/environment';
import { DeviceInfo, GetReportsResponse, CreateReportResponse } from '../models/api-responses';

export interface WasteType {
  waste_type_id: number;
  name: string;
  description: string;
  hazard_level: 'low' | 'medium' | 'high' | 'critical';
  icon_url?: string;
}

export interface Report {
  report_id: number;
  user_id: number;
  latitude: string;
  longitude: string;
  location_id?: number;
  report_date: string;
  description?: string;
  status: 'submitted' | 'analyzing' | 'analyzed' | 'resolved' | 'rejected';
  image_url?: string;
  device_info?: DeviceInfo;
  address_text?: string;
  severity_score?: number;
  priority_level?: string;
  waste_type?: string;
}

export interface Hotspot {
  hotspot_id: number;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  total_reports: number;
  average_severity: number;
  status: 'active' | 'monitoring' | 'resolved';
  last_reported?: string;
  created_at: string;
}

export interface CreateReportRequest {
  user_id: number;
  latitude: number;
  longitude: number;
  description: string;
  image_data?: string; // Base64
  device_info?: DeviceInfo;
}

export interface NearbyRequest {
  latitude: number;
  longitude: number;
  radius_km?: number;
}

export interface DashboardStatistics {
  status: string;
  user_stats: {
    total_reports: number;
    analyzed_reports: number;
    pending_reports: number;
    resolved_reports: number;
  };
  waste_distribution: { name: string; count: number }[];
  severity_distribution: { severity_score: number; count: number }[];
  priority_distribution: { priority_level: string; count: number }[];
  monthly_reports: { month: string; count: number }[];
  recent_reports: Report[];
  community_stats: {
    total_registered_users: number;
    total_contributors: number;
    user_rank: number | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  // State
  private readonly reports = signal<Report[]>([]);
  private readonly hotspots = signal<Hotspot[]>([]);
  private readonly wasteTypes = signal<WasteType[]>([]);
  private readonly statistics = signal<DashboardStatistics | null>(null);
  private readonly loading = signal(false);

  // Computed
  readonly allReports = computed(() => this.reports());
  readonly allHotspots = computed(() => this.hotspots());
  readonly allWasteTypes = computed(() => this.wasteTypes());
  readonly dashboardStats = computed(() => this.statistics());
  readonly isLoading = computed(() => this.loading());

  readonly activeHotspots = computed(() =>
    this.hotspots().filter(h => h.status === 'active')
  );

  readonly pendingReports = computed(() =>
    this.reports().filter(r => r.status === 'submitted' || r.status === 'analyzing')
  );

  // Reports
  getReports(page = 1, limit = 20): Observable<GetReportsResponse> {
    this.loading.set(true);
    return this.http.get<GetReportsResponse>(`${environment.apiUrl}/api/reports?page=${page}&limit=${limit}`).pipe(
      tap(response => {
        this.loading.set(false);
        // Backend retorna: {status: "success", reports: [...], pagination: {...}}
        if (response && response.status === 'success' && response.reports) {
          this.reports.set(response.reports);
        }
      })
    );
  }

  getReport(reportId: number): Observable<ApiResponse<Report>> {
    return this.api.get<Report>(`/api/reports/${reportId}`);
  }

  createReport(data: CreateReportRequest): Observable<CreateReportResponse> {
    this.loading.set(true);
    return this.http.post<CreateReportResponse>(`${environment.apiUrl}/api/reports`, data).pipe(
      tap(response => {
        this.loading.set(false);
        // Backend retorna: {status: "success", message: "...", report_id: number}
        if (response && response.status === 'success') {
          // Recarregar lista após criar
          this.getReports().subscribe();
        }
      })
    );
  }

  deleteReport(reportId: number): Observable<ApiResponse> {
    return this.api.delete(`/api/reports/${reportId}`).pipe(
      tap(response => {
        if (response.success) {
          this.reports.update(reports =>
            reports.filter(r => r.report_id !== reportId)
          );
        }
      })
    );
  }

  getNearbyReports(data: NearbyRequest): Observable<ApiResponse<Report[]>> {
    const params = new URLSearchParams({
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      ...(data.radius_km && { radius_km: data.radius_km.toString() })
    });
    return this.api.get<Report[]>(`/api/reports/nearby?${params}`);
  }

  // Hotspots
  getHotspots(): Observable<any> {
    this.loading.set(true);
    return this.http.get<any>(`${environment.apiUrl}/api/hotspots`).pipe(
      tap(response => {
        this.loading.set(false);
        // Backend retorna: {"status":"success","hotspots":[...]}
        if (response.status === 'success' && response.hotspots) {
          this.hotspots.set(response.hotspots);
        }
      })
    );
  }

  getHotspotReports(hotspotId: number): Observable<ApiResponse<Report[]>> {
    return this.api.get<Report[]>(`/api/hotspots/${hotspotId}/reports`);
  }

  // Status Updates
  updateReportStatus(reportId: number, status: Report['status']): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/reports/${reportId}/status`, { status }).pipe(
      tap(response => {
        if (response.status === 'success') {
          // Update local state
          this.reports.update(reports =>
            reports.map(r => r.report_id === reportId ? { ...r, status } : r)
          );
        }
      })
    );
  }

  updateHotspotStatus(hotspotId: number, status: Hotspot['status']): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/hotspots/${hotspotId}/status`, { status }).pipe(
      tap(response => {
        if (response.status === 'success') {
          // Update local state
          this.hotspots.update(hotspots =>
            hotspots.map(h => h.hotspot_id === hotspotId ? { ...h, status } : h)
          );
        }
      })
    );
  }

  // Waste Types
  getWasteTypes(): Observable<ApiResponse<{ waste_types: WasteType[] }>> {
    return this.api.get<{ waste_types: WasteType[] }>('/api/waste-types').pipe(
      tap(response => {
        if (response.success && response.data) {
          this.wasteTypes.set(response.data.waste_types);
        }
      })
    );
  }

  // Dashboard
  getStatistics(): Observable<DashboardStatistics> {
    this.loading.set(true);
    return this.http.get<DashboardStatistics>(`${environment.apiUrl}/api/dashboard/statistics`).pipe(
      tap(response => {
        this.loading.set(false);
        // Backend retorna direto: {status, user_stats, waste_distribution, ...}
        if (response && response.status === 'success') {
          this.statistics.set(response);
        }
      })
    );
  }
}
