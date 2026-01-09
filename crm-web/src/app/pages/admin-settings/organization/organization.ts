import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

interface AdminLevel {
  level: number;
  name: string;
  description: string | null;
  userCount: number;
  permissions?: string[];
  canManageLevels?: number[];
}

@Component({
  selector: 'app-organization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold">Organizacao</h1>
              <p class="text-white/80 mt-1">Configure a hierarquia administrativa</p>
            </div>
            <a
              routerLink="/admin/config"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <span>&larr;</span> Voltar
            </a>
          </div>
        </div>

        @if (loading()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="card" class="h-48" />
          </div>
        } @else {
          <!-- Summary -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-gray-500 text-sm font-medium mb-1">Niveis de Gestao</div>
                <div class="text-3xl font-bold text-purple-600">
                  {{ levelsCount() }}
                </div>
              </div>
              <div class="text-5xl">&#128101;</div>
            </div>
          </div>

          <!-- Admin Levels -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-xl font-bold text-gray-900">Niveis Configurados</h2>
                  <p class="text-gray-500 text-sm mt-1">Nivel 0 = Proprietario Principal. Numeros menores = mais poder.</p>
                </div>
                <button
                  (click)="openAddLevelModal()"
                  class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                >
                  <span>+</span> Novo Nivel
                </button>
              </div>

              @if (!hasLevels()) {
                <div class="text-center py-8 text-gray-500">
                  <p>Nenhum nivel configurado</p>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (level of adminLevels(); track level.level) {
                    <div class="border rounded-xl p-4 hover:shadow-md transition border-purple-200 bg-purple-50">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <span class="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                            {{ level.level }}
                          </span>
                          <div>
                            <h3 class="font-bold text-gray-900">{{ level.name }}</h3>
                            <p class="text-gray-500 text-sm">{{ level.userCount }} {{ level.userCount === 1 ? 'usuario' : 'usuarios' }}</p>
                          </div>
                        </div>
                        <div class="flex gap-2">
                          <button
                            (click)="editLevel(level)"
                            class="px-3 py-1.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition border"
                          >
                            Editar
                          </button>
                          @if (level.level !== 0) {
                            <button
                              (click)="confirmDeleteLevel(level)"
                              class="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                            >
                              Remover
                            </button>
                          }
                        </div>
                      </div>
                      @if (level.permissions && level.permissions.length > 0) {
                        <div class="flex flex-wrap gap-1 mt-3 pl-14">
                          @for (perm of level.permissions; track perm) {
                            @if (getPermissionLabel(perm)) {
                              <span class="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                                {{ getPermissionLabel(perm) }}
                              </span>
                            }
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Add/Edit Level Modal -->
        @if (showModal()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div class="p-6 border-b">
                <h3 class="text-xl font-bold text-gray-900">{{ editingLevel() ? 'Editar' : 'Novo' }} Nivel</h3>
              </div>
              <div class="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Numero do nivel</label>
                  <input
                    type="number"
                    [(ngModel)]="levelForm.level"
                    min="0"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  @if (editingLevel() && levelForm.level !== editingLevel()!.level) {
                    <p class="text-amber-600 text-xs mt-1">
                      Ao mudar o numero, o nivel antigo sera removido e um novo sera criado.
                      @if (editingLevel()!.userCount > 0) {
                        <strong>Atencao: {{ editingLevel()!.userCount }} usuario(s) serao movidos para o novo nivel.</strong>
                      }
                    </p>
                  }
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    [(ngModel)]="levelForm.name"
                    placeholder="Ex: Diretor, Gestor, Coordenador"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descricao (opcional)</label>
                  <input
                    type="text"
                    [(ngModel)]="levelForm.description"
                    placeholder="Breve descricao do nivel"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <!-- Permissões -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Permissoes</label>
                  <div class="space-y-2 border rounded-lg p-3 bg-gray-50">
                    @for (perm of availablePermissions; track perm.key) {
                      <label class="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-white transition">
                        <input
                          type="checkbox"
                          [checked]="levelForm.permissions.includes(perm.key)"
                          (change)="togglePermission(perm.key)"
                          class="mt-0.5 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <div class="flex-1">
                          <div class="font-medium text-sm text-gray-900">{{ perm.label }}</div>
                          <div class="text-xs text-gray-500">{{ perm.description }}</div>
                        </div>
                      </label>
                    }
                  </div>
                </div>

                <!-- Níveis Gerenciáveis -->
                @if (hasMultipleLevels()) {
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Pode Gerenciar Niveis</label>
                    <div class="flex flex-wrap gap-2">
                      @for (otherLevel of adminLevels(); track otherLevel.level) {
                        @if (otherLevel.level !== levelForm.level && otherLevel.level !== 0) {
                          <label
                            class="flex items-center gap-2 px-3 py-1.5 border rounded-full cursor-pointer transition"
                            [class.bg-purple-100]="levelForm.canManageLevels.includes(otherLevel.level)"
                            [class.border-purple-500]="levelForm.canManageLevels.includes(otherLevel.level)"
                            [class.text-purple-700]="levelForm.canManageLevels.includes(otherLevel.level)"
                          >
                            <input
                              type="checkbox"
                              [checked]="levelForm.canManageLevels.includes(otherLevel.level)"
                              (change)="toggleManageLevel(otherLevel.level)"
                              class="hidden"
                            />
                            <span class="text-sm font-medium">{{ otherLevel.level }} - {{ otherLevel.name }}</span>
                          </label>
                        }
                      }
                    </div>
                    @if (hasNoManageableLevels()) {
                      <p class="text-sm text-gray-500 mt-2">Nenhum outro nivel disponivel</p>
                    }
                  </div>
                }
              </div>
              <div class="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button
                  (click)="closeModal()"
                  class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="saveLevel()"
                  [disabled]="saving() || !levelForm.name"
                  class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {{ saving() ? 'Salvando...' : 'Salvar' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Delete Confirmation -->
        @if (deletingLevel()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-xl max-w-sm w-full">
              <div class="p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-2">Remover Nivel</h3>
                <p class="text-gray-600">
                  Tem certeza que deseja remover o nivel <strong>{{ deletingLevel()?.name }}</strong>?
                </p>
              </div>
              <div class="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                <button
                  (click)="deletingLevel.set(null)"
                  class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="deleteLevel()"
                  [disabled]="saving()"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {{ saving() ? 'Removendo...' : 'Remover' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class OrganizationSettings implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly loading = signal(true);
  readonly adminLevels = signal<AdminLevel[]>([]);
  readonly showModal = signal(false);
  readonly editingLevel = signal<AdminLevel | null>(null);
  readonly deletingLevel = signal<AdminLevel | null>(null);
  readonly saving = signal(false);

  // Computed signals para estado derivado
  readonly levelsCount = computed(() => this.adminLevels().length);
  readonly hasLevels = computed(() => this.adminLevels().length > 0);
  readonly hasMultipleLevels = computed(() => this.adminLevels().length > 1);

  readonly availablePermissions = [
    { key: '*', label: 'Acesso Total', description: 'Todas as permissoes do sistema' },
    { key: 'view_all', label: 'Ver Tudo', description: 'Visualizar todos os dados' },
    { key: 'manage_users', label: 'Gerenciar Usuarios', description: 'Criar, editar e remover usuarios' },
    { key: 'view_team', label: 'Ver Equipe', description: 'Visualizar dados da equipe' },
    { key: 'manage_clients', label: 'Gerenciar Clientes', description: 'Gerenciar clientes e mentorados' },
    { key: 'chat', label: 'Chat', description: 'Acesso ao chat de conversa livre com IA' },
    { key: 'CRM', label: 'CRM', description: 'Acesso ao modulo de CRM profissional' },
  ];

  levelForm = {
    level: 0,
    name: '',
    description: '',
    permissions: [] as string[],
    canManageLevels: [] as number[]
  };

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    // Usar forkJoin para buscar dados em paralelo
    forkJoin({
      levels: this.http.get<AdminLevel[]>(`${this.apiUrl}/api/config/admin-levels`),
      summary: this.http.get<{level: number; userCount: number}[]>(`${this.apiUrl}/api/config/admin-levels-summary`)
    }).subscribe({
      next: ({ levels, summary }) => {
        const countMap = new Map(summary.map(s => [s.level, s.userCount]));
        const merged = levels.map(l => ({
          ...l,
          userCount: countMap.get(l.level) || 0
        }));
        this.adminLevels.set(merged);
        this.loading.set(false);
      },
      error: () => {
        this.adminLevels.set([]);
        this.loading.set(false);
      }
    });
  }

  openAddLevelModal(): void {
    this.editingLevel.set(null);
    const maxLevel = Math.max(...this.adminLevels().map(l => l.level), -1);
    this.levelForm = {
      level: maxLevel + 1,
      name: '',
      description: '',
      permissions: [],
      canManageLevels: []
    };
    this.showModal.set(true);
  }

  editLevel(level: AdminLevel): void {
    this.editingLevel.set(level);
    this.levelForm = {
      level: level.level,
      name: level.name,
      description: level.description || '',
      permissions: [...(level.permissions || [])],
      canManageLevels: [...(level.canManageLevels || [])]
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingLevel.set(null);
  }

  confirmDeleteLevel(level: AdminLevel): void {
    this.deletingLevel.set(level);
  }

  saveLevel(): void {
    if (!this.levelForm.name) return;
    this.saving.set(true);

    const body = {
      level: this.levelForm.level,
      name: this.levelForm.name,
      description: this.levelForm.description || null,
      permissions: this.levelForm.permissions,
      canManageLevels: this.levelForm.canManageLevels
    };

    const editing = this.editingLevel();
    const levelChanged = editing && editing.level !== this.levelForm.level;

    let request;
    if (levelChanged) {
      // Renumerar: usar endpoint dedicado que migra usuarios
      request = this.http.post(`${this.apiUrl}/api/config/admin-levels/${editing!.level}/renumber`, {
        newLevel: this.levelForm.level
      }).pipe(
        // Depois de renumerar, atualizar os outros campos se necessário
        switchMap(() => this.http.put(`${this.apiUrl}/api/config/admin-levels/${this.levelForm.level}`, body))
      );
    } else if (editing) {
      // Editar sem mudar numero
      request = this.http.put(`${this.apiUrl}/api/config/admin-levels/${editing.level}`, body);
    } else {
      // Novo nivel
      request = this.http.post(`${this.apiUrl}/api/config/admin-levels`, body);
    }

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.saving.set(false);
        alert(err.error?.detail || 'Erro ao salvar');
      }
    });
  }

  deleteLevel(): void {
    const level = this.deletingLevel();
    if (!level) return;

    this.saving.set(true);
    this.http.delete(`${this.apiUrl}/api/config/admin-levels/${level.level}`).subscribe({
      next: () => {
        this.saving.set(false);
        this.deletingLevel.set(null);
        this.loadData();
      },
      error: (err) => {
        this.saving.set(false);
        alert(err.error?.detail || 'Erro ao remover');
      }
    });
  }

  togglePermission(key: string): void {
    const idx = this.levelForm.permissions.indexOf(key);
    if (idx >= 0) {
      this.levelForm.permissions.splice(idx, 1);
    } else {
      // Se selecionar "*", limpar outras e vice-versa
      if (key === '*') {
        this.levelForm.permissions = ['*'];
      } else {
        this.levelForm.permissions = this.levelForm.permissions.filter(p => p !== '*');
        this.levelForm.permissions.push(key);
      }
    }
  }

  toggleManageLevel(level: number): void {
    const idx = this.levelForm.canManageLevels.indexOf(level);
    if (idx >= 0) {
      this.levelForm.canManageLevels.splice(idx, 1);
    } else {
      this.levelForm.canManageLevels.push(level);
    }
  }

  getPermissionLabel(key: string): string | null {
    const perm = this.availablePermissions.find(p => p.key === key);
    return perm?.label || null;
  }

  hasNoManageableLevels(): boolean {
    return this.adminLevels().filter(l => l.level !== this.levelForm.level && l.level !== 0).length === 0;
  }
}
