import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NivelService, LevelUserDetailResponse, LevelConfig } from '../../../core/services/nivel.service';
import { AdminService } from '../../../core/services/admin.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

type TabType = 'info' | 'activity' | 'permissions';

@Component({
  selector: 'app-nivel-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <a routerLink="/admin/dashboard" class="hover:text-purple-600">Admin</a>
            <span>/</span>
            <a routerLink="/admin/niveis" class="hover:text-purple-600">Niveis</a>
            <span>/</span>
            <a [routerLink]="['/admin/niveis', level()]" class="hover:text-purple-600">{{ levelConfig()?.label }}</a>
            <span>/</span>
            <span class="text-gray-900">{{ userData()?.user?.username || 'Detalhe' }}</span>
          </div>
        </div>

        <!-- Alerts -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{{ error() }}</span>
            <button (click)="error.set(null)" class="text-red-500 hover:text-red-700">&times;</button>
          </div>
        }

        @if (success()) {
          <div class="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{{ success() }}</span>
            <button (click)="success.set(null)" class="text-green-500 hover:text-green-700">&times;</button>
          </div>
        }

        @if (nivelService.loading()) {
          <app-skeleton variant="card" class="h-96" />
        }

        @if (!nivelService.loading() && userData()) {
          <!-- Profile Card -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="flex items-start gap-6">
              <div [class]="'w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold ' + (levelConfig()?.bgColor || 'bg-gray-100') + ' ' + (levelConfig()?.color || 'text-gray-600')">
                @if (userData()?.user?.profile_image_url) {
                  <img [src]="userData()!.user.profile_image_url" alt="" class="w-full h-full rounded-full object-cover" />
                } @else {
                  {{ getInitials() }}
                }
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h1 class="text-2xl font-bold text-gray-900">{{ userData()!.user.username || 'Sem nome' }}</h1>
                  <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + (levelConfig()?.bgColor || 'bg-gray-100') + ' ' + (levelConfig()?.color || 'text-gray-600')">
                    Nivel {{ level() }} - {{ levelConfig()?.label }}
                  </span>
                </div>
                <p class="text-gray-600">{{ userData()!.user.email }}</p>
                @if (userData()!.user.phone_number) {
                  <p class="text-gray-500 mt-1">{{ userData()!.user.phone_number }}</p>
                }

                <!-- Level Selector -->
                <div class="mt-4 flex items-center gap-4">
                  <label class="text-sm text-gray-600">Alterar nivel:</label>
                  <select
                    [ngModel]="userData()!.user.admin_level"
                    (ngModelChange)="onLevelChange($event)"
                    [disabled]="updatingLevel()"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                  >
                    @for (config of nivelService.levelConfigs(); track config.level) {
                      <option [value]="config.level">{{ config.level }} - {{ config.label }}</option>
                    }
                  </select>
                  @if (updatingLevel()) {
                    <span class="text-sm text-gray-500">Atualizando...</span>
                  }
                </div>

                <!-- Actions -->
                <div class="mt-4 flex gap-2">
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
                <div class="text-lg font-bold text-gray-900">{{ formatDate(userData()!.user.registration_date) }}</div>
                <div class="mt-2">
                  <span [class]="getStatusClass(userData()!.user.account_status)">
                    {{ userData()!.user.account_status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="border-b border-gray-200">
              <nav class="flex">
                <button
                  (click)="activeTab.set('info')"
                  [class]="getTabClass('info')"
                >
                  Informacoes
                </button>
                @if (level() === 5) {
                  <button
                    (click)="activeTab.set('activity')"
                    [class]="getTabClass('activity')"
                  >
                    Timeline CRM
                  </button>
                }
                @if (level() === 4) {
                  <button
                    (click)="activeTab.set('activity')"
                    [class]="getTabClass('activity')"
                  >
                    Atividade
                  </button>
                }
                @if (level() <= 3) {
                  <button
                    (click)="activeTab.set('permissions')"
                    [class]="getTabClass('permissions')"
                  >
                    Permissoes
                  </button>
                }
              </nav>
            </div>

            <div class="p-6">
              @switch (activeTab()) {
                @case ('info') {
                  <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-500">ID do Usuario</div>
                        <div class="font-medium text-gray-900">{{ userData()!.user.user_id }}</div>
                      </div>
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-500">Email</div>
                        <div class="font-medium text-gray-900">{{ userData()!.user.email }}</div>
                      </div>
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-500">Telefone</div>
                        <div class="font-medium text-gray-900">{{ userData()!.user.phone_number || 'Nao informado' }}</div>
                      </div>
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-500">Role</div>
                        <div class="font-medium text-gray-900">{{ userData()!.user.role }}</div>
                      </div>
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-500">Status da Conta</div>
                        <div class="font-medium text-gray-900">{{ userData()!.user.account_status }}</div>
                      </div>
                      <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="text-sm text-gray-500">Verificacao</div>
                        <div class="font-medium text-gray-900">{{ userData()!.user.verification_status === 1 ? 'Verificado' : 'Pendente' }}</div>
                      </div>
                    </div>

                    <!-- CRM Data for Leads -->
                    @if (level() === 5 && userData()!.extra?.crm) {
                      <div class="mt-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Dados do CRM</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div class="p-4 bg-amber-50 rounded-lg">
                            <div class="text-sm text-amber-600">Estado no Funil</div>
                            <div class="font-medium text-amber-800">{{ userData()!.extra!.crm!.state || 'Novo' }}</div>
                          </div>
                          @if (userData()!.extra!.crm!.profession) {
                            <div class="p-4 bg-amber-50 rounded-lg">
                              <div class="text-sm text-amber-600">Profissao</div>
                              <div class="font-medium text-amber-800">{{ userData()!.extra!.crm!.profession }}</div>
                            </div>
                          }
                          @if (userData()!.extra!.crm!.source) {
                            <div class="p-4 bg-amber-50 rounded-lg">
                              <div class="text-sm text-amber-600">Origem</div>
                              <div class="font-medium text-amber-800">{{ userData()!.extra!.crm!.source }}</div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }

                @case ('activity') {
                  @if (level() === 5) {
                    <!-- Lead Timeline -->
                    <div class="space-y-4">
                      <h3 class="text-lg font-semibold text-gray-900">Timeline de Eventos</h3>
                      @if (userData()!.extra?.events && userData()!.extra!.events!.length > 0) {
                        <div class="space-y-3">
                          @for (event of userData()!.extra!.events; track event.created_at) {
                            <div class="flex gap-4 p-4 bg-gray-50 rounded-lg">
                              <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              </div>
                              <div class="flex-1">
                                <div class="font-medium text-gray-900">{{ event.event_type }}</div>
                                <div class="text-sm text-gray-500">{{ formatDate(event.created_at) }}</div>
                              </div>
                            </div>
                          }
                        </div>
                      } @else {
                        <p class="text-gray-500 text-center py-8">Nenhum evento registrado</p>
                      }
                    </div>
                  }

                  @if (level() === 4) {
                    <!-- Mentorado Activity -->
                    <div class="space-y-6">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="p-4 bg-emerald-50 rounded-lg">
                          <div class="text-sm text-emerald-600">Total de Chats</div>
                          <div class="text-2xl font-bold text-emerald-800">{{ userData()!.extra?.chat_count || 0 }}</div>
                        </div>
                        <div class="p-4 bg-emerald-50 rounded-lg">
                          <div class="text-sm text-emerald-600">CRMs</div>
                          <div class="text-2xl font-bold text-emerald-800">{{ userData()!.extra?.CRM_count || 0 }}</div>
                        </div>
                      </div>

                      @if (userData()!.extra?.recent_sessions && userData()!.extra!.recent_sessions!.length > 0) {
                        <div>
                          <h4 class="text-md font-semibold text-gray-900 mb-3">Sessoes Recentes</h4>
                          <div class="space-y-2">
                            @for (session of userData()!.extra!.recent_sessions; track session.session_id) {
                              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div class="font-medium text-gray-900">{{ session.session_type }}</div>
                                  <div class="text-sm text-gray-500">{{ formatDate(session.updated_at) }}</div>
                                </div>
                                <span [class]="session.status === 'active' ? 'px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full' : 'px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full'">
                                  {{ session.status }}
                                </span>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                }

                @case ('permissions') {
                  @if (level() <= 3 && userData()!.extra?.permissions) {
                    <div class="space-y-4">
                      <h3 class="text-lg font-semibold text-gray-900">Permissoes do Usuario</h3>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        @for (perm of getPermissionsList(); track perm.key) {
                          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <span class="text-gray-700">{{ perm.label }}</span>
                            @if (perm.value) {
                              <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Sim</span>
                            } @else {
                              <span class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Nao</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                }
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class NivelDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly nivelService = inject(NivelService);
  private readonly adminService = inject(AdminService);

  readonly level = signal(0);
  readonly userId = signal(0);
  readonly userData = signal<LevelUserDetailResponse | null>(null);
  readonly levelConfig = computed(() => this.nivelService.getLevelConfig(this.level()));

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly resettingPassword = signal(false);
  readonly updatingLevel = signal(false);
  readonly activeTab = signal<TabType>('info');

  ngOnInit(): void {
    // Carregar configs primeiro para popular o dropdown
    this.nivelService.loadLevelConfigs().subscribe(() => {
      this.route.params.subscribe(params => {
        const level = parseInt(params['level'], 10);
        const id = parseInt(params['id'], 10);

        if (!isNaN(level) && !isNaN(id)) {
          this.level.set(level);
          this.userId.set(id);
          this.loadUserData();
        }
      });
    });
  }

  private loadUserData(): void {
    this.nivelService.getUserDetail(this.level(), this.userId()).subscribe({
      next: (data) => this.userData.set(data),
      error: (err) => {
        console.error('Erro ao carregar usuario:', err);
        this.error.set('Erro ao carregar dados do usuario');
      }
    });
  }

  getInitials(): string {
    const user = this.userData()?.user;
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return '??';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  }

  getStatusClass(status: string): string {
    const baseClass = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status?.toLowerCase()) {
      case 'active':
      case 'mentorado':
        return `${baseClass} bg-emerald-100 text-emerald-700`;
      case 'admin':
        return `${baseClass} bg-purple-100 text-purple-700`;
      case 'mentor':
        return `${baseClass} bg-blue-100 text-blue-700`;
      case 'lead':
        return `${baseClass} bg-amber-100 text-amber-700`;
      default:
        return `${baseClass} bg-gray-100 text-gray-600`;
    }
  }

  getTabClass(tab: TabType): string {
    const base = 'px-6 py-4 text-sm font-medium transition-colors';
    return this.activeTab() === tab
      ? `${base} text-purple-600 border-b-2 border-purple-600`
      : `${base} text-gray-500 hover:text-gray-700`;
  }

  getPermissionsList(): { key: string; label: string; value: boolean }[] {
    const perms = this.userData()?.extra?.permissions;
    if (!perms) return [];

    return [
      { key: 'can_manage_users', label: 'Gerenciar Usuarios', value: perms.can_manage_users },
      { key: 'can_view_all_data', label: 'Ver Todos os Dados', value: perms.can_view_all_data },
      { key: 'can_manage_mentors', label: 'Gerenciar Mentores', value: perms.can_manage_mentors },
      { key: 'can_view_mentorados', label: 'Ver Mentorados', value: perms.can_view_mentorados },
      { key: 'can_chat', label: 'Usar Chat', value: perms.can_chat }
    ];
  }

  resetPassword(): void {
    const user = this.userData()?.user;
    if (!user) return;

    this.resettingPassword.set(true);
    this.error.set(null);
    this.success.set(null);

    this.adminService.resetUserPassword(user.user_id).subscribe({
      next: (response) => {
        this.resettingPassword.set(false);
        if (response.success) {
          this.success.set(`Senha resetada com sucesso! Nova senha: ${response.temp_password}`);
        } else {
          this.error.set(response.message || 'Erro ao resetar senha');
        }
      },
      error: (err) => {
        this.resettingPassword.set(false);
        this.error.set('Erro ao resetar senha');
        console.error('Erro ao resetar senha:', err);
      }
    });
  }

  onLevelChange(newLevel: number): void {
    const user = this.userData()?.user;
    if (!user) return;

    const newLevelNum = Number(newLevel);
    if (newLevelNum === user.admin_level) return;

    this.updatingLevel.set(true);
    this.error.set(null);
    this.success.set(null);

    this.nivelService.updateUserLevel(user.user_id, newLevelNum).subscribe({
      next: (response) => {
        this.updatingLevel.set(false);
        if (response.success) {
          this.success.set(response.message);
          // Redirecionar para a nova lista de nivel
          this.router.navigate(['/admin/niveis', newLevelNum, user.user_id]);
        } else {
          this.error.set(response.message || 'Erro ao atualizar nivel');
        }
      },
      error: (err) => {
        this.updatingLevel.set(false);
        this.error.set('Erro ao atualizar nivel');
        console.error('Erro ao atualizar nivel:', err);
      }
    });
  }
}
