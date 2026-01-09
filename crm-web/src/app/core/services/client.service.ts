import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Client {
  client_id: number;
  user_id: number;
  profession?: string;
  specialty?: string;
  years_experience?: number;
  current_revenue?: number;
  desired_revenue?: number;
  main_challenge?: string;
  has_secretary?: boolean;
  team_size?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  profession: string;
  specialty?: string;
  years_experience?: number;
  current_revenue?: number;
  desired_revenue?: number;
  main_challenge?: string;
  has_secretary?: boolean;
  team_size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Cria perfil profissional do mentorado autenticado
   */
  createProfile(data: CreateClientRequest): Observable<Client> {
    return this.http.post<{ client: Client }>(`${this.baseUrl}/api/clients`, data).pipe(
      map(response => response.client)
    );
  }

  /**
   * Obtém perfil profissional do mentorado autenticado
   */
  getMyProfile(): Observable<Client> {
    return this.http.get<{ client: Client }>(`${this.baseUrl}/api/clients/me`).pipe(
      map(response => response.client)
    );
  }

  /**
   * Atualiza perfil profissional do mentorado autenticado
   */
  updateMyProfile(data: Partial<CreateClientRequest>): Observable<Client> {
    return this.http.patch<{ client: Client }>(`${this.baseUrl}/api/clients/me`, data).pipe(
      map(response => response.client)
    );
  }
}
