import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

interface EvolutionStage {
  id: number;
  key: string;
  name: string;
  level: number;
  type: 'lead' | 'receives_value' | 'trades_value' | 'generates_value';
  description: string | null;
  createsTenant: boolean;
  permissions: string[];
  isActive: boolean;
}

interface FunnelStage {
  stageKey: string;
  stageName: string;
  stageLevel: number;
  stageType: string;
  userCount: number;
}

@Component({
  selector: 'app-flywheel-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold">Flywheel de Evolucao</h1>
              <p class="text-white/80 mt-1">Configure os estagios de evolucao dos usuarios</p>
            </div>
            <a
              routerLink="/admin/config"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <span>&larr;</span> Voltar
            </a>
          </div>
        </div>

        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
              <span class="text-xl">&#9888;&#65039;</span>
              {{ error() }}
              <button
                (click)="loadData()"
                class="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        }

        @if (loading()) {
          <div class="mb-6">
            <app-skeleton variant="stats" />
          </div>
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="card" class="h-96" />
          </div>
        } @else {
          <!-- Flywheel Visual -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span class="text-2xl">&#128260;</span>
              Funil
            </h2>

            <div class="flex flex-col md:flex-row items-stretch gap-4">
              @for (stage of funnel(); track stage.stageKey; let i = $index) {
                <div class="flex-1 relative">
                  <div
                    class="rounded-xl p-4 text-center transition-all h-full"
                    [class]="getStageColorClass(stage.stageType)"
                  >
                    <div class="text-3xl mb-2">{{ getStageIcon(stage.stageType) }}</div>
                    <div class="font-bold text-lg">{{ stage.stageName }}</div>
                    <div class="text-sm opacity-80 mb-2">{{ stage.stageKey }}</div>
                    <div class="text-4xl font-bold">{{ stage.userCount }}</div>
                    <div class="text-sm opacity-70">usuarios</div>
                  </div>

                  @if (i < funnel().length - 1) {
                    <div class="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <span class="text-2xl text-gray-400">&rarr;</span>
                    </div>
                    <div class="md:hidden flex justify-center py-2">
                      <span class="text-2xl text-gray-400">&darr;</span>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
              <p class="text-gray-600 text-sm">
                <strong>Total:</strong> {{ totalUsers() }} usuarios |
                <strong>Taxa de conversao:</strong> {{ conversionRate() }}%
              </p>
            </div>
          </div>

          <!-- Stages Configuration -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">&#9881;&#65039;</span>
                  <div>
                    <h2 class="text-xl font-bold text-gray-900">Estagios Configurados</h2>
                    <p class="text-sm text-gray-500">Personalize, adicione ou remova estagios</p>
                  </div>
                </div>
                <button
                  (click)="openCreateModal()"
                  class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
                >
                  <span>+</span> Novo Estagio
                </button>
              </div>

              <div class="space-y-4">
                @for (stage of stages(); track stage.key) {
                  <div
                    class="border rounded-xl p-6 hover:shadow-md transition"
                    [class.border-emerald-300]="stage.isActive"
                    [class.bg-emerald-50]="stage.isActive"
                    [class.border-gray-200]="!stage.isActive"
                    [class.bg-gray-50]="!stage.isActive"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                          <span class="text-2xl">{{ getStageIcon(stage.type) }}</span>
                          <div>
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-bold text-gray-900 text-lg">{{ stage.name }}</span>
                              <span class="px-2 py-0.5 text-xs rounded-full"
                                    [class]="getStageBadgeClass(stage.type)">
                                Level {{ stage.level }}
                              </span>
                              @if (stage.createsTenant) {
                                <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  Cria Tenant
                                </span>
                              }
                            </div>
                            <p class="text-gray-500 text-sm font-mono">{{ stage.key }}</p>
                          </div>
                        </div>

                        @if (stage.description) {
                          <p class="text-gray-600 text-sm mt-2">{{ stage.description }}</p>
                        }

                        @if (stage.permissions.length > 0) {
                          <div class="mt-3 flex flex-wrap gap-2">
                            @for (perm of stage.permissions; track perm) {
                              <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {{ perm }}
                              </span>
                            }
                          </div>
                        }
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex gap-2">
                        <button
                          (click)="openEditModal(stage)"
                          class="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm"
                        >
                          Editar
                        </button>
                        <button
                          (click)="confirmDelete(stage)"
                          class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm"
                          [disabled]="deleting() === stage.key"
                        >
                          @if (deleting() === stage.key) {
                            ...
                          } @else {
                            Remover
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Stage Type Legend -->
          <div class="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h3 class="font-bold text-gray-900 mb-4">Tipos de Estagio</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-gray-400"></span>
                <span><strong>lead:</strong> Novo contato</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                <span><strong>receives_value:</strong> Recebe valor</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span><strong>trades_value:</strong> Troca valor</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-purple-500"></span>
                <span><strong>generates_value:</strong> Gera valor</span>
              </div>
            </div>
          </div>
        }

        <!-- Edit Modal -->
        @if (editingStage()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div class="p-6 border-b">
                <h3 class="text-xl font-bold text-gray-900">
                  Editar Estagio: {{ editingStage()!.name }}
                </h3>
              </div>

              <div class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Estagio</label>
                  <input
                    type="text"
                    [(ngModel)]="editForm.name"
                    class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ex: Mentorado, Aluno, Cliente..."
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                  <textarea
                    [(ngModel)]="editForm.description"
                    rows="3"
                    class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Descreva o que esse estagio representa..."
                  ></textarea>
                </div>

                <div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="editForm.createsTenant"
                      class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span class="text-sm text-gray-700">Criar tenant ao promover para este estagio</span>
                  </label>
                </div>
              </div>

              <div class="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  (click)="closeEditModal()"
                  class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="saveStage()"
                  [disabled]="saving()"
                  class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {{ saving() ? 'Salvando...' : 'Salvar' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Create Modal -->
        @if (creatingStage()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div class="p-6 border-b">
                <h3 class="text-xl font-bold text-gray-900">Novo Estagio</h3>
              </div>

              <div class="p-6 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Chave (key)</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.key"
                    class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="ex: premium_client (sem espacos)"
                  />
                  <p class="text-xs text-gray-500 mt-1">Identificador unico, sem espacos ou acentos</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    [(ngModel)]="createForm.name"
                    class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ex: Cliente Premium"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
                    <input
                      type="number"
                      [(ngModel)]="createForm.level"
                      min="0"
                      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p class="text-xs text-gray-500 mt-1">Ordem no funil (0 = primeiro)</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      [(ngModel)]="createForm.type"
                      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="lead">Lead (novo contato)</option>
                      <option value="receives_value">Recebe Valor</option>
                      <option value="trades_value">Troca Valor</option>
                      <option value="generates_value">Gera Valor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                  <textarea
                    [(ngModel)]="createForm.description"
                    rows="2"
                    class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Opcional..."
                  ></textarea>
                </div>

                <div>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="createForm.createsTenant"
                      class="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span class="text-sm text-gray-700">Criar tenant ao promover</span>
                  </label>
                </div>
              </div>

              <div class="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  (click)="closeCreateModal()"
                  class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="createStage()"
                  [disabled]="saving() || !createForm.key || !createForm.name"
                  class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {{ saving() ? 'Criando...' : 'Criar Estagio' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Delete Confirmation Modal -->
        @if (deletingStage()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div class="p-6">
                <div class="text-center">
                  <div class="text-5xl mb-4">&#9888;&#65039;</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Remover Estagio?</h3>
                  <p class="text-gray-600">
                    Tem certeza que deseja remover o estagio
                    <strong>{{ deletingStage()!.name }}</strong>?
                  </p>
                  <p class="text-sm text-red-600 mt-2">
                    Nao sera possivel remover se houver usuarios neste estagio.
                  </p>
                </div>
              </div>

              <div class="p-6 border-t bg-gray-50 flex justify-center gap-3">
                <button
                  (click)="cancelDelete()"
                  class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="deleteStage()"
                  [disabled]="deleting()"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {{ deleting() ? 'Removendo...' : 'Sim, Remover' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class FlywheelConfig implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stages = signal<EvolutionStage[]>([]);
  readonly funnel = signal<FunnelStage[]>([]);
  readonly editingStage = signal<EvolutionStage | null>(null);
  readonly creatingStage = signal(false);
  readonly deletingStage = signal<EvolutionStage | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal<string | null>(null);

  editForm = {
    name: '',
    description: '',
    createsTenant: false
  };

  createForm = {
    key: '',
    name: '',
    level: 0,
    type: 'receives_value' as const,
    description: '',
    createsTenant: false
  };

  readonly totalUsers = computed(() =>
    this.funnel().reduce((sum, s) => sum + s.userCount, 0)
  );

  readonly conversionRate = computed(() => {
    const f = this.funnel();
    if (f.length < 2 || f[0].userCount === 0) return 0;
    const firstStage = f[0].userCount;
    const lastStage = f[f.length - 1].userCount;
    return Math.round((lastStage / firstStage) * 100);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<EvolutionStage[]>(`${this.apiUrl}/api/config/stages`).subscribe({
      next: (stages) => {
        this.stages.set(stages);
        this.loadFunnel();
      },
      error: (err) => {
        this.error.set(err.error?.detail || 'Erro ao carregar estagios');
        this.loading.set(false);
      }
    });
  }

  private loadFunnel(): void {
    this.http.get<FunnelStage[]>(`${this.apiUrl}/api/config/funnel`).subscribe({
      next: (funnel) => {
        this.funnel.set(funnel);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // Edit
  openEditModal(stage: EvolutionStage): void {
    this.editingStage.set(stage);
    this.editForm = {
      name: stage.name,
      description: stage.description || '',
      createsTenant: stage.createsTenant
    };
  }

  closeEditModal(): void {
    this.editingStage.set(null);
  }

  saveStage(): void {
    const stage = this.editingStage();
    if (!stage) return;

    this.saving.set(true);

    this.http.put<EvolutionStage>(`${this.apiUrl}/api/config/stages/${stage.key}`, {
      name: this.editForm.name,
      description: this.editForm.description || null,
      createsTenant: this.editForm.createsTenant
    }).subscribe({
      next: (updated) => {
        this.stages.update(stages =>
          stages.map(s => s.key === stage.key ? updated : s)
        );
        this.saving.set(false);
        this.closeEditModal();
        this.loadFunnel();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.detail || 'Erro ao salvar estagio');
      }
    });
  }

  // Create
  openCreateModal(): void {
    this.creatingStage.set(true);
    const maxLevel = Math.max(...this.stages().map(s => s.level), -1);
    this.createForm = {
      key: '',
      name: '',
      level: maxLevel + 1,
      type: 'receives_value',
      description: '',
      createsTenant: false
    };
  }

  closeCreateModal(): void {
    this.creatingStage.set(false);
  }

  createStage(): void {
    this.saving.set(true);

    this.http.post<EvolutionStage>(`${this.apiUrl}/api/config/stages`, {
      key: this.createForm.key,
      name: this.createForm.name,
      level: this.createForm.level,
      type: this.createForm.type,
      description: this.createForm.description || null,
      createsTenant: this.createForm.createsTenant,
      permissions: []
    }).subscribe({
      next: (created) => {
        this.stages.update(stages => [...stages, created].sort((a, b) => a.level - b.level));
        this.saving.set(false);
        this.closeCreateModal();
        this.loadFunnel();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.detail || 'Erro ao criar estagio');
      }
    });
  }

  // Delete
  confirmDelete(stage: EvolutionStage): void {
    this.deletingStage.set(stage);
  }

  cancelDelete(): void {
    this.deletingStage.set(null);
  }

  deleteStage(): void {
    const stage = this.deletingStage();
    if (!stage) return;

    this.deleting.set(stage.key);

    this.http.delete(`${this.apiUrl}/api/config/stages/${stage.key}`).subscribe({
      next: () => {
        this.stages.update(stages => stages.filter(s => s.key !== stage.key));
        this.deleting.set(null);
        this.deletingStage.set(null);
        this.loadFunnel();
      },
      error: (err) => {
        this.deleting.set(null);
        this.deletingStage.set(null);
        this.error.set(err.error?.detail || 'Erro ao remover estagio');
      }
    });
  }

  getStageIcon(type: string): string {
    const icons: Record<string, string> = {
      'lead': '👤',
      'receives_value': '📚',
      'trades_value': '💰',
      'generates_value': '🌟'
    };
    return icons[type] || '📊';
  }

  getStageColorClass(type: string): string {
    const colors: Record<string, string> = {
      'lead': 'bg-gray-100 text-gray-800',
      'receives_value': 'bg-blue-100 text-blue-800',
      'trades_value': 'bg-emerald-100 text-emerald-800',
      'generates_value': 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }

  getStageBadgeClass(type: string): string {
    const colors: Record<string, string> = {
      'lead': 'bg-gray-200 text-gray-700',
      'receives_value': 'bg-blue-200 text-blue-700',
      'trades_value': 'bg-emerald-200 text-emerald-700',
      'generates_value': 'bg-purple-200 text-purple-700'
    };
    return colors[type] || 'bg-gray-200 text-gray-700';
  }
}
