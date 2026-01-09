import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UpdateUserResponse } from '../models/api-responses';

export interface User {
  user_id: number;
  username: string;
  email: string;
  phone_number?: string;
  profile_image_url?: string;
  registration_date: string;
  account_status: string;
  verification_status: number;
  role: 'admin' | 'mentor' | 'mentorado' | 'lead';
  mentor_id?: number;
  admin_level?: number | null;  // Nivel na hierarquia (0=Proprietario Principal)
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface OtpRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  refresh_token?: string;
  user: User;
  status?: string;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = environment.apiUrl;

  // State using signals
  private readonly currentUser = signal<User | null>(null);
  private readonly token = signal<string | null>(null);
  private readonly refreshToken = signal<string | null>(null);
  private readonly loading = signal(false);

  private refreshTimer?: number;

  // Computed values
  readonly user = computed(() => this.currentUser());
  readonly isAuthenticated = computed(() => !!this.token());
  readonly isLoading = computed(() => this.loading());
  // Retorna role efetivo considerando hierarquia de admin_level:
  // 0-1 = Admin/Owner (acesso total)
  // 2-3 = Mentor (acesso admin)
  // 4 = Mentorado (sem acesso admin)
  // 5 = Lead (sem acesso admin)
  readonly userRole = computed(() => {
    const user = this.currentUser();
    if (!user) return null;

    if (user.admin_level !== null && user.admin_level !== undefined) {
      // Apenas níveis 0-3 têm acesso admin
      if (user.admin_level <= 3) {
        return 'admin';
      }
      // Level 4 = mentorado, Level 5 = lead - sem acesso admin
      if (user.admin_level === 4) return 'mentorado';
      if (user.admin_level === 5) return 'lead';
    }
    return user.role || null;
  });

  constructor() {
    this.loadFromStorage();
    this.migrateDeprecatedKeys();
    this.scheduleTokenRefresh();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        this.token.set(storedToken);
      }
      if (storedRefreshToken) {
        this.refreshToken.set(storedRefreshToken);
      }
      if (storedUser) {
        try {
          this.currentUser.set(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
  }

  private migrateDeprecatedKeys(): void {
    if (typeof window !== 'undefined') {
      try {
        const deprecatedKey = localStorage.getItem('nanda_api_key');
        if (deprecatedKey) {
          localStorage.removeItem('nanda_api_key');
          if (!environment.production) {
            console.log('[Nanda] Migration: Removed deprecated "nanda_api_key" from localStorage');
          }
        }
      } catch (error) {
        // Silently fail if localStorage is blocked/unavailable
        if (!environment.production) {
          console.warn('[Nanda] Migration: Failed to clean deprecated keys', error);
        }
      }
    }
  }

  private saveToStorage(response: AuthResponse): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', response.token);
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    this.token.set(response.token);
    if (response.refresh_token) {
      this.refreshToken.set(response.refresh_token);
    }
    this.currentUser.set(response.user);
    this.scheduleTokenRefresh();
  }

  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    this.token.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    this.cancelTokenRefresh();
  }

  private scheduleTokenRefresh(): void {
    this.cancelTokenRefresh();

    const token = this.token();
    const refreshToken = this.refreshToken();

    // Se não tem refresh token, não agendar (usuário antigo ou sem login)
    if (!token || !refreshToken) {
      return;
    }

    try {
      // Decodificar JWT para pegar expiração
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;  // converter para ms
      const now = Date.now();

      // Refresh 5 minutos antes de expirar
      const refreshAt = expiresAt - (5 * 60 * 1000);
      const delay = refreshAt - now;

      if (delay > 0) {
        this.refreshTimer = window.setTimeout(() => {
          this.performTokenRefresh();
        }, delay);

        if (!environment.production) {
          console.log(`[Auth] Token refresh agendado em ${Math.round(delay / 1000 / 60)} minutos`);
        }
      } else {
        // Token já expirou ou está prestes a expirar, fazer refresh imediatamente
        this.performTokenRefresh();
      }
    } catch (error) {
      console.error('[Auth] Erro ao agendar refresh:', error);
    }
  }

  private cancelTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private performTokenRefresh(): void {
    const refreshToken = this.refreshToken();

    if (!refreshToken) {
      console.warn('[Auth] Refresh token não disponível');
      this.logout();
      return;
    }

    this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        if (response.token) {
          // Salvar novo access token (refresh token permanece o mesmo)
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', response.token);
          }
          this.token.set(response.token);
          this.scheduleTokenRefresh();

          if (!environment.production) {
            console.log('[Auth] Access token renovado com sucesso');
          }
        }
      }),
      catchError(error => {
        console.error('[Auth] Erro ao renovar token:', error);
        this.logout();
        return throwError(() => error);
      })
    ).subscribe();
  }

  getToken(): string | null {
    return this.token();
  }

  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    this.loading.set(true);
    return this.http.post<{ status: string; message: string; token?: string; user?: User }>(`${this.baseUrl}/api/auth/register`, data).pipe(
      tap(response => {
        this.loading.set(false);
        // Se veio token, salvar (registro direto sem OTP)
        if (response.token && response.user) {
          this.saveToStorage({ token: response.token, user: response.user });
        }
      }),
      map(response => ({
        success: response.status === 'success',
        message: response.message,
        data: response.token ? { token: response.token, user: response.user! } : undefined
      })),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  verifyRegistration(data: OtpRequest): Observable<ApiResponse<AuthResponse>> {
    this.loading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/verify-registration`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.token) {
          this.saveToStorage(response);
        }
      }),
      map(response => ({ success: !!response.token, data: response })),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    console.log('[Auth] Login iniciado para:', data.email);
    this.loading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, data).pipe(
      tap(response => {
        console.log('[Auth] Login response recebida:', response);
        this.loading.set(false);
        if (response.token) {
          console.log('[Auth] Token recebido, salvando...');
          this.saveToStorage(response);
          console.log('[Auth] Storage salvo, userRole:', this.userRole());
        }
      }),
      map(response => ({ success: !!response.token, data: response })),
      catchError(error => {
        console.error('[Auth] Erro no login:', error);
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  sendOtp(email: string): Observable<ApiResponse> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/send-otp`, { email }).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  verifyOtp(data: OtpRequest): Observable<ApiResponse<AuthResponse>> {
    this.loading.set(true);
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/verify-otp`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.token) {
          this.saveToStorage(response);
        }
      }),
      map(response => ({ success: !!response.token, data: response })),
      catchError(error => {
        this.loading.set(false);
        return throwError(() => error);
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword
    }).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  logout(): void {
    const refreshToken = this.refreshToken();

    if (refreshToken) {
      // Revogar refresh token no backend
      this.http.post(`${this.baseUrl}/api/auth/logout`, {
        refresh_token: refreshToken
      }).subscribe({
        error: (err) => console.error('[Auth] Erro ao revogar token:', err)
      });
    }

    this.clearStorage();
    this.router.navigate(['/login']);
  }

  deleteAccount(): Observable<ApiResponse> {
    return this.http.delete<{ status: string; message: string }>(`${this.baseUrl}/api/user/delete-account`).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  updateUser(userId: number, data: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.patch<UpdateUserResponse>(`${this.baseUrl}/api/users/${userId}`, data).pipe(
      tap(response => {
        // Backend retorna: {status: "success", message: "...", user: {...}}
        if (response && response.user) {
          this.currentUser.set(response.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        }
      }),
      map(response => ({ success: response?.status === 'success', data: response?.user }))
    );
  }

  // Verificar se usuário/email já existe
  checkExisting(username?: string, email?: string): Observable<ApiResponse<{ status: string }>> {
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (email) params.append('email', email);

    return this.http.get<{ status: string; message: string }>(`${this.baseUrl}/api/auth/check-existing?${params}`).pipe(
      map(response => ({ success: true, data: response, message: response.message }))
    );
  }

  // Reenviar OTP
  resendOtp(email: string): Observable<ApiResponse> {
    return this.http.post<{ status: string; message: string }>(`${this.baseUrl}/api/auth/resend-otp`, { email }).pipe(
      map(response => ({ success: response.status === 'success', message: response.message }))
    );
  }

  // Buscar dados do usuário
  getUser(userId: number): Observable<ApiResponse<User>> {
    return this.http.get<{ status: string; user: User }>(`${this.baseUrl}/api/users/${userId}`).pipe(
      map(response => ({ success: response.status === 'success', data: response.user }))
    );
  }

  // Atualizar usuário no state
  refreshUser(): void {
    const user = this.currentUser();
    if (user) {
      this.getUser(user.user_id).subscribe(response => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        }
      });
    }
  }
}
