import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AdminLevel {
  id: number;
  level: number;
  name: string;
  description: string | null;
  permissions: string[];
  canManageLevels: number[];
  isActive: boolean;
}

interface HierarchySummary {
  level: number;
  name: string;
  description: string | null;
  userCount: number;
}

@Component({
  selector: 'app-hierarchy-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold">Hierarquia de Gestao</h1>
              <p class="text-indigo-100 mt-1">Configure os niveis de acesso administrativo</p>
            </div>
            <a routerLink="/admin/config" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition">
              &#8592; Voltar
            </a>
          </div>
        </div>

        @if (loading()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="animate-pulse space-y-4">
              <div class="h-8 bg-gray-200 rounded w-1/3"></div>
              <div class="h-32 bg-gray-200 rounded"></div>
              <div class="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        } @else if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          </div>
        } @else {
          <!-- Hierarchy Summary -->
          <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>&#128101;</span> Piramide Hierarquica
            </h2>

            <div class="flex flex-col items-center">
              @for (item of summary(); track item.level; let i = $index) {
                <div
                  class="relative mb-2 last:mb-0"
                  [style.width.%]="100 - (i * 15)"
                >
                  <div
                    class="p-4 rounded-lg text-center transition-all"
                    [class]="getLevelClass(item.level)"
                  >
                    <div class="font-bold text-lg">{{ item.name }}</div>
                    <div class="text-sm opacity-75">Nivel {{ item.level }}</div>
                    <div class="text-2xl font-bold mt-1">{{ item.userCount }}</div>
                    <div class="text-xs opacity-75">{{ item.userCount === 1 ? 'usuario' : 'usuarios' }}</div>
                  </div>
                  @if (i < summary().length - 1) {
                    <div class="absolute left-1/2 -bottom-2 transform -translate-x-1/2 text-gray-400 text-xl">
                      &#9660;
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Levels Configuration -->
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>&#9881;&#65039;</span> Niveis Configurados
              </h2>
              <button
                (click)="openCreateModal()"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <span>+</span> Novo Nivel
              </button>
            </div>

            <p class="text-gray-500 mb-6">Personalize, adicione ou remova niveis de gestao</p>

            <div class="space-y-4">
              @for (level of levels(); track level.level) {
                <div class="border rounded-xl p-5 hover:shadow-md transition">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        [class]="getLevelBgClass(level.level)"
                      >
                        {{ level.level }}
                      </div>
                      <div>
                        <h3 class="font-bold text-gray-900">{{ level.name }}</h3>
                        <p class="text-sm text-gray-500">{{ level.description || 'Sem descricao' }}</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        (click)="openEditModal(level)"
                        class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                      >
                        Editar
                      </button>
                      @if (level.level !== 0) {
                        <button
                          (click)="openDeleteModal(level)"
                          class="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        >
                          Remover
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Permissions -->
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (perm of level.permissions; track perm) {
                      <span class="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                        {{ perm }}
                      </span>
                    }
                  </div>

                  <!-- Can Manage -->
                  @if (level.canManageLevels.length > 0) {
                    <div class="mt-2 text-xs text-gray-500">
                      Gerencia niveis: {{ level.canManageLevels.join(', ') }}
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Legend -->
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 class="font-semibold text-gray-700 mb-2">Como funciona:</h3>
              <ul class="text-sm text-gray-600 space-y-1">
                <li>&#8226; <strong>Nivel 0</strong> = Dono/Super Admin (controle total)</li>
                <li>&#8226; Niveis menores tem mais poder que niveis maiores</li>
                <li>&#8226; Cada nivel pode gerenciar apenas niveis maiores que o seu</li>
              </ul>
            </div>
          </div>
        }

        <!-- Create/Edit Modal -->
        @if (showModal()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">
                {{ editingLevel() ? 'Editar Nivel' : 'Novo Nivel' }}
              </h3>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Numero do Nivel</label>
                  <input
                    type="number"
                    [(ngModel)]="formLevel"
                    [disabled]="!!editingLevel()"
                    min="0"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    [(ngModel)]="formName"
                    placeholder="Ex: Diretor, Gestor, Coordenador"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                  <textarea
                    [(ngModel)]="formDescription"
                    rows="2"
                    placeholder="Descricao do nivel"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  ></textarea>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Pode gerenciar niveis (separados por virgula)
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="formCanManage"
                    placeholder="Ex: 2,3,4,5"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <button
                  (click)="closeModal()"
                  class="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="saveLevel()"
                  [disabled]="saving()"
                  class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {{ saving() ? 'Salvando...' : 'Salvar' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Delete Modal -->
        @if (deletingLevel()) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Remover Nivel</h3>

              <p class="text-gray-600 mb-4">
                Tem certeza que deseja remover o nivel <strong>{{ deletingLevel()?.name }}</strong>?
              </p>

              @if (getLevelUserCount(deletingLevel()!.level) > 0) {
                <div class="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-sm">
                  &#9888; Este nivel possui {{ getLevelUserCount(deletingLevel()!.level) }} usuario(s).
                  Remova os usuarios antes de excluir o nivel.
                </div>
              }

              <div class="flex gap-3">
                <button
                  (click)="deletingLevel.set(null)"
                  class="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="deleteLevel()"
                  [disabled]="deleting() || getLevelUserCount(deletingLevel()!.level) > 0"
                  class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {{ deleting() ? 'Removendo...' : 'Remover' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class HierarchyConfig implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly levels = signal<AdminLevel[]>([]);
  readonly summary = signal<HierarchySummary[]>([]);

  readonly showModal = signal(false);
  readonly editingLevel = signal<AdminLevel | null>(null);
  readonly deletingLevel = signal<AdminLevel | null>(null);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  // Form fields
  formLevel = 0;
  formName = '';
  formDescription = '';
  formCanManage = '';

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load levels and summary in parallel
    Promise.all([
      this.http.get<AdminLevel[]>(`${environment.apiUrl}/api/config/admin-levels`).toPromise(),
      this.http.get<HierarchySummary[]>(`${environment.apiUrl}/api/config/admin-levels-summary`).toPromise(),
    ])
      .then(([levels, summary]) => {
        this.levels.set(levels || []);
        this.summary.set(summary || []);
        this.loading.set(false);
      })
      .catch((err) => {
        console.error('Error loading hierarchy:', err);
        this.error.set('Erro ao carregar hierarquia');
        this.loading.set(false);
      });
  }

  getLevelClass(level: number): string {
    const classes = [
      'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white', // 0 - Dono
      'bg-gradient-to-r from-blue-500 to-blue-600 text-white',     // 1 - Diretor
      'bg-gradient-to-r from-teal-500 to-teal-600 text-white',     // 2 - Gestor
      'bg-gradient-to-r from-green-500 to-green-600 text-white',   // 3
      'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white', // 4
      'bg-gradient-to-r from-orange-500 to-orange-600 text-white', // 5
    ];
    return classes[level] || classes[classes.length - 1];
  }

  getLevelBgClass(level: number): string {
    const classes = [
      'bg-indigo-600',  // 0 - Dono
      'bg-blue-500',    // 1 - Diretor
      'bg-teal-500',    // 2 - Gestor
      'bg-green-500',   // 3
      'bg-yellow-500',  // 4
      'bg-orange-500',  // 5
    ];
    return classes[level] || classes[classes.length - 1];
  }

  getLevelUserCount(level: number): number {
    const item = this.summary().find(s => s.level === level);
    return item?.userCount || 0;
  }

  openCreateModal(): void {
    this.editingLevel.set(null);
    this.formLevel = this.getNextLevel();
    this.formName = '';
    this.formDescription = '';
    this.formCanManage = this.getDefaultCanManage(this.formLevel);
    this.showModal.set(true);
  }

  openEditModal(level: AdminLevel): void {
    this.editingLevel.set(level);
    this.formLevel = level.level;
    this.formName = level.name;
    this.formDescription = level.description || '';
    this.formCanManage = level.canManageLevels.join(',');
    this.showModal.set(true);
  }

  openDeleteModal(level: AdminLevel): void {
    this.deletingLevel.set(level);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingLevel.set(null);
  }

  private getNextLevel(): number {
    const maxLevel = Math.max(...this.levels().map(l => l.level), -1);
    return maxLevel + 1;
  }

  private getDefaultCanManage(level: number): string {
    const higher = [];
    for (let i = level + 1; i <= level + 5; i++) {
      higher.push(i);
    }
    return higher.join(',');
  }

  saveLevel(): void {
    if (!this.formName.trim()) {
      return;
    }

    this.saving.set(true);

    const canManageLevels = this.formCanManage
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    const body = {
      level: this.formLevel,
      name: this.formName.trim(),
      description: this.formDescription.trim() || null,
      permissions: [],
      canManageLevels,
    };

    const request = this.editingLevel()
      ? this.http.put(`${environment.apiUrl}/api/config/admin-levels/${this.formLevel}`, body)
      : this.http.post(`${environment.apiUrl}/api/config/admin-levels`, body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error saving level:', err);
        this.saving.set(false);
        alert(err.error?.detail || 'Erro ao salvar nivel');
      },
    });
  }

  deleteLevel(): void {
    const level = this.deletingLevel();
    if (!level) return;

    this.deleting.set(true);

    this.http.delete(`${environment.apiUrl}/api/config/admin-levels/${level.level}`).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deletingLevel.set(null);
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting level:', err);
        this.deleting.set(false);
        alert(err.error?.detail || 'Erro ao remover nivel');
      },
    });
  }
}
