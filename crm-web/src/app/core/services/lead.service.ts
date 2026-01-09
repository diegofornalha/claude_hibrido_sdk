import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LeadData, LeadEvent, LeadState } from '../models/lead.model';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Busca detalhes de um lead especifico
   */
  getLeadDetails(leadId: number): Observable<LeadData> {
    return this.http.get<{ data: LeadData }>(`${this.apiUrl}/api/admin/leads/${leadId}`).pipe(
      map(response => this.parseLeadData(response.data)),
      catchError(this.handleError)
    );
  }

  /**
   * Busca timeline de eventos de um lead
   */
  getLeadEvents(leadId: number): Observable<LeadEvent[]> {
    return this.http.get<{ events: LeadEvent[] }>(`${this.apiUrl}/api/admin/leads/${leadId}/events`).pipe(
      map(response => response.events || []),
      catchError(() => of([]))
    );
  }

  /**
   * Atualiza o estado de um lead no funil
   */
  updateLeadState(leadId: number, state: LeadState): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/api/admin/leads/${leadId}/state`, { state }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Converte um lead para mentorado (upgrade de nivel)
   */
  convertToMentorado(leadId: number): Observable<{ user_id: number }> {
    return this.http.post<{ user_id: number }>(`${this.apiUrl}/api/admin/leads/${leadId}/convert`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Adiciona um evento na timeline do lead
   */
  addLeadEvent(leadId: number, eventType: string, eventData?: Record<string, unknown>): Observable<LeadEvent> {
    return this.http.post<LeadEvent>(`${this.apiUrl}/api/admin/leads/${leadId}/events`, {
      event_type: eventType,
      event_data: eventData
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Atualiza dados do lead
   */
  updateLead(leadId: number, data: Partial<LeadData>): Observable<LeadData> {
    return this.http.patch<{ data: LeadData }>(`${this.apiUrl}/api/admin/leads/${leadId}`, data).pipe(
      map(response => this.parseLeadData(response.data)),
      catchError(this.handleError)
    );
  }

  /**
   * Parseia dados do lead vindos do backend
   * Trata o campo notes que pode conter JSON de origem
   */
  private parseLeadData(data: LeadData & { notes?: string }): LeadData {
    if (data.notes && typeof data.notes === 'string') {
      try {
        const parsed = JSON.parse(data.notes);
        data.origem = parsed.elementor_data || parsed.origem || parsed;
      } catch {
        // notes nao e JSON valido, ignora
      }
    }
    return data;
  }

  private handleError(error: unknown): Observable<never> {
    return throwError(() => error);
  }
}
