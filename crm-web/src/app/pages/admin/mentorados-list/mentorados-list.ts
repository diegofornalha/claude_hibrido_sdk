import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { forkJoin } from 'rxjs';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-admin-mentorados-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Mentorados</h1>
            <a routerLink="/admin/dashboard" class="text-purple-600 hover:underline text-2xl">←</a>
          </div>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{{ error() }}</div>
          }

          @if (success()) {
            <div class="bg-green-50 text-green-600 p-4 rounded-lg mb-4">{{ success() }}</div>
          }

          @if (adminService.loadingMentorados() && !adminService.hasMentoradosData()) {
            <div class="space-y-4">
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
            </div>
          }

          @if (adminService.hasMentoradosData()) {
            <!-- Campo de Pesquisa -->
            <div class="mb-6">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="onSearchChange()"
                  placeholder="🔍 Pesquise pelo nome..."
                  class="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
                />
                <svg class="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                @if (searchTerm()) {
                  <button
                    (click)="clearSearch()"
                    class="absolute right-3 top-3 px-2 py-1 text-gray-400 hover:text-gray-600 transition"
                  >
                    ✕
                  </button>
                }
              </div>
              @if (searchTerm()) {
                <p class="text-sm text-gray-500 mt-2">
                  {{ filteredMentorados().length }} resultado(s) encontrado(s)
                </p>
              }
            </div>

            @if (filteredMentorados().length === 0) {
              <div class="py-16 text-center text-gray-500">
                <div class="text-6xl mb-4">🔍</div>
                <p class="text-xl font-semibold text-gray-700 mb-2">Pesquise Pelo Nome!</p>
                <p class="text-sm">Digite o nome do mentorado no campo acima</p>
              </div>
            }

            @if (filteredMentorados().length > 0) {
              <div class="space-y-4">
                @for (mentorado of filteredMentorados(); track mentorado.mentorado_id) {
                  <div class="border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:border-purple-500 transition">
                    <div class="flex items-center justify-between gap-2 md:gap-4">
                      <a [routerLink]="['/admin/niveis/4', mentorado.mentorado_id]" class="flex items-center gap-2 md:gap-4 hover:opacity-80 transition cursor-pointer flex-1 min-w-0">
                        <div>
                          <h3 class="text-xl font-bold text-purple-600 hover:underline">{{ mentorado.mentorado_nome }}</h3>
                          <p class="text-gray-600">{{ mentorado.mentorado_email }}</p>
                          @if (mentorado.profession && mentorado.profession !== 'Não informado') {
                            <p class="text-sm text-gray-500">{{ mentorado.profession }} - {{ mentorado.specialty }}</p>
                          }
                          @if (mentorado.mentor_nome) {
                            <p class="text-sm text-blue-600">Mentor: {{ mentorado.mentor_nome }}</p>
                          }
                        </div>
                      </a>

                      @if (mentorado.current_revenue) {
                        <div class="text-right mr-2 hidden md:block">
                          <div class="text-sm text-gray-500">Receita: R$ {{ mentorado.current_revenue }}</div>
                          <div class="text-sm text-emerald-600">Meta: R$ {{ mentorado.desired_revenue }}</div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          }
        </div>
      </div>
    </div>
  `
})
export class AdminMentoradosList implements OnInit {
  readonly adminService = inject(AdminService);

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  searchTerm = signal<string>('');

  readonly filteredMentorados = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.adminService.mentorados();
    }
    return this.adminService.mentorados().filter(m =>
      m.mentorado_nome?.toLowerCase().includes(term) ||
      m.mentorado_email?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  onSearchChange(): void {
    // Trigger change detection
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  private loadData(): void {
    this.error.set(null);

    forkJoin({
      mentorados: this.adminService.listAllMentorados(),
      mentors: this.adminService.listAllMentors()
    }).subscribe({
      next: () => {
        // Dados carregados com sucesso no service
      },
      error: () => {
        this.error.set('Erro ao carregar dados');
      }
    });
  }

  onMentorChange(mentoradoId: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const mentorId = parseInt(select.value, 10);

    if (!mentorId) return;

    this.success.set(null);
    this.error.set(null);

    this.adminService.assignMentor(mentoradoId, mentorId).subscribe({
      next: () => {
        this.success.set('Mentor atribuído com sucesso!');
        this.loadData();
        setTimeout(() => this.success.set(null), 3000);
      },
      error: () => {
        this.error.set('Erro ao atribuir mentor');
      }
    });
  }

  // Função de deleção removida - admin pode deletar direto no DB se necessário
}
