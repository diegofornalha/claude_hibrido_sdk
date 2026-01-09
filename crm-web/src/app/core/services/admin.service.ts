import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  total_users: number;
  total_mentors: number;
  total_mentorados: number;
  total_assessments: number;
  average_score: number;
  assessments_this_month: number;
  top_mentores?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Cache configuration
  private readonly MENTORADOS_CACHE_KEY = 'admin_mentorados_cache';
  private readonly MENTORS_CACHE_KEY = 'admin_mentors_cache';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // Signals para estado reativo
  private readonly _mentorados = signal<any[]>([]);
  private readonly _mentors = signal<any[]>([]);
  private readonly _loadingMentorados = signal(false);
  private readonly _loadingMentors = signal(false);

  // Public readonly signals
  readonly mentorados = this._mentorados.asReadonly();
  readonly mentors = this._mentors.asReadonly();
  readonly loadingMentorados = this._loadingMentorados.asReadonly();
  readonly loadingMentors = this._loadingMentors.asReadonly();

  readonly hasMentoradosData = computed(() => this._mentorados().length > 0);
  readonly hasMentorsData = computed(() => this._mentors().length > 0);

  /**
   * Obtém estatísticas globais (admin only)
   */
  getGlobalStats(): Observable<AdminStats> {
    return this.http.get<{ data: any }>(`${this.baseUrl}/api/admin/stats`).pipe(
      map(response => ({
        total_users: (response.data?.total_mentors || 0) + (response.data?.total_mentorados || 0),
        total_mentors: response.data?.total_mentors || 0,
        total_mentorados: response.data?.total_mentorados || 0,
        total_assessments: response.data?.total_diagnosticos || 0,
        average_score: response.data?.media_score_geral || 0,
        assessments_this_month: response.data?.diagnosticos_este_mes || 0,
        top_mentores: response.data?.top_mentores || []
      }))
    );
  }

  /**
   * Lista todos os mentores (admin only) com cache
   */
  listAllMentors(): Observable<any[]> {
    // 1. Tentar carregar do cache primeiro
    this.loadMentorsFromCache();

    // 2. Fazer fetch em background para dados frescos
    return this.http.get<{ data: any[] }>(`${this.baseUrl}/api/admin/mentors`).pipe(
      map(response => response.data || []),
      tap(data => {
        this._mentors.set(data);
        this._loadingMentors.set(false);
        this.saveMentorsToCache(data);
      })
    );
  }

  /**
   * Carrega mentors do localStorage se válido
   */
  private loadMentorsFromCache(): void {
    try {
      const cached = localStorage.getItem(this.MENTORS_CACHE_KEY);
      if (!cached) {
        this._loadingMentors.set(true);
        return;
      }

      const { data, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < this.CACHE_TTL;

      if (isValid && data) {
        this._mentors.set(data);
        this._loadingMentors.set(false);
      } else {
        this._loadingMentors.set(true);
      }
    } catch (error) {
      this._loadingMentors.set(true);
    }
  }

  /**
   * Salva mentors no localStorage
   */
  private saveMentorsToCache(data: any[]): void {
    try {
      localStorage.setItem(this.MENTORS_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Cria ou promove usuário a mentor
   */
  createMentor(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/admin/mentors`, data);
  }

  /**
   * Remove mentor
   */
  deleteMentor(mentorId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/admin/mentors/${mentorId}`);
  }

  /**
   * Lista todos os mentorados (admin only) com cache
   */
  listAllMentorados(): Observable<any[]> {
    // 1. Tentar carregar do cache primeiro
    this.loadMentoradosFromCache();

    // 2. Fazer fetch em background para dados frescos
    return this.http.get<{ data: any[] }>(`${this.baseUrl}/api/admin/mentorados`).pipe(
      map(response => response.data || []),
      tap(data => {
        this._mentorados.set(data);
        this._loadingMentorados.set(false);
        this.saveMentoradosToCache(data);
      })
    );
  }

  /**
   * Carrega mentorados do localStorage se válido
   */
  private loadMentoradosFromCache(): void {
    try {
      const cached = localStorage.getItem(this.MENTORADOS_CACHE_KEY);
      if (!cached) {
        this._loadingMentorados.set(true);
        return;
      }

      const { data, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < this.CACHE_TTL;

      if (isValid && data) {
        this._mentorados.set(data);
        this._loadingMentorados.set(false);
      } else {
        this._loadingMentorados.set(true);
      }
    } catch (error) {
      this._loadingMentorados.set(true);
    }
  }

  /**
   * Salva mentorados no localStorage
   */
  private saveMentoradosToCache(data: any[]): void {
    try {
      localStorage.setItem(this.MENTORADOS_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Atribui ou reatribui mentor para um mentorado
   */
  assignMentor(mentoradoId: number, mentorId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/admin/assign-mentor`, {
      mentorado_id: mentoradoId,
      mentor_id: mentorId
    });
  }

  /**
   * Remove um mentorado do sistema
   */
  deleteMentorado(mentoradoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/admin/mentorados/${mentoradoId}`);
  }

  /**
   * Lista todos os diagnósticos (admin only)
   */
  listAllDiagnoses(page = 1, limit = 20): Observable<DiagnosisSummary[]> {
    return this.http.get<{ data: any[] }>(`${this.baseUrl}/api/admin/diagnoses?page=${page}&limit=${limit}`).pipe(
      map(response => response.data || [])
    );
  }

  /**
   * Obtém detalhes de um diagnóstico específico
   */
  getDiagnosisDetails(assessmentId: number): Observable<DiagnosisDetail> {
    return this.http.get<{ data: DiagnosisDetail }>(`${this.baseUrl}/api/admin/diagnoses/${assessmentId}`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Obtém detalhes completos de um mentorado (chats, diagnósticos)
   */
  getMentoradoDetails(mentoradoId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/admin/mentorados/${mentoradoId}/details`);
  }

  /**
   * Obtém mensagens de uma sessão de chat específica
   */
  getChatMessages(sessionId: string): Observable<any[]> {
    return this.http.get<{ messages: any[] }>(`${this.baseUrl}/api/admin/chat/${sessionId}/messages`).pipe(
      map(response => response.messages || [])
    );
  }

  /**
   * Obtém detalhes completos de um assessment/diagnóstico
   */
  getAssessmentDetails(assessmentId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/admin/assessments/${assessmentId}/details`);
  }

  /**
   * Reseta a senha de um usuário (admin only)
   */
  resetUserPassword(userId: number): Observable<{ success: boolean; temp_password: string; message: string }> {
    return this.http.post<{ success: boolean; temp_password: string; message: string }>(
      `${this.baseUrl}/api/admin/reset-user-password/${userId}`,
      {}
    );
  }

  /**
   * Reverte um mentorado para lead (admin only)
   */
  revertMentoradoToLead(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${this.baseUrl}/api/admin/mentorados/${userId}/revert-to-lead`,
      {}
    );
  }

  /**
   * Atualiza o nível de acesso de um usuário (admin only)
   * Níveis: 0=Proprietário, 1=Admin, 2=Mentor Senior, 3=Mentor, 4=Mentorado, 5=Lead
   */
  updateUserLevel(userId: number, adminLevel: number): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.baseUrl}/api/admin/users/${userId}/level`,
      { admin_level: adminLevel }
    );
  }
}

export interface DiagnosisSummary {
  assessment_id: number;
  client_name: string;
  client_email: string;
  mentor_name: string;
  overall_score: number;
  profile_type: string;
  status: string;
  completed_at: string;
}

export interface DiagnosisDetail {
  assessment_id: number;
  client_id: number;
  client_name: string;
  overall_score: number;
  profile_type: string;
  strongest_area: string;
  weakest_area: string;
  main_insights: string;
  action_plan: string;
  area_scores: {
    area_name: string;
    score: number;
    strengths: string;
    improvements: string;
    recommendations: string;
  }[];
}
