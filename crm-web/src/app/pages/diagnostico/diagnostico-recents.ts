import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { SkeletonComponent } from '../../core/components/skeleton.component';
import { environment } from '../../../environments/environment';

interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  message_count?: number;
}

@Component({
  selector: 'app-diagnostico-recents',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <a [routerLink]="'/' + userId() + '/dashboard'" class="hover:bg-purple-700 p-2 rounded-lg transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </a>
              <div>
                <h1 class="text-2xl font-bold">Histórico de Diagnósticos</h1>
                <p class="text-purple-200 text-sm">Suas conversas de diagnóstico</p>
              </div>
            </div>
            <a
              [routerLink]="'/' + userId() + '/diagnostico'"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Novo Diagnóstico
            </a>
          </div>
        </div>

        <!-- Content -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
          @if (loading()) {
            <div class="p-6">
              <app-skeleton variant="chat-list" [count]="5" />
            </div>
          } @else if (sessions().length === 0) {
            <div class="text-center py-16 text-gray-500">
              <svg class="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <p class="text-xl font-medium mb-2">Nenhum diagnóstico ainda</p>
              <p class="text-gray-400 mb-6">Comece seu primeiro diagnóstico profissional</p>
              <a
                [routerLink]="'/' + userId() + '/diagnostico'"
                class="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Fazer Diagnóstico
              </a>
            </div>
          } @else {
            <div class="divide-y">
              @for (session of sessions(); track session.session_id) {
                <div class="p-4 hover:bg-gray-50 transition cursor-pointer group"
                     (click)="openSession(session.session_id)">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 class="font-medium text-gray-900">{{ session.title || 'Diagnóstico' }}</h3>
                        <p class="text-sm text-gray-500">{{ formatDate(session.created_at) }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        (click)="deleteSession(session.session_id, $event)"
                        class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        title="Apagar"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Link para resultados -->
        <div class="mt-6 text-center">
          <a
            [routerLink]="'/' + userId() + '/diagnosis/history'"
            class="text-purple-600 hover:underline flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Ver Resultados dos Diagnósticos
          </a>
        </div>
      </div>
    </div>
  `
})
export class DiagnosticoRecents implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly userId = computed(() => this.authService.user()?.user_id || 0);
  readonly loading = signal(true);
  readonly sessions = signal<ChatSession[]>([]);

  ngOnInit(): void {
    this.loadSessions();
  }

  private loadSessions(): void {
    this.loading.set(true);

    this.http.get<{ success?: boolean; status?: string; sessions?: ChatSession[]; data?: ChatSession[] }>(
      `${environment.apiUrl}/api/diagnostico/sessions`
    ).subscribe({
      next: (response) => {
        const data = response.sessions || response.data || [];
        // Ordenar por data (mais recentes primeiro)
        const sorted = data.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.sessions.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.sessions.set([]);
        this.loading.set(false);
      }
    });
  }

  openSession(sessionId: string): void {
    this.router.navigate(['/', this.userId(), 'diagnostico', sessionId]);
  }

  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation();

    this.http.delete(`${environment.apiUrl}/api/diagnostico/sessions/${sessionId}`).subscribe({
      next: () => {
        this.sessions.update(sessions =>
          sessions.filter(s => s.session_id !== sessionId)
        );
      }
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
  }
}
