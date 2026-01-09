import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MentorService } from '../../../core/services/mentor.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-mentorados-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">Meus Mentorados</h1>
              <p class="text-gray-600">Acompanhe o progresso de cada aluno</p>
            </div>
            <a routerLink="/mentor/dashboard" class="text-blue-600 hover:underline">← Dashboard</a>
          </div>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">{{ error() }}</div>
          }

          @defer {
            @if (mentorados().length === 0) {
            <div class="py-16 text-center">
              <div class="text-6xl mb-4">👥</div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Nenhum mentorado ainda</h2>
              <p class="text-gray-600 mb-6">Compartilhe seu código de convite para adicionar mentorados</p>
              <a
                routerLink="/mentor/invite"
                class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Ver Código de Convite
              </a>
            </div>
            } @else {
            <div class="space-y-4">
              @for (mentorado of mentorados(); track mentorado.user_id) {
                <div
                  class="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition cursor-pointer"
                  (click)="viewDetails(mentorado.user_id)"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      @if (mentorado.profile_image_url) {
                        <img [src]="mentorado.profile_image_url" alt="" class="w-16 h-16 rounded-full object-cover" />
                      } @else {
                        <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                          {{ mentorado.username.charAt(0).toUpperCase() }}
                        </div>
                      }

                      <div>
                        <h3 class="text-xl font-bold text-gray-900">{{ mentorado.username }}</h3>
                        <p class="text-gray-600">{{ mentorado.email }}</p>
                        @if (mentorado.profession) {
                          <p class="text-sm text-gray-500">{{ mentorado.profession }}</p>
                        }
                      </div>
                    </div>

                    <div class="text-right">
                      @if (mentorado.total_assessments) {
                        <div class="text-sm text-gray-500 mb-1">{{ mentorado.total_assessments }} diagnóstico(s)</div>
                      }
                      @if (mentorado.latest_score !== undefined && mentorado.latest_score !== null) {
                        <div class="text-2xl font-bold text-blue-600">{{ mentorado.latest_score.toFixed(1) }}</div>
                        <div class="text-xs text-gray-500">Último score</div>
                      }
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
export class MentoradosList implements OnInit {
  private readonly mentorService = inject(MentorService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly mentorados = signal<any[]>([]);

  ngOnInit(): void {
    this.loadMentorados();
  }

  private loadMentorados(): void {
    this.error.set(null);

    this.mentorService.listMyMentorados().subscribe({
      next: (data) => {
        this.mentorados.set(data);
      },
      error: () => {
        this.error.set('Erro ao carregar mentorados');
      }
    });
  }

  viewDetails(userId: number): void {
    this.router.navigate(['/mentor/mentorados', userId]);
  }
}
