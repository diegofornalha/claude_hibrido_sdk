import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SkeletonComponent } from '../../../core/components/skeleton.component';
import { StateBadgeComponent } from '../../../core/components/state-badge.component';
import { LeadService } from '../../../core/services/lead.service';
import { AdminService } from '../../../core/services/admin.service';
import {
  LeadData,
  LeadEvent,
  LeadState,
  LEAD_STATE_CONFIG,
  LEAD_TEMPERATURA_CONFIG
} from '../../../core/models/lead.model';

type TabType = 'timeline' | 'dados' | 'acoes';

@Component({
  selector: 'app-lead-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, TitleCasePipe, SkeletonComponent, StateBadgeComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <a routerLink="/admin/niveis/5" class="text-purple-600 hover:underline flex items-center gap-1 mb-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Voltar para leads
          </a>
        </div>

        <!-- Error Alert -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{{ error() }}</span>
            <button (click)="error.set(null)" class="text-red-500 hover:text-red-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        <!-- Success Alert -->
        @if (success()) {
          <div class="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{{ success() }}</span>
            <button (click)="success.set(null)" class="text-green-500 hover:text-green-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        @if (loading()) {
          <app-skeleton variant="card" class="h-96" />
        }

        @if (!loading() && lead()) {
          <!-- Profile Card -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="flex items-start gap-6">
              <div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                {{ lead()!.nome?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="flex-1">
                <h1 class="text-2xl font-bold text-gray-900">{{ lead()!.nome }}</h1>
                <p class="text-gray-600">{{ lead()!.email }}</p>
                @if (lead()!.telefone) {
                  <p class="text-gray-500 mt-1">{{ lead()!.telefone }}</p>
                }
                @if (lead()!.profissao) {
                  <p class="text-purple-600 font-medium mt-2">{{ lead()!.profissao }}</p>
                }

                <!-- Admin Actions -->
                <div class="mt-4">
                  <button
                    (click)="resetPassword()"
                    [disabled]="resettingPassword()"
                    class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                    </svg>
                    {{ resettingPassword() ? 'Resetando...' : 'Resetar Senha' }}
                  </button>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-500">Cadastrado em</div>
                <div class="text-lg font-bold text-gray-900">{{ lead()!.created_at | date:'dd/MM/yyyy' }}</div>
                @if (lead()!.current_state) {
                  <div class="mt-2">
                    <app-state-badge [state]="lead()!.current_state" />
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Modal Confirmar Reset -->
          @if (showConfirmReset()) {
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">Resetar Senha</h3>
                    <p class="text-sm text-gray-600">
                      Tem certeza que deseja resetar a senha de <strong>{{ lead()?.email }}</strong>?
                      Uma senha temporaria sera gerada.
                    </p>
                  </div>
                </div>

                <div class="flex justify-end gap-3 mt-6">
                  <button
                    (click)="showConfirmReset.set(false)"
                    class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    (click)="confirmReset()"
                    class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                  >
                    Confirmar Reset
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Modal Senha Temporaria -->
          @if (tempPassword()) {
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div class="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">Senha Resetada!</h3>
                    <p class="text-sm text-gray-600 mb-4">
                      Nova senha temporaria para <strong>{{ lead()?.email }}</strong>:
                    </p>
                    <div class="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                      <code class="text-lg font-mono font-bold text-purple-600">{{ tempPassword() }}</code>
                      <button
                        (click)="copyPassword()"
                        class="p-2 hover:bg-gray-200 rounded transition"
                        title="Copiar senha"
                      >
                        @if (successCopy()) {
                          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        } @else {
                          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                        }
                      </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                      O usuario devera trocar a senha no primeiro acesso.
                    </p>
                  </div>
                </div>

                <div class="flex justify-end mt-6">
                  <button
                    (click)="tempPassword.set(null)"
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Info Cards -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <!-- Temperatura -->
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-sm text-gray-500 mb-1">Temperatura</div>
              <div [class]="temperaturaClass()" class="text-lg font-semibold">
                {{ lead()!.temperatura ? (lead()!.temperatura | titlecase) : 'N/A' }}
              </div>
            </div>

            <!-- Origem -->
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-sm text-gray-500 mb-1">Origem</div>
              <div class="text-lg font-semibold text-gray-900">
                {{ lead()!.origem?.source || 'Direto' }}
              </div>
            </div>

            <!-- Team -->
            <div class="bg-white rounded-xl shadow p-4">
              <div class="text-sm text-gray-500 mb-1">Time Responsavel</div>
              <div class="text-lg font-semibold text-gray-900">
                {{ lead()!.owner_team || 'Nao atribuido' }}
              </div>
            </div>
          </div>

          <!-- Tabs Navigation -->
          <div class="bg-white rounded-xl shadow mb-6">
            <div class="border-b border-gray-200">
              <nav class="flex -mb-px">
                <button
                  (click)="activeTab.set('timeline')"
                  [class]="tabClass('timeline')"
                  class="px-6 py-4 text-sm font-medium"
                >
                  Timeline
                </button>
                <button
                  (click)="activeTab.set('dados')"
                  [class]="tabClass('dados')"
                  class="px-6 py-4 text-sm font-medium"
                >
                  Dados
                </button>
                <button
                  (click)="activeTab.set('acoes')"
                  [class]="tabClass('acoes')"
                  class="px-6 py-4 text-sm font-medium"
                >
                  Acoes
                </button>
              </nav>
            </div>

            <!-- Tab Content -->
            <div class="p-6">
              @switch (activeTab()) {
                @case ('timeline') {
                  @if (events().length === 0) {
                    <div class="text-center py-8 text-gray-500">
                      <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <p>Nenhum evento registrado ainda</p>
                    </div>
                  } @else {
                    <div class="space-y-4">
                      @for (event of events(); track event.event_id) {
                        <div class="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                          <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            {{ getEventIcon(event.event_type) }}
                          </div>
                          <div class="flex-1">
                            <div class="font-medium text-gray-900">{{ getEventLabel(event.event_type) }}</div>
                            @if (event.event_data) {
                              <div class="text-sm text-gray-500">{{ formatEventData(event.event_data) }}</div>
                            }
                            <div class="text-xs text-gray-400 mt-1">{{ event.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                }

                @case ('dados') {
                  <div class="grid grid-cols-2 gap-6">
                    <!-- Dados de Origem -->
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-3">Origem</h4>
                      <div class="space-y-2 text-sm">
                        @if (lead()!.origem) {
                          <div class="flex justify-between">
                            <span class="text-gray-500">Fonte:</span>
                            <span class="font-medium">{{ lead()!.origem!.source }}</span>
                          </div>
                          @if (lead()!.origem!.form_name) {
                            <div class="flex justify-between">
                              <span class="text-gray-500">Formulario:</span>
                              <span class="font-medium">{{ lead()!.origem!.form_name }}</span>
                            </div>
                          }
                          @if (lead()!.origem!.utm_source) {
                            <div class="flex justify-between">
                              <span class="text-gray-500">UTM Source:</span>
                              <span class="font-medium">{{ lead()!.origem!.utm_source }}</span>
                            </div>
                          }
                          @if (lead()!.origem!.utm_campaign) {
                            <div class="flex justify-between">
                              <span class="text-gray-500">Campanha:</span>
                              <span class="font-medium text-xs">{{ lead()!.origem!.utm_campaign }}</span>
                            </div>
                          }
                          @if (lead()!.origem!.utm_medium) {
                            <div class="flex justify-between">
                              <span class="text-gray-500">Medium:</span>
                              <span class="font-medium">{{ lead()!.origem!.utm_medium }}</span>
                            </div>
                          }
                        } @else {
                          <p class="text-gray-500">Sem dados de origem</p>
                        }
                      </div>
                    </div>

                    <!-- Datas -->
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-3">Datas</h4>
                      <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                          <span class="text-gray-500">Cadastro:</span>
                          <span class="font-medium">{{ lead()!.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                        </div>
                        @if (lead()!.ultimo_contato) {
                          <div class="flex justify-between">
                            <span class="text-gray-500">Ultimo contato:</span>
                            <span class="font-medium">{{ lead()!.ultimo_contato | date:'dd/MM/yyyy' }}</span>
                          </div>
                        }
                        @if (lead()!.proximo_follow_up) {
                          <div class="flex justify-between">
                            <span class="text-gray-500">Proximo follow-up:</span>
                            <span class="font-medium text-purple-600">{{ lead()!.proximo_follow_up | date:'dd/MM/yyyy' }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }

                @case ('acoes') {
                  <div class="space-y-6">
                    <!-- Mudar Estado -->
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-3">Mudar Estado no Funil</h4>
                      <div class="flex flex-wrap gap-2">
                        @for (state of availableStates; track state) {
                          <button
                            (click)="changeState(state)"
                            [disabled]="lead()!.current_state === state || updatingState()"
                            [class]="stateButtonClass(state)"
                            class="px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {{ LEAD_STATE_CONFIG[state].label }}
                          </button>
                        }
                      </div>
                    </div>

                    <!-- Acoes Rapidas -->
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-3">Acoes Rapidas</h4>
                      <div class="flex flex-wrap gap-3">
                        <button
                          (click)="registerEvent('call_agendada')"
                          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                          Agendar Call
                        </button>
                        <button
                          (click)="registerEvent('email_enviado')"
                          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          Registrar Email
                        </button>
                        <button
                          (click)="registerEvent('whatsapp_enviado')"
                          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          Registrar WhatsApp
                        </button>
                      </div>
                    </div>

                    <!-- Conversao -->
                    <div class="pt-4 border-t border-gray-200">
                      <h4 class="font-semibold text-gray-900 mb-3">Conversao</h4>
                      <button
                        (click)="convertToMentorado()"
                        [disabled]="convertingToMentorado()"
                        class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        @if (convertingToMentorado()) {
                          Convertendo...
                        } @else {
                          Converter para Mentorado
                        }
                      </button>
                      <p class="text-sm text-gray-500 mt-2">
                        Ao converter, o lead passa a ter acesso ao sistema como mentorado.
                      </p>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class LeadDetail implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly lead = signal<LeadData | null>(null);
  readonly events = signal<LeadEvent[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly activeTab = signal<TabType>('timeline');
  readonly convertingToMentorado = signal(false);
  readonly updatingState = signal(false);

  // Reset password
  readonly resettingPassword = signal(false);
  readonly showConfirmReset = signal(false);
  readonly tempPassword = signal<string | null>(null);
  readonly successCopy = signal(false);

  readonly LEAD_STATE_CONFIG = LEAD_STATE_CONFIG;

  readonly availableStates: LeadState[] = [
    'novo',
    'CRM_pendente',
    'CRM_agendado',
    'em_atendimento',
    'proposta_enviada',
    'produto_vendido',
    'perdido'
  ];

  readonly temperaturaClass = computed(() => {
    const temp = this.lead()?.temperatura;
    if (!temp) return 'text-gray-500';
    return LEAD_TEMPERATURA_CONFIG[temp]?.class || 'text-gray-500';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadLead(id);
    } else {
      this.error.set('ID do lead invalido');
      this.loading.set(false);
    }
  }

  loadLead(leadId: number): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      lead: this.leadService.getLeadDetails(leadId),
      events: this.leadService.getLeadEvents(leadId).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ lead, events }) => {
        this.lead.set(lead);
        this.events.set(events);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err?.error?.detail || err?.message || 'Erro ao carregar lead';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  tabClass(tab: TabType): string {
    const isActive = this.activeTab() === tab;
    return isActive
      ? 'border-b-2 border-purple-600 text-purple-600'
      : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent';
  }

  stateButtonClass(state: LeadState): string {
    const config = LEAD_STATE_CONFIG[state];
    const isCurrentState = this.lead()?.current_state === state;
    if (isCurrentState) {
      return `${config.bgClass} ${config.textClass} ring-2 ring-offset-1 ring-purple-400`;
    }
    return `bg-gray-100 text-gray-700 hover:${config.bgClass} hover:${config.textClass}`;
  }

  changeState(newState: LeadState): void {
    const leadId = this.lead()?.user_id;
    if (!leadId) return;

    this.updatingState.set(true);
    this.error.set(null);

    this.leadService.updateLeadState(leadId, newState).subscribe({
      next: () => {
        this.success.set(`Estado alterado para ${LEAD_STATE_CONFIG[newState].label}`);
        this.loadLead(leadId);
        this.updatingState.set(false);
        setTimeout(() => this.success.set(null), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Erro ao atualizar estado');
        this.updatingState.set(false);
      }
    });
  }

  registerEvent(eventType: string): void {
    const leadId = this.lead()?.user_id;
    if (!leadId) return;

    this.leadService.addLeadEvent(leadId, eventType).subscribe({
      next: () => {
        this.success.set('Evento registrado com sucesso');
        this.loadLead(leadId);
        setTimeout(() => this.success.set(null), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Erro ao registrar evento');
      }
    });
  }

  convertToMentorado(): void {
    const leadId = this.lead()?.user_id;
    if (!leadId) return;

    // Confirmar acao
    const confirmed = window.confirm(
      'Confirma a conversao deste lead para mentorado?\n\nIsso significa que o lead virou cliente.'
    );
    if (!confirmed) return;

    this.convertingToMentorado.set(true);
    this.error.set(null);

    this.leadService.convertToMentorado(leadId).subscribe({
      next: (result) => {
        this.success.set('Lead convertido para mentorado com sucesso!');
        this.convertingToMentorado.set(false);
        // Navegar para pagina do novo mentorado
        setTimeout(() => {
          this.router.navigate(['/admin/niveis/4', result.user_id]);
        }, 1500);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || 'Erro ao converter lead');
        this.convertingToMentorado.set(false);
      }
    });
  }

  getEventIcon(eventType: string): string {
    const icons: Record<string, string> = {
      lead_criado: '+',
      estado_alterado: '*',
      call_agendada: 'C',
      call_realizada: 'C',
      email_enviado: '@',
      whatsapp_enviado: 'W',
      proposta_enviada: '$',
      convertido: '!'
    };
    return icons[eventType] || '?';
  }

  getEventLabel(eventType: string): string {
    const labels: Record<string, string> = {
      lead_criado: 'Lead criado',
      estado_alterado: 'Estado alterado',
      call_agendada: 'Call agendada',
      call_realizada: 'Call realizada',
      email_enviado: 'Email enviado',
      whatsapp_enviado: 'WhatsApp enviado',
      proposta_enviada: 'Proposta enviada',
      convertido: 'Convertido para mentorado'
    };
    return labels[eventType] || eventType;
  }

  formatEventData(data: Record<string, unknown>): string {
    if (!data) return '';
    // Mostrar campos relevantes do evento
    const parts: string[] = [];
    if (data['old_state'] && data['new_state']) {
      parts.push(`${data['old_state']} -> ${data['new_state']}`);
    }
    if (data['note']) {
      parts.push(String(data['note']));
    }
    return parts.join(' | ');
  }

  // Reset password methods
  resetPassword(): void {
    this.showConfirmReset.set(true);
  }

  confirmReset(): void {
    const userId = this.lead()?.user_id;
    if (!userId) return;

    this.showConfirmReset.set(false);
    this.resettingPassword.set(true);

    this.adminService.resetUserPassword(userId).subscribe({
      next: (response) => {
        this.tempPassword.set(response.temp_password);
        this.resettingPassword.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Erro ao resetar senha');
        this.resettingPassword.set(false);
        setTimeout(() => this.error.set(null), 5000);
      }
    });
  }

  copyPassword(): void {
    const password = this.tempPassword();
    if (!password) return;

    navigator.clipboard.writeText(password).then(() => {
      this.successCopy.set(true);
      setTimeout(() => this.successCopy.set(false), 2000);
    });
  }
}
