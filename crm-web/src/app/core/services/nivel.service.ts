import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError, of, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaces agnósticas para o sistema de níveis
export interface LevelCount {
  level: number;
  label: string;
  count: number;
}

export interface LevelCountsResponse {
  status: string;
  counts: LevelCount[];
  total: number;
}

export interface LevelUser {
  user_id: number;
  username: string;
  email: string;
  phone_number?: string;
  profile_image_url?: string;
  registration_date: string;
  account_status: string;
  verification_status: number;
  role: string;
  admin_level: number;
  mentor_id?: number;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface LevelUsersResponse {
  status: string;
  level: number;
  level_label: string;
  users: LevelUser[];
  pagination: Pagination;
}

export interface LevelUserDetailResponse {
  status: string;
  level: number;
  level_label: string;
  user: LevelUser;
  extra: LevelUserExtra;
}

export interface LevelUserExtra {
  // Para leads (nivel 5)
  crm?: {
    state: string;
    profession?: string;
    source?: string;
    notes?: string;
    converted_at?: string;
  };
  events?: CrmEvent[];

  // Para mentorados (nivel 4)
  chat_count?: number;
  CRM_count?: number;
  recent_sessions?: ChatSession[];

  // Para admin/mentor (nivel 0-3)
  permissions?: {
    can_manage_users: boolean;
    can_view_all_data: boolean;
    can_manage_mentors: boolean;
    can_view_mentorados: boolean;
    can_chat: boolean;
  };
}

export interface CrmEvent {
  event_type: string;
  event_data?: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  session_id: string;
  session_type: string;
  created_at: string;
  updated_at: string;
  status: string;
}

// Configuração de níveis (dinâmica do backend)
export interface LevelConfig {
  level: number;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
}

// Fallback estático (usado se o backend falhar)
export const LEVEL_CONFIGS_FALLBACK: LevelConfig[] = [
  { level: 0, label: 'Proprietário', description: 'Acesso total ao sistema', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: '👑' },
  { level: 1, label: 'Admin', description: 'Administrador com acesso total', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: '🛡️' },
  { level: 2, label: 'Mentor Senior', description: 'Mentor com permissões elevadas', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '⭐' },
  { level: 3, label: 'Mentor', description: 'Mentor padrão', color: 'text-teal-700', bgColor: 'bg-teal-100', icon: '✅' },
  { level: 4, label: 'Mentorado', description: 'Usuário mentorado', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: '👤' },
  { level: 5, label: 'Lead', description: 'Lead/prospect', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: '👥' }
];

// Exportar para compatibilidade (deprecated - usar levelConfigs signal)
export const LEVEL_CONFIGS = LEVEL_CONFIGS_FALLBACK;

interface LevelConfigsResponse {
  status: string;
  levels: LevelConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class NivelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // State signals
  private readonly _levelConfigs = signal<LevelConfig[]>(LEVEL_CONFIGS_FALLBACK);
  private readonly _levelCounts = signal<LevelCount[]>([]);
  private readonly _loading = signal(false);
  private readonly _currentLevelUsers = signal<LevelUser[]>([]);
  private readonly _currentPagination = signal<Pagination | null>(null);
  private readonly _configsLoaded = signal(false);

  // Public readonly signals
  readonly levelConfigs = this._levelConfigs.asReadonly();
  readonly levelCounts = this._levelCounts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly currentLevelUsers = this._currentLevelUsers.asReadonly();
  readonly currentPagination = this._currentPagination.asReadonly();

  // Computed
  readonly totalUsers = computed(() =>
    this._levelCounts().reduce((sum, lc) => sum + lc.count, 0)
  );

  readonly hasData = computed(() => this._levelCounts().length > 0);

  /**
   * Carrega configuração de níveis do backend (chamado uma vez no início)
   */
  loadLevelConfigs(): Observable<LevelConfig[]> {
    if (this._configsLoaded()) {
      return of(this._levelConfigs());
    }

    return this.http.get<LevelConfigsResponse>(`${this.baseUrl}/api/admin/levels/config`).pipe(
      map(response => response.levels),
      tap(configs => {
        this._levelConfigs.set(configs);
        this._configsLoaded.set(true);
      }),
      catchError(error => {
        this._configsLoaded.set(true);
        return of(LEVEL_CONFIGS_FALLBACK);
      })
    );
  }

  /**
   * Retorna a configuração de um nível específico
   */
  getLevelConfig(level: number): LevelConfig | undefined {
    const configs = this._levelConfigs();
    return configs.find(lc => lc.level === level);
  }

  /**
   * Retorna todas as configurações de níveis (do signal dinâmico)
   */
  getAllLevelConfigs(): LevelConfig[] {
    return this._levelConfigs();
  }

  /**
   * Busca contagem de usuários por nível (para dashboard)
   * Também carrega configs se ainda não foram carregadas
   */
  getLevelCounts(): Observable<LevelCount[]> {
    this._loading.set(true);

    // Carregar configs e counts em paralelo
    return forkJoin({
      configs: this.loadLevelConfigs(),
      counts: this.http.get<LevelCountsResponse>(`${this.baseUrl}/api/admin/levels/count`)
    }).pipe(
      map(({ counts }) => counts.counts),
      tap(counts => {
        this._levelCounts.set(counts);
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Lista usuários de um nível específico com paginação e busca
   */
  getUsersByLevel(
    level: number,
    page = 1,
    perPage = 20,
    search?: string
  ): Observable<LevelUsersResponse> {
    this._loading.set(true);

    let url = `${this.baseUrl}/api/admin/levels/${level}/users?page=${page}&per_page=${perPage}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    return this.http.get<LevelUsersResponse>(url).pipe(
      tap(response => {
        this._currentLevelUsers.set(response.users);
        this._currentPagination.set(response.pagination);
        this._loading.set(false);
      }),
      catchError(error => {
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtém detalhes de um usuário específico com dados extras baseados no nível
   */
  getUserDetail(level: number, userId: number): Observable<LevelUserDetailResponse> {
    this._loading.set(true);

    return this.http.get<LevelUserDetailResponse>(
      `${this.baseUrl}/api/admin/levels/${level}/users/${userId}`
    ).pipe(
      tap(() => this._loading.set(false)),
      catchError(error => {
        this._loading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Atualiza o nível de um usuário
   */
  updateUserLevel(userId: number, newLevel: number): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.baseUrl}/api/admin/users/${userId}/level`,
      { admin_level: newLevel }
    );
  }

  /**
   * Limpa o cache/state atual
   */
  clearState(): void {
    this._levelCounts.set([]);
    this._currentLevelUsers.set([]);
    this._currentPagination.set(null);
  }

  /**
   * Força recarregar configs do backend
   */
  reloadConfigs(): Observable<LevelConfig[]> {
    this._configsLoaded.set(false);
    return this.loadLevelConfigs();
  }
}
