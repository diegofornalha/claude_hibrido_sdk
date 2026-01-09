import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DiagnosisArea {
  area_id: number;
  area_key: string;
  area_name: string;
  area_order: number;
  description?: string;
  icon?: string;
}

export interface DiagnosisQuestion {
  question_id: number;
  area_id: number;
  question_text: string;
  question_order: number;
  help_text?: string;
}

export interface Assessment {
  assessment_id: number;
  client_id: number;
  session_id?: string;
  status: 'in_progress' | 'completed' | 'reviewed';
  started_at: string;
  completed_at?: string;
}

export interface AssessmentAnswer {
  question_id: number;
  score: number;
  answer_text?: string;
}

export interface AssessmentAreaScore {
  area_id: number;
  area_name: string;
  score: number;
  strengths?: string;
  improvements?: string;
  recommendations?: string;
}

export interface AssessmentSummary {
  assessment_id?: number;
  status?: string;
  started_at?: string;
  completed_at?: string;
  overall_score: number | string;
  profile_type: string;
  strongest_area?: string;
  weakest_area?: string;
  main_insights?: string;
  action_plan?: string;
}

export interface AssessmentResult {
  assessment?: Assessment;
  area_scores: AssessmentAreaScore[];
  summary: AssessmentSummary;
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Cache configuration
  private readonly ASSESSMENTS_CACHE_KEY = 'user_assessments_cache';
  private readonly CHAT_SESSIONS_CACHE_KEY = 'user_chat_sessions_cache';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // Signals para estado reativo
  private readonly _assessments = signal<Assessment[]>([]);
  private readonly _chatSessions = signal<any[]>([]);
  private readonly _loadingAssessments = signal(false);
  private readonly _loadingChatSessions = signal(false);

  // Public readonly signals
  readonly assessments = this._assessments.asReadonly();
  readonly chatSessions = this._chatSessions.asReadonly();
  readonly loadingAssessments = this._loadingAssessments.asReadonly();
  readonly loadingChatSessions = this._loadingChatSessions.asReadonly();

  readonly hasAssessmentsData = computed(() => this._assessments().length > 0);
  readonly hasChatSessionsData = computed(() => this._chatSessions().length > 0);

  /**
   * Lista todas as áreas de diagnóstico com suas perguntas
   */
  getQuestions(): Observable<{ areas: DiagnosisArea[]; questions: DiagnosisQuestion[] }> {
    return this.http.get<any>(`${this.baseUrl}/api/diagnosis/questions`);
  }

  /**
   * Cria uma nova avaliação para o usuário autenticado
   */
  createAssessment(): Observable<Assessment> {
    return this.http.post<{ assessment: Assessment }>(`${this.baseUrl}/api/assessments`, {}).pipe(
      map(response => response.assessment)
    );
  }

  /**
   * Lista todas as avaliações do usuário autenticado com cache
   */
  listMyAssessments(): Observable<Assessment[]> {
    // 1. Tentar carregar do cache primeiro
    this.loadAssessmentsFromCache();

    // 2. Fazer fetch em background para dados frescos
    return this.http.get<{ success: boolean; data: Assessment[]; total: number }>(`${this.baseUrl}/api/assessments`).pipe(
      map(response => response.data || []),
      tap(data => {
        this._assessments.set(data);
        this._loadingAssessments.set(false);
        this.saveAssessmentsToCache(data);
      })
    );
  }

  /**
   * Lista todas as sessões de chat do usuário autenticado com cache
   */
  listMyChatSessions(): Observable<any[]> {
    // 1. Tentar carregar do cache primeiro
    this.loadChatSessionsFromCache();

    // 2. Fazer fetch em background para dados frescos
    return this.http.get<{ sessions: any[]; total: number }>(`${this.baseUrl}/api/chat/sessions`).pipe(
      map(response => response.sessions || []),
      tap(data => {
        this._chatSessions.set(data);
        this._loadingChatSessions.set(false);
        this.saveChatSessionsToCache(data);
      })
    );
  }

  /**
   * Carrega assessments do localStorage se válido
   */
  private loadAssessmentsFromCache(): void {
    try {
      const cached = localStorage.getItem(this.ASSESSMENTS_CACHE_KEY);
      if (!cached) {
        this._loadingAssessments.set(true);
        return;
      }

      const { data, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < this.CACHE_TTL;

      if (isValid && data) {
        this._assessments.set(data);
        this._loadingAssessments.set(false);
      } else {
        this._loadingAssessments.set(true);
      }
    } catch (error) {
      this._loadingAssessments.set(true);
    }
  }

  /**
   * Salva assessments no localStorage
   */
  private saveAssessmentsToCache(data: Assessment[]): void {
    try {
      localStorage.setItem(this.ASSESSMENTS_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Carrega chat sessions do localStorage se válido
   */
  private loadChatSessionsFromCache(): void {
    try {
      const cached = localStorage.getItem(this.CHAT_SESSIONS_CACHE_KEY);
      if (!cached) {
        this._loadingChatSessions.set(true);
        return;
      }

      const { data, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < this.CACHE_TTL;

      if (isValid && data) {
        this._chatSessions.set(data);
        this._loadingChatSessions.set(false);
      } else {
        this._loadingChatSessions.set(true);
      }
    } catch (error) {
      this._loadingChatSessions.set(true);
    }
  }

  /**
   * Salva chat sessions no localStorage
   */
  private saveChatSessionsToCache(data: any[]): void {
    try {
      localStorage.setItem(this.CHAT_SESSIONS_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Carrega mensagens de uma sessão de chat específica
   */
  getChatMessages(sessionId: string): Observable<any[]> {
    return this.http.get<{ success: boolean; messages: any[] }>(`${this.baseUrl}/api/chat/sessions/${sessionId}/messages`).pipe(
      map(response => response.messages || [])
    );
  }

  /**
   * Apaga uma sessão de chat
   */
  deleteChatSession(sessionId: string): Observable<boolean> {
    return this.http.delete<{ success?: boolean; status?: string }>(`${this.baseUrl}/api/chat/sessions/${sessionId}`).pipe(
      tap(response => {
        if (response.success || response.status === 'success') {
          // Remover da lista local
          this._chatSessions.update(sessions =>
            sessions.filter(s => s.session_id !== sessionId)
          );
          // Atualizar cache
          this.saveChatSessionsToCache(this._chatSessions());
        }
      }),
      map(response => response.success || response.status === 'success')
    );
  }

  /**
   * Salva respostas de uma avaliação
   */
  saveAnswers(assessmentId: number, answers: AssessmentAnswer[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/api/assessments/${assessmentId}/answers`, { answers });
  }

  /**
   * Finaliza uma avaliação e gera o diagnóstico
   */
  completeAssessment(assessmentId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/api/assessments/${assessmentId}/complete`, {});
  }

  /**
   * Obtém o resultado de uma avaliação completada
   */
  getAssessmentResult(assessmentId: number): Observable<AssessmentResult> {
    return this.http.get<{ success: boolean; data: AssessmentResult }>(`${this.baseUrl}/api/assessments/${assessmentId}/result`).pipe(
      map(response => response.data)
    );
  }
}
