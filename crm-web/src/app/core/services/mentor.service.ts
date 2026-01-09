import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Mentor {
  user_id: number;
  username: string;
  email: string;
  profile_image_url?: string;
  invite_code?: string;
}

export interface MentorInvite {
  invite_id: number;
  mentor_id: number;
  invite_code: string;
  uses_count: number;
  max_uses?: number;
  is_active: boolean;
  created_at: string;
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
export class MentorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Lista mentores disponíveis (público - para registro)
   */
  listAvailableMentors(): Observable<Mentor[]> {
    return this.http.get<{ mentors: Mentor[] }>(`${this.baseUrl}/api/auth/mentors`).pipe(
      map(response => response.mentors || [])
    );
  }

  /**
   * Obtém dados do próprio convite do mentor (autenticado)
   */
  getMyInvite(): Observable<MentorInvite> {
    return this.http.get<MentorInvite>(`${this.baseUrl}/api/mentor/invite`);
  }

  /**
   * Regenera código de convite do mentor (autenticado)
   */
  regenerateInvite(): Observable<MentorInvite> {
    return this.http.post<MentorInvite>(`${this.baseUrl}/api/mentor/invite/regenerate`, {});
  }

  /**
   * Lista mentorados do mentor (autenticado)
   */
  listMyMentorados(): Observable<any[]> {
    return this.http.get<{ mentorados: any[] }>(`${this.baseUrl}/api/mentor/mentorados`).pipe(
      map(response => response.mentorados || [])
    );
  }

  /**
   * Obtém estatísticas do mentor (autenticado)
   */
  getMyStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/mentor/stats`);
  }
}
