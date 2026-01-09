import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NivelService, LevelUser, LevelConfig } from '../../../core/services/nivel.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-nivel-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <a routerLink="/admin/dashboard" class="hover:text-purple-600">Admin</a>
              <span>/</span>
              <a routerLink="/admin/niveis" class="hover:text-purple-600">Niveis</a>
              <span>/</span>
              <span class="text-gray-900">{{ levelConfig()?.label || 'Nivel ' + level() }}</span>
            </div>
            <div class="flex items-center gap-3">
              <div [class]="'w-10 h-10 rounded-lg flex items-center justify-center ' + (levelConfig()?.bgColor || 'bg-gray-100')">
                <span class="text-xl">{{ levelConfig()?.icon || '🔷' }}</span>
              </div>
              <div>
                <h1 [class]="'text-2xl font-bold ' + (levelConfig()?.color || 'text-gray-900')">
                  {{ levelConfig()?.label || 'Nivel ' + level() }} (Nivel {{ level() }})
                </h1>
                <p class="text-gray-500">{{ levelConfig()?.description || 'Nivel personalizado' }}</p>
              </div>
            </div>
          </div>

          <a
            routerLink="/admin/niveis"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
          >
            &larr; Voltar
          </a>
        </div>

        <!-- Search & Filters -->
        <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                placeholder="Buscar por nome, email ou telefone..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <span>{{ pagination()?.total || 0 }} usuarios encontrados</span>
            </div>
          </div>
        </div>

        @if (nivelService.loading()) {
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="divide-y divide-gray-100">
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <div class="p-4">
                  <app-skeleton variant="text" class="w-full" />
                </div>
              }
            </div>
          </div>
        } @else if (users().length === 0) {
          <div class="bg-white rounded-xl shadow-sm p-12 text-center">
            <div class="text-6xl mb-4">😔</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Nenhum usuario encontrado</h3>
            <p class="text-gray-500">
              @if (searchQuery) {
                Nenhum resultado para "{{ searchQuery }}"
              } @else {
                Nao ha usuarios cadastrados neste nivel
              }
            </p>
          </div>
        } @else {
          <!-- Users List -->
          <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            <div class="divide-y divide-gray-100">
              @for (user of users(); track user.user_id) {
                <a
                  [routerLink]="['/admin/niveis', level(), user.user_id]"
                  class="flex items-center justify-between p-4 hover:bg-gray-50 transition group"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      @if (user.profile_image_url) {
                        <img [src]="user.profile_image_url" alt="" class="w-full h-full object-cover" />
                      } @else {
                        <span class="text-xl text-gray-400">{{ getInitials(user) }}</span>
                      }
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">{{ user.username || 'Sem nome' }}</h3>
                      <p class="text-sm text-gray-500">{{ user.email }}</p>
                      @if (user.phone_number) {
                        <p class="text-xs text-gray-400">{{ user.phone_number }}</p>
                      }
                    </div>
                  </div>

                  <div class="flex items-center gap-4">
                    <div class="text-right hidden md:block">
                      <p class="text-sm text-gray-500">Cadastrado em</p>
                      <p class="text-sm font-medium text-gray-700">{{ formatDate(user.registration_date) }}</p>
                    </div>
                    <span [class]="getStatusClass(user.account_status)">
                      {{ user.account_status }}
                    </span>
                    <span class="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all">
                      &rarr;
                    </span>
                  </div>
                </a>
              }
            </div>
          </div>

          <!-- Pagination -->
          @if (pagination() && pagination()!.pages > 1) {
            <div class="mt-6 flex items-center justify-between">
              <div class="text-sm text-gray-500">
                Pagina {{ pagination()!.page }} de {{ pagination()!.pages }}
              </div>
              <div class="flex gap-2">
                <button
                  (click)="goToPage(pagination()!.page - 1)"
                  [disabled]="pagination()!.page <= 1"
                  class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &larr; Anterior
                </button>
                <button
                  (click)="goToPage(pagination()!.page + 1)"
                  [disabled]="pagination()!.page >= pagination()!.pages"
                  class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proxima &rarr;
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class NivelList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly nivelService = inject(NivelService);

  readonly level = signal(0);
  readonly levelConfig = computed(() => this.nivelService.getLevelConfig(this.level()));
  readonly users = this.nivelService.currentLevelUsers;
  readonly pagination = this.nivelService.currentPagination;

  searchQuery = '';
  private searchTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Carregar configs primeiro
    this.nivelService.loadLevelConfigs().subscribe(() => {
      this.route.params.subscribe(params => {
        const level = parseInt(params['level'], 10);
        if (!isNaN(level) && level >= 0) {
          this.level.set(level);
          this.loadUsers();
        }
      });
    });
  }

  private loadUsers(page = 1): void {
    this.nivelService.getUsersByLevel(
      this.level(),
      page,
      20,
      this.searchQuery || undefined
    ).subscribe();
  }

  onSearch(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadUsers(1);
    }, 300);
  }

  goToPage(page: number): void {
    this.loadUsers(page);
  }

  getInitials(user: LevelUser): string {
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user.email) {
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
      case 'pending':
        return `${baseClass} bg-yellow-100 text-yellow-700`;
      case 'inactive':
        return `${baseClass} bg-gray-100 text-gray-700`;
      default:
        return `${baseClass} bg-gray-100 text-gray-600`;
    }
  }
}
