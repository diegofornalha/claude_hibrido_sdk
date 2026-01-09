import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`);
  }

  post<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  patch<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, body);
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`);
  }

  postFormData<T>(endpoint: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, formData);
  }
}
