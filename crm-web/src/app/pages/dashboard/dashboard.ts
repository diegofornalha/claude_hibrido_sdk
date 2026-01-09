import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DiagnosisService } from '../../core/services/diagnosis.service';
import { ClientService } from '../../core/services/client.service';
import { SkeletonComponent } from '../../core/components/skeleton.component';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-4 md:p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold">Bem-vindo, {{ authService.user()?.username }}!</h1>
            </div>
            <div class="flex items-center gap-2">
              <a
                [routerLink]="'/' + userId() + '/profile'"
                class="px-2 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm md:text-base"
              >
                Perfil
              </a>
              <button
                (click)="authService.logout()"
                class="px-2 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm md:text-base"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Ações Rápidas</h2>
          <div class="grid grid-cols-3 gap-4">

            <a
              [routerLink]="'/' + userId() + '/CRM'"
              class="flex items-center gap-4 p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl hover:shadow-lg hover:border-purple-400 transition"
            >
              <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <div>
                <div class="font-bold text-purple-900 text-lg">Diagnóstico</div>
                <div class="text-sm text-purple-700">Avaliação das 7 áreas</div>
              </div>
            </a>

            <a
              [routerLink]="'/' + userId() + '/chat'"
              class="flex items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl hover:shadow-lg hover:border-blue-400 transition"
            >
              <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <div>
                <div class="font-bold text-blue-900 text-lg">Chat</div>
                <div class="text-sm text-blue-700">Conversa livre</div>
              </div>
            </a>

            <a
              [routerLink]="'/' + userId() + '/diagnosis/history'"
              class="flex items-center gap-4 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl hover:shadow-lg hover:border-emerald-400 transition"
            >
              <svg class="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              <div>
                <div class="font-bold text-emerald-900 text-lg">Historico</div>
                <div class="text-sm text-emerald-700">Meus CRMs</div>
              </div>
            </a>
          </div>
        </div>

        <!-- Histórico, Diagnósticos & Planos -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div class="flex border-b">
            <button
              (click)="activeTab.set('fontes')"
              class="flex-1 px-4 py-4 text-center font-medium transition"
              [class.bg-purple-50]="activeTab() === 'fontes'"
              [class.text-purple-600]="activeTab() === 'fontes'"
              [class.border-b-2]="activeTab() === 'fontes'"
              [class.border-purple-600]="activeTab() === 'fontes'"
            >
              Histórico ({{ diagnosisService.chatSessions().length }})
            </button>
            <button
              (click)="activeTab.set('CRMs')"
              class="flex-1 px-4 py-4 text-center font-medium transition"
              [class.bg-emerald-50]="activeTab() === 'CRMs'"
              [class.text-emerald-600]="activeTab() === 'CRMs'"
              [class.border-b-2]="activeTab() === 'CRMs'"
              [class.border-emerald-600]="activeTab() === 'CRMs'"
            >
              Diagnósticos ({{ diagnosisService.assessments().length }})
            </button>
            <button
              (click)="activeTab.set('planos')"
              class="flex-1 px-4 py-4 text-center font-medium transition"
              [class.bg-amber-50]="activeTab() === 'planos'"
              [class.text-amber-600]="activeTab() === 'planos'"
              [class.border-b-2]="activeTab() === 'planos'"
              [class.border-amber-600]="activeTab() === 'planos'"
            >
              Plano de Ação
            </button>
          </div>

          @defer (when !loading()) {
            <div class="p-6">
              <!-- Aba Fontes -->
              @if (activeTab() === 'fontes') {
                @if (diagnosisService.chatSessions().length === 0) {
                  <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <p class="text-lg">Nenhum diagnóstico registrado</p>
                    <p class="text-sm mt-2">Seus diagnósticos aparecerão aqui</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (session of diagnosisService.chatSessions(); track session.session_id) {
                      <div class="border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition cursor-pointer"
                           (click)="toggleChatSession(session.session_id)">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                              </svg>
                            </div>
                            <div>
                              <div class="font-medium text-gray-900">{{ session.title || 'Diagnóstico' }}</div>
                              <div class="text-sm text-gray-500">{{ formatDate(session.created_at) }}</div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            <!-- Ir para o chat -->
                            <a
                              [routerLink]="'/' + userId() + '/chat/' + session.session_id"
                              (click)="$event.stopPropagation()"
                              class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                              title="Abrir conversa"
                            >
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                              </svg>
                            </a>
                            <!-- Apagar -->
                            <button
                              (click)="deleteSession(session.session_id); $event.stopPropagation()"
                              class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Apagar diagnóstico"
                            >
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                            <!-- Expandir -->
                            <svg class="w-5 h-5 text-gray-400 transition-transform"
                                 [class.rotate-180]="expandedChat() === session.session_id"
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                          </div>
                        </div>

                        @if (expandedChat() === session.session_id) {
                          <div class="mt-4 pt-4 border-t">
                            @if (loadingMessages()) {
                              <div class="text-center py-4">
                                <div class="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                              </div>
                            } @else {
                              <div class="space-y-3 max-h-96 overflow-y-auto">
                                @for (msg of chatMessages(); track $index) {
                                  <div [class]="msg.role === 'user' ? 'text-right' : 'text-left'">
                                    <div
                                      [class]="msg.role === 'user'
                                        ? 'inline-block bg-purple-100 text-purple-900 rounded-lg px-3 py-2 max-w-[80%] text-left'
                                        : 'inline-block bg-gray-100 text-gray-900 rounded-lg px-3 py-2 max-w-[80%]'"
                                    >
                                      <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
                                      <p class="text-xs text-gray-500 mt-1">{{ formatTime(msg.created_at) }}</p>
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }

              <!-- Aba Diagnósticos -->
              @if (activeTab() === 'CRMs') {
                @if (diagnosisService.assessments().length === 0) {
                  <div class="text-center py-12 text-gray-500">
                    <div class="text-6xl mb-4">📋</div>
                    <p class="text-lg">Nenhum diagnóstico realizado ainda</p>
                    <p class="text-sm mt-2">Clique em "Diagnóstico" para começar</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (assessment of diagnosisService.assessments().slice(0, 5); track assessment.assessment_id) {
                      <div class="border-2 border-gray-200 rounded-xl p-6 hover:border-emerald-500 transition">
                        <div class="flex items-center justify-between">
                          <div>
                            <div class="font-semibold text-gray-900 mb-1">
                              Diagnóstico #{{ assessment.assessment_id }}
                            </div>
                            <div class="text-sm text-gray-500">
                              {{ formatDate(assessment.started_at) }}
                            </div>
                            <span [class]="getStatusClass(assessment.status)" class="inline-block mt-2 px-3 py-1 rounded-full text-sm">
                              {{ getStatusLabel(assessment.status) }}
                            </span>
                          </div>
                          @if (assessment.status === 'completed') {
                            <a
                              [routerLink]="'/' + userId() + '/diagnosis/result/' + assessment.assessment_id"
                              class="p-2 md:p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xl md:text-2xl"
                              title="Ver resultado"
                            >
                              →
                            </a>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              }

              <!-- Aba Planos de Ação -->
              @if (activeTab() === 'planos') {
                @if (latestActionPlan()) {
                  <div class="space-y-4">
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                          </svg>
                        </div>
                        <div>
                          <h3 class="font-semibold text-amber-900">Plano de Ação</h3>
                          <p class="text-sm text-amber-600">Baseado no seu último diagnóstico</p>
                        </div>
                      </div>
                      <div class="prose prose-amber max-w-none">
                        <p class="text-amber-800 whitespace-pre-wrap leading-relaxed">{{ latestActionPlan() }}</p>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-12 text-gray-500">
                    <div class="text-6xl mb-4">🎯</div>
                    <p class="text-lg">Nenhum plano de ação disponível</p>
                    <p class="text-sm mt-2">Complete um diagnóstico para receber seu plano personalizado</p>
                  </div>
                }
              }
            </div>
          } @placeholder {
            <div class="p-6">
              <app-skeleton variant="card" />
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class Dashboard implements OnInit {
  readonly authService = inject(AuthService);
  readonly diagnosisService = inject(DiagnosisService);
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);

  // UserId para construir rotas
  readonly userId = computed(() => this.authService.user()?.user_id || 0);

  readonly loading = computed(() =>
    this.diagnosisService.loadingAssessments() || this.diagnosisService.loadingChatSessions()
  );
  readonly latestScore = signal<number | null>(null);
  readonly hasProfile = signal(false);
  readonly activeTab = signal<'fontes' | 'CRMs' | 'planos'>('fontes');
  readonly latestActionPlan = signal<string | null>(null);
  readonly expandedChat = signal<string | null>(null);
  readonly chatMessages = signal<any[]>([]);
  readonly loadingMessages = signal(false);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Carregar perfil
    this.clientService.getMyProfile().subscribe({
      next: () => this.hasProfile.set(true),
      error: () => this.hasProfile.set(false)
    });

    // Carregar sessões de chat (com cache)
    this.diagnosisService.listMyChatSessions().subscribe({
      next: () => {}, // Dados já estão no signal do service
      error: () => {}
    });

    // Carregar diagnósticos (com cache)
    this.diagnosisService.listMyAssessments().subscribe({
      next: () => {
        // Pegar último score e action_plan se houver diagnóstico completo
        const assessments = this.diagnosisService.assessments();
        const completed = assessments.find(a => a.status === 'completed');
        if (completed?.assessment_id) {
          this.diagnosisService.getAssessmentResult(completed.assessment_id).subscribe({
            next: (result) => {
              // Converter score para número e dividir por 10 (0-100 -> 0-10)
              const score = parseFloat(String(result.summary.overall_score)) / 10;
              this.latestScore.set(score);
              // Salvar action_plan do último diagnóstico
              if (result.summary?.action_plan) {
                this.latestActionPlan.set(result.summary.action_plan);
              }
            },
            error: () => {}
          });
        }
      },
      error: () => {}
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'in_progress': 'Em Progresso',
      'completed': 'Concluído',
      'reviewed': 'Revisado'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'reviewed': 'bg-blue-100 text-blue-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  toggleChatSession(sessionId: string): void {
    if (this.expandedChat() === sessionId) {
      this.expandedChat.set(null);
      this.chatMessages.set([]);
    } else {
      this.expandedChat.set(sessionId);
      this.loadChatMessages(sessionId);
    }
  }

  private loadChatMessages(sessionId: string): void {
    this.loadingMessages.set(true);
    this.diagnosisService.getChatMessages(sessionId).subscribe({
      next: (messages) => {
        this.chatMessages.set(messages);
        this.loadingMessages.set(false);
      },
      error: () => {
        this.chatMessages.set([]);
        this.loadingMessages.set(false);
      }
    });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  deleteSession(sessionId: string): void {
    this.diagnosisService.deleteChatSession(sessionId).subscribe();
  }
}
