import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

interface Lead {
  lead_id: number;
  nome: string;
  email: string;
  telefone: string;
  profissao: string;
  created_at: string;
  estado_crm: string;
  time_responsavel: string;
  ultima_atualizacao: string;
  notas: string;
  notas_parsed?: {
    elementor_data?: {
      utm?: {
        source?: string;
        campaign?: string;
      };
      form_name?: string;
    };
  };
}

@Component({
  selector: 'app-admin-leads-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Leads</h1>
            <a routerLink="/admin/dashboard" class="text-purple-600 hover:underline text-2xl">←</a>
          </div>

          <p class="text-gray-500 mb-6">Leads capturados pelos formulários de captação</p>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{{ error() }}</div>
          }

          @if (loading() && leads().length === 0) {
            <div class="space-y-4">
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
            </div>
          }

          @if (!loading() || leads().length > 0) {
            <!-- Filtro por Estado -->
            <div class="flex flex-wrap gap-2 mb-6">
              <button
                (click)="filterByState(null)"
                [class]="stateFilter() === null ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'"
                class="px-4 py-2 rounded-lg font-medium transition hover:opacity-80"
              >
                Todos ({{ total() }})
              </button>
              <button
                (click)="filterByState('novo')"
                [class]="stateFilter() === 'novo' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'"
                class="px-4 py-2 rounded-lg font-medium transition hover:opacity-80"
              >
                🆕 Novos
              </button>
              <button
                (click)="filterByState('diagnostico_pendente')"
                [class]="stateFilter() === 'diagnostico_pendente' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700'"
                class="px-4 py-2 rounded-lg font-medium transition hover:opacity-80"
              >
                ⏳ Diagnóstico Pendente
              </button>
              <button
                (click)="filterByState('diagnostico_agendado')"
                [class]="stateFilter() === 'diagnostico_agendado' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'"
                class="px-4 py-2 rounded-lg font-medium transition hover:opacity-80"
              >
                📅 Agendados
              </button>
            </div>

            <!-- Campo de Pesquisa -->
            <div class="mb-6">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  placeholder="🔍 Pesquise pelo nome ou email..."
                  class="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
                />
                <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                @if (searchTerm()) {
                  <button
                    (click)="searchTerm.set('')"
                    class="absolute right-3 top-3 px-2 py-1 text-gray-400 hover:text-gray-600 transition"
                  >
                    ✕
                  </button>
                }
              </div>
            </div>

            @if (filteredLeads().length === 0) {
              <div class="py-16 text-center text-gray-500">
                <div class="text-6xl mb-4">📋</div>
                <p class="text-xl font-semibold text-gray-700 mb-2">Nenhum lead encontrado</p>
                <p class="text-sm">Os leads capturados aparecerão aqui</p>
              </div>
            }

            @if (filteredLeads().length > 0) {
              <div class="space-y-4">
                @for (lead of filteredLeads(); track lead.lead_id) {
                  <a [routerLink]="['/admin/niveis/5', lead.lead_id]" class="block border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:border-purple-500 hover:shadow-lg transition cursor-pointer">
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <h3 class="text-xl font-bold text-purple-600">{{ lead.nome }}</h3>
                          <span [class]="getStateClass(lead.estado_crm)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                            {{ getStateLabel(lead.estado_crm) }}
                          </span>
                        </div>
                        <p class="text-gray-600">{{ lead.email }}</p>
                        @if (lead.telefone) {
                          <p class="text-gray-500">📱 {{ lead.telefone }}</p>
                        }
                        @if (lead.profissao && lead.profissao !== 'Não informado') {
                          <p class="text-sm text-gray-500">💼 {{ lead.profissao }}</p>
                        }

                        <!-- UTM Info -->
                        @if (lead.notas_parsed?.elementor_data?.utm?.source) {
                          <div class="mt-2 flex flex-wrap gap-2">
                            <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                              📣 {{ lead.notas_parsed?.elementor_data?.utm?.source }}
                            </span>
                            @if (lead.notas_parsed?.elementor_data?.form_name) {
                              <span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                                📝 {{ lead.notas_parsed?.elementor_data?.form_name }}
                              </span>
                            }
                          </div>
                        }
                      </div>

                      <div class="text-right text-sm text-gray-500">
                        <p>{{ formatDate(lead.created_at) }}</p>
                        @if (lead.time_responsavel) {
                          <p class="text-blue-600">Time: {{ lead.time_responsavel }}</p>
                        }
                      </div>
                    </div>
                  </a>
                }
              </div>

              <!-- Paginação -->
              @if (totalPages() > 1) {
                <div class="flex items-center justify-between mt-6 pt-6 border-t">
                  <button
                    (click)="previousPage()"
                    [disabled]="currentPage() === 1"
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium transition hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>

                  <div class="text-sm text-gray-600">
                    Página {{ currentPage() }} de {{ totalPages() }}
                    <span class="text-gray-400 ml-2">({{ total() }} leads)</span>
                  </div>

                  <button
                    (click)="nextPage()"
                    [disabled]="currentPage() === totalPages()"
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima →
                  </button>
                </div>
              }
            }
          }
        </div>
      </div>
    </div>
  `
})
export class AdminLeadsList implements OnInit {
  private readonly http = inject(HttpClient);

  readonly leads = signal<Lead[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly currentPage = signal(1);
  readonly stateFilter = signal<string | null>(null);
  searchTerm = signal('');

  readonly filteredLeads = computed(() => {
    // Retornar leads sem filtro (filtro é feito no backend)
    return this.leads();
  });

  private searchTimeout: any;

  constructor() {
    // Effect para reagir à busca com debounce
    effect(() => {
      const search = this.searchTerm();
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.loadLeads();
      }, 500);
    });
  }

  ngOnInit(): void {
    this.loadLeads();
  }

  loadLeads(): void {
    this.loading.set(true);
    this.error.set(null);

    const state = this.stateFilter();
    const search = this.searchTerm();
    const page = this.currentPage();

    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (search) params.set('search', search);
    params.set('page', page.toString());
    params.set('per_page', '10');

    const url = `${environment.apiUrl}/api/admin/leads?${params.toString()}`;

    this.http.get<{ success: boolean; data: Lead[]; total: number; total_pages: number }>(url).subscribe({
      next: (response) => {
        if (response.success) {
          this.leads.set(response.data);
          this.total.set(response.total);
          this.totalPages.set(response.total_pages);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar leads:', err);
        this.error.set('Erro ao carregar leads');
        this.loading.set(false);
      }
    });
  }

  filterByState(state: string | null): void {
    this.stateFilter.set(state);
    this.currentPage.set(1);
    this.loadLeads();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadLeads();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadLeads();
    }
  }

  getStateClass(state: string): string {
    const classes: Record<string, string> = {
      'novo': 'bg-blue-100 text-blue-700',
      'diagnostico_pendente': 'bg-yellow-100 text-yellow-700',
      'diagnostico_agendado': 'bg-green-100 text-green-700',
      'em_atendimento': 'bg-purple-100 text-purple-700',
      'proposta_enviada': 'bg-orange-100 text-orange-700',
      'produto_vendido': 'bg-emerald-100 text-emerald-700',
      'perdido': 'bg-red-100 text-red-700',
    };
    return classes[state] || 'bg-gray-100 text-gray-700';
  }

  getStateLabel(state: string): string {
    const labels: Record<string, string> = {
      'novo': '🆕 Novo',
      'diagnostico_pendente': '⏳ Aguardando',
      'diagnostico_agendado': '📅 Agendado',
      'em_atendimento': '💬 Atendimento',
      'proposta_enviada': '📧 Proposta',
      'produto_vendido': '✅ Vendido',
      'perdido': '❌ Perdido',
    };
    return labels[state] || state || 'Sem estado';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
