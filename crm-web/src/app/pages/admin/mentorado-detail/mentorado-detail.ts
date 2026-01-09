import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

interface MentoradoDetailData {
  user_id: number;
  username: string;
  email: string;
  profession?: string;
  specialty?: string;
  current_revenue?: number;
  desired_revenue?: number;
  mentor_nome?: string;
  created_at?: string;
  admin_level?: number;
}

interface AdminLevel {
  value: number;
  label: string;
  description: string;
}

interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  message_count: number;
}

interface Assessment {
  assessment_id: number;
  created_at: string;
  overall_score?: number;
  profile_type?: string;
  status: string;
}

@Component({
  selector: 'app-mentorado-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <a routerLink="/admin/niveis/4" class="text-purple-600 hover:underline flex items-center gap-1 mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Voltar para lista
          </a>
        </div>

        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          </div>
        }

        @defer {
          <!-- Profile Card -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="flex items-start gap-6">
              <div class="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-3xl font-bold text-emerald-600">
                {{ mentorado()!.username?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="flex-1">
                <h1 class="text-2xl font-bold text-gray-900">{{ mentorado()!.username }}</h1>
                <p class="text-gray-600">{{ mentorado()!.email }}</p>
              </div>
              <div class="text-right">
                @if (mentorado()!.current_revenue) {
                  <div class="text-sm text-gray-500">Receita atual</div>
                  <div class="text-xl font-bold text-gray-900">R$ {{ mentorado()!.current_revenue }}</div>
                  <div class="text-sm text-emerald-600 mt-1">Meta: R$ {{ mentorado()!.desired_revenue }}</div>
                }
              </div>
            </div>

            <!-- Admin Actions -->
            <div class="mt-4 flex flex-wrap gap-3 items-center">
              <button
                (click)="resetPassword()"
                [disabled]="resettingPassword()"
                class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1 1 21 9z"/>
                </svg>
                {{ resettingPassword() ? 'Resetando...' : 'Resetar Senha' }}
              </button>

              <!-- Dropdown de Nível -->
              <div class="flex items-center gap-2">
                <label class="text-sm font-medium text-gray-600">Nível:</label>
                <select
                  [value]="mentorado()?.admin_level ?? 4"
                  (change)="onLevelChange($event)"
                  [disabled]="updatingLevel()"
                  class="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  @for (level of adminLevels; track level.value) {
                    <option [value]="level.value">{{ level.label }}</option>
                  }
                </select>
                @if (updatingLevel()) {
                  <div class="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                }
              </div>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow p-6">
              <div class="text-gray-500 text-sm">Total de Fontes</div>
              <div class="text-3xl font-bold text-purple-600">{{ chatSessions().length }}</div>
            </div>
            <div class="bg-white rounded-xl shadow p-6">
              <div class="text-gray-500 text-sm">Diagnósticos</div>
              <div class="text-3xl font-bold text-emerald-600">{{ assessments().length }}</div>
            </div>
            <div class="bg-white rounded-xl shadow p-6">
              <div class="text-gray-500 text-sm">Última Atividade</div>
              <div class="text-lg font-semibold text-gray-700">
                {{ getLastActivity() }}
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="flex border-b">
              <button
                (click)="activeTab.set('chats')"
                class="flex-1 px-4 py-4 text-center font-medium transition"
                [class.bg-purple-50]="activeTab() === 'chats'"
                [class.text-purple-600]="activeTab() === 'chats'"
                [class.border-b-2]="activeTab() === 'chats'"
                [class.border-purple-600]="activeTab() === 'chats'"
              >
                Histórico de Fontes ({{ chatSessions().length }})
              </button>
              <button
                (click)="activeTab.set('assessments')"
                class="flex-1 px-4 py-4 text-center font-medium transition"
                [class.bg-emerald-50]="activeTab() === 'assessments'"
                [class.text-emerald-600]="activeTab() === 'assessments'"
                [class.border-b-2]="activeTab() === 'assessments'"
                [class.border-emerald-600]="activeTab() === 'assessments'"
              >
                Diagnósticos ({{ assessments().length }})
              </button>
              <button
                (click)="activeTab.set('action-plan')"
                class="flex-1 px-4 py-4 text-center font-medium transition"
                [class.bg-amber-50]="activeTab() === 'action-plan'"
                [class.text-amber-600]="activeTab() === 'action-plan'"
                [class.border-b-2]="activeTab() === 'action-plan'"
                [class.border-amber-600]="activeTab() === 'action-plan'"
              >
                Plano de Ação
              </button>
            </div>

            <div class="p-6">
              @if (activeTab() === 'chats') {
                @if (chatSessions().length === 0) {
                  <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (session of chatSessions(); track session.session_id) {
                      <a
                        [routerLink]="['/chat', session.session_id]"
                        class="border rounded-lg p-4 hover:border-purple-500 cursor-pointer transition block"
                      >
                        <div class="flex items-center justify-between">
                          <div>
                            <h3 class="font-medium text-gray-900">{{ session.title || 'Conversa sem título' }}</h3>
                            <p class="text-sm text-gray-500">{{ formatDate(session.created_at) }} - {{ session.message_count }} mensagens</p>
                          </div>
                          <svg
                            class="w-5 h-5 text-gray-400"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </a>
                    }
                  </div>
                }
              }

              @if (activeTab() === 'assessments') {
                @if (assessments().length === 0) {
                  <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <p>Nenhum diagnóstico encontrado</p>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (assessment of assessments(); track assessment.assessment_id) {
                      <div
                        class="border rounded-lg p-4 hover:border-emerald-500 cursor-pointer transition"
                        (click)="toggleAssessmentExpand(assessment.assessment_id)"
                      >
                        <div class="flex items-center justify-between">
                          <div>
                            <h3 class="font-medium text-gray-900">Diagnóstico #{{ assessment.assessment_id }}</h3>
                            <p class="text-sm text-gray-500">{{ formatDate(assessment.created_at) }}</p>
                            @if (assessment.profile_type) {
                              <span class="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {{ assessment.profile_type }}
                              </span>
                            }
                          </div>
                          <div class="flex items-center gap-4">
                            <div class="text-right">
                              @if (assessment.overall_score !== null && assessment.overall_score !== undefined) {
                                <div class="text-2xl font-bold" [class]="getScoreColor(assessment.overall_score)">
                                  {{ assessment.overall_score }}
                                </div>
                                <div class="text-xs text-gray-500">Score geral</div>
                              } @else {
                                <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                                  {{ assessment.status || 'Em andamento' }}
                                </span>
                              }
                            </div>
                            <svg
                              class="w-5 h-5 text-gray-400 transition-transform"
                              [class.rotate-180]="expandedAssessment() === assessment.assessment_id"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                          </div>
                        </div>

                        @if (expandedAssessment() === assessment.assessment_id) {
                          <div class="mt-4 pt-4 border-t">
                            @if (loadingAssessmentDetails()) {
                              <div class="text-center py-4">
                                <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                              </div>
                            } @else if (assessmentDetails()) {
                              <div class="space-y-4">
                                <!-- Áreas forte/fraca -->
                                <div class="grid grid-cols-2 gap-4">
                                  <div class="bg-emerald-50 p-3 rounded-lg">
                                    <div class="text-xs text-emerald-600 font-medium">Área mais forte</div>
                                    <div class="text-sm font-semibold text-emerald-800">{{ assessmentDetails()!.strongest_area || 'N/A' }}</div>
                                  </div>
                                  <div class="bg-red-50 p-3 rounded-lg">
                                    <div class="text-xs text-red-600 font-medium">Área a desenvolver</div>
                                    <div class="text-sm font-semibold text-red-800">{{ assessmentDetails()!.weakest_area || 'N/A' }}</div>
                                  </div>
                                </div>

                                <!-- Insights -->
                                @if (assessmentDetails()!.main_insights) {
                                  <div class="bg-blue-50 p-4 rounded-lg">
                                    <div class="text-sm font-semibold text-blue-800 mb-2">Principais Insights</div>
                                    <p class="text-sm text-blue-700 whitespace-pre-wrap">{{ assessmentDetails()!.main_insights }}</p>
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

              @if (activeTab() === 'action-plan') {
                @if (getLatestActionPlan()) {
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
                          <p class="text-sm text-amber-600">Baseado no último diagnóstico</p>
                        </div>
                      </div>
                      <div class="prose prose-amber max-w-none">
                        <p class="text-amber-800 whitespace-pre-wrap leading-relaxed">{{ getLatestActionPlan() }}</p>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                    <p>Nenhum plano de ação disponível</p>
                    <p class="text-sm mt-2">Complete um diagnóstico para gerar o plano de ação</p>
                  </div>
                }
              }
            </div>
          </div>
        } @placeholder {
          <!-- Profile Card Skeleton -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="flex items-start gap-6">
              <app-skeleton variant="avatar" class="w-20 h-20" />
              <div class="flex-1">
                <app-skeleton variant="text" class="w-48 mb-2" />
                <app-skeleton variant="text" class="w-64" />
              </div>
            </div>
          </div>

          <!-- Stats Cards Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <app-skeleton variant="card" />
            <app-skeleton variant="card" />
            <app-skeleton variant="card" />
          </div>

          <!-- Tabs Skeleton -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <app-skeleton variant="card" class="h-64" />
          </div>
        }

        <!-- Modal de Confirmação -->
        @if (showConfirmReset()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-bold text-gray-900 mb-2">Resetar Senha</h3>
                  <p class="text-sm text-gray-600">
                    Tem certeza que deseja resetar a senha de <strong>{{ mentorado()?.email }}</strong>?
                    Uma senha temporária será gerada.
                  </p>
                </div>
              </div>

              <div class="flex gap-2 mt-6">
                <button
                  (click)="confirmReset()"
                  class="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                >
                  Sim, resetar
                </button>
                <button
                  (click)="cancelReset()"
                  class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Modal de Senha Temporária -->
        @if (tempPassword()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
              <div class="flex items-start gap-4 mb-4">
                <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-bold text-gray-900">Senha Resetada com Sucesso</h3>
                  <p class="text-sm text-gray-600 mt-1">Copie a senha abaixo e envie para o mentorado</p>
                </div>
              </div>

              <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg mb-4 border-2 border-emerald-200">
                <p class="text-xs font-medium text-emerald-700 mb-2 uppercase tracking-wide">Senha Temporária</p>
                <div class="flex items-center justify-between gap-3">
                  <p class="text-2xl font-mono font-bold text-emerald-900 select-all">
                    {{ tempPassword() }}
                  </p>
                  @if (successCopy()) {
                    <span class="text-sm text-emerald-600 font-medium">Copiado!</span>
                  }
                </div>
              </div>

              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p class="text-sm text-yellow-800">
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  O mentorado deverá trocar esta senha no primeiro login.
                </p>
              </div>

              <div class="flex gap-2">
                <button
                  (click)="copyPassword()"
                  class="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Copiar Senha
                </button>
                <button
                  (click)="closeModal()"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Toast de Erro -->
        @if (errorMessage()) {
          <div class="fixed top-4 right-4 z-50 animate-slide-in">
            <div class="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3 max-w-md">
              <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <div class="flex-1">
                <p class="font-medium">{{ errorMessage() }}</p>
              </div>
              <button (click)="errorMessage.set(null)" class="text-white hover:text-gray-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class MentoradoDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  readonly error = signal<string | null>(null);
  readonly mentorado = signal<MentoradoDetailData | null>(null);
  readonly chatSessions = signal<ChatSession[]>([]);
  readonly assessments = signal<Assessment[]>([]);
  readonly activeTab = signal<'chats' | 'assessments' | 'action-plan'>('chats');
  readonly expandedChat = signal<string | null>(null);
  readonly loadingMessages = signal(false);
  readonly chatMessages = signal<any[]>([]);
  readonly expandedAssessment = signal<number | null>(null);
  readonly loadingAssessmentDetails = signal(false);
  readonly assessmentDetails = signal<any>(null);
  readonly tempPassword = signal<string | null>(null);
  readonly resettingPassword = signal(false);
  readonly updatingLevel = signal(false);

  // Lista de níveis de admin disponíveis
  readonly adminLevels: AdminLevel[] = [
    { value: 0, label: '0 - Proprietário', description: 'Acesso total ao sistema' },
    { value: 1, label: '1 - Admin', description: 'Administrador com acesso total' },
    { value: 2, label: '2 - Mentor Senior', description: 'Mentor com permissões elevadas' },
    { value: 3, label: '3 - Mentor', description: 'Mentor padrão' },
    { value: 4, label: '4 - Mentorado', description: 'Usuário mentorado' },
    { value: 5, label: '5 - Lead', description: 'Lead/prospect' }
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMentoradoDetails(parseInt(id, 10));
    }
  }

  private loadMentoradoDetails(userId: number): void {
    this.error.set(null);

    this.adminService.getMentoradoDetails(userId).subscribe({
      next: (data) => {
        this.mentorado.set(data.mentorado);
        this.chatSessions.set(data.chat_sessions || []);
        this.assessments.set(data.assessments || []);
        this.loadLatestActionPlan();
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Erro ao carregar detalhes');
      }
    });
  }

  toggleChatExpand(sessionId: string): void {
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
    this.adminService.getChatMessages(sessionId).subscribe({
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

  getLastActivity(): string {
    const dates: Date[] = [];

    this.chatSessions().forEach(s => dates.push(new Date(s.created_at)));
    this.assessments().forEach(a => dates.push(new Date(a.created_at)));

    if (dates.length === 0) return 'Sem atividade';

    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    return this.formatDate(latest.toISOString());
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  toggleAssessmentExpand(assessmentId: number): void {
    if (this.expandedAssessment() === assessmentId) {
      this.expandedAssessment.set(null);
      this.assessmentDetails.set(null);
    } else {
      this.expandedAssessment.set(assessmentId);
      this.loadAssessmentDetails(assessmentId);
    }
  }

  private loadAssessmentDetails(assessmentId: number): void {
    this.loadingAssessmentDetails.set(true);
    this.adminService.getAssessmentDetails(assessmentId).subscribe({
      next: (details) => {
        this.assessmentDetails.set(details);
        this.loadingAssessmentDetails.set(false);
      },
      error: () => {
        this.assessmentDetails.set(null);
        this.loadingAssessmentDetails.set(false);
      }
    });
  }

  readonly latestActionPlan = signal<string | null>(null);

  getLatestActionPlan(): string | null {
    return this.latestActionPlan();
  }

  private loadLatestActionPlan(): void {
    const assessmentsList = this.assessments();
    if (assessmentsList.length === 0) return;

    // Pega o assessment mais recente
    const latestAssessment = assessmentsList[0];
    this.adminService.getAssessmentDetails(latestAssessment.assessment_id).subscribe({
      next: (details) => {
        this.latestActionPlan.set(details?.action_plan || null);
      },
      error: () => {
        this.latestActionPlan.set(null);
      }
    });
  }

  readonly showConfirmReset = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successCopy = signal(false);

  resetPassword(): void {
    this.showConfirmReset.set(true);
  }

  confirmReset(): void {
    const userId = this.mentorado()?.user_id;
    if (!userId) return;

    this.showConfirmReset.set(false);
    this.resettingPassword.set(true);

    this.adminService.resetUserPassword(userId).subscribe({
      next: (response) => {
        this.tempPassword.set(response.temp_password);
        this.resettingPassword.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Erro ao resetar senha');
        this.resettingPassword.set(false);
        setTimeout(() => this.errorMessage.set(null), 5000);
      }
    });
  }

  cancelReset(): void {
    this.showConfirmReset.set(false);
  }

  copyPassword(): void {
    const password = this.tempPassword();
    if (password) {
      navigator.clipboard.writeText(password).then(() => {
        this.successCopy.set(true);
        setTimeout(() => this.successCopy.set(false), 3000);
      });
    }
  }

  onLevelChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newLevel = parseInt(select.value, 10);
    const mentorado = this.mentorado();

    if (!mentorado) return;

    const levelInfo = this.adminLevels.find(l => l.value === newLevel);
    const levelLabel = levelInfo?.label || `Nível ${newLevel}`;

    if (!confirm(`Confirma a alteração de "${mentorado.username}" para ${levelLabel}?`)) {
      // Reverter o select para o valor anterior
      select.value = String(mentorado.admin_level ?? 4);
      return;
    }

    this.updatingLevel.set(true);

    this.adminService.updateUserLevel(mentorado.user_id, newLevel).subscribe({
      next: () => {
        // Atualiza o mentorado local com o novo level
        this.mentorado.set({ ...mentorado, admin_level: newLevel });
        this.updatingLevel.set(false);
      },
      error: (err) => {
        console.error('Erro ao atualizar nível:', err);
        this.errorMessage.set('Erro ao atualizar nível');
        // Reverter o select
        select.value = String(mentorado.admin_level ?? 4);
        this.updatingLevel.set(false);
        setTimeout(() => this.errorMessage.set(null), 5000);
      }
    });
  }

  closeModal(): void {
    this.tempPassword.set(null);
  }
}
