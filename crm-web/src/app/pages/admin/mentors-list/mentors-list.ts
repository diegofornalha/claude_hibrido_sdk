import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-mentors-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Mentores</h1>
            <div class="flex items-center gap-2">
              <a
                routerLink="/admin/mentors/new"
                class="px-3 py-2 md:px-4 md:py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition text-sm md:text-base"
              >
                + Novo
              </a>
              <a routerLink="/admin/dashboard" class="text-purple-600 hover:underline text-2xl">←</a>
            </div>
          </div>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          }

          @defer {
            @if (mentors().length === 0) {
              <div class="py-16 text-center text-gray-500">
                <div class="text-6xl mb-4">👨‍🏫</div>
                <p>Nenhum mentor cadastrado</p>
              </div>
            }

            @if (mentors().length > 0) {
              <div class="space-y-4">
                @for (mentor of mentors(); track mentor.user_id) {
                  <div class="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 transition">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        @if (mentor.profile_image_url) {
                          <img [src]="mentor.profile_image_url" alt="" class="w-16 h-16 rounded-full object-cover" />
                        } @else {
                          <div class="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-2xl font-bold text-purple-600">
                            {{ mentor.username.charAt(0).toUpperCase() }}
                          </div>
                        }

                        <div>
                          <h3 class="text-xl font-bold text-gray-900">{{ mentor.username }}</h3>
                          <p class="text-gray-600">{{ mentor.email }}</p>
                          <p class="text-sm text-gray-500">ID: {{ mentor.user_id }}</p>
                        </div>
                      </div>

                      <div class="text-right">
                        @if (mentor.total_mentorados !== undefined) {
                          <div class="text-2xl font-bold text-purple-600">{{ mentor.total_mentorados }}</div>
                          <div class="text-sm text-gray-500">mentorado(s)</div>
                        }

                        <button
                          (click)="confirmDelete(mentor)"
                          class="mt-4 px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          } @placeholder {
            <div class="space-y-4">
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
              <app-skeleton variant="card" />
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class MentorsList implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly error = signal<string | null>(null);
  readonly mentors = signal<any[]>([]);

  ngOnInit(): void {
    this.loadMentors();
  }

  private loadMentors(): void {
    this.error.set(null);

    this.adminService.listAllMentors().subscribe({
      next: (data) => {
        this.mentors.set(data);
      },
      error: () => {
        this.error.set('Erro ao carregar mentores');
      }
    });
  }

  confirmDelete(mentor: any): void {
    if (!confirm(`Deseja realmente remover ${mentor.username} como mentor?`)) {
      return;
    }

    this.adminService.deleteMentor(mentor.user_id).subscribe({
      next: () => {
        this.loadMentors(); // Recarregar lista
      },
      error: () => {
        this.error.set('Erro ao remover mentor');
      }
    });
  }
}
