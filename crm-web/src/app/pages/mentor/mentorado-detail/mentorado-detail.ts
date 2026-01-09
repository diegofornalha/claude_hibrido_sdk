import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-mentorado-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-6xl mx-auto">
        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{{ error() }}</div>
            <a routerLink="/mentor/mentorados" class="text-blue-600 hover:underline">← Voltar</a>
          </div>
        }

        @defer {
          <!-- Header -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-4">
                @if (mentorado()!.profile_image_url) {
                  <img [src]="mentorado()!.profile_image_url" alt="" class="w-20 h-20 rounded-full object-cover" />
                } @else {
                  <div class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                    {{ mentorado()!.username?.charAt(0).toUpperCase() }}
                  </div>
                }
                <div>
                  <h1 class="text-3xl font-bold text-gray-900">{{ mentorado()!.username }}</h1>
                  <p class="text-gray-600">{{ mentorado()!.email }}</p>
                  @if (mentorado()!.profession) {
                    <p class="text-sm text-gray-500">{{ mentorado()!.profession }}</p>
                  }
                </div>
              </div>
              <a routerLink="/mentor/mentorados" class="text-blue-600 hover:underline">← Voltar</a>
            </div>

            <!-- Perfil Profissional -->
            @if (mentorado()!.client) {
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                @if (mentorado()!.client.profession) {
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-500 mb-1">Profissão</div>
                    <div class="font-semibold">{{ mentorado()!.client.profession }}</div>
                  </div>
                }
                @if (mentorado()!.client.years_experience) {
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-500 mb-1">Experiência</div>
                    <div class="font-semibold">{{ mentorado()!.client.years_experience }} anos</div>
                  </div>
                }
                @if (mentorado()!.client.current_revenue) {
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-500 mb-1">Faturamento Atual</div>
                    <div class="font-semibold">R$ {{ mentorado()!.client.current_revenue.toLocaleString('pt-BR') }}</div>
                  </div>
                }
                @if (mentorado()!.client.desired_revenue) {
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-sm text-gray-500 mb-1">Meta de Faturamento</div>
                    <div class="font-semibold">R$ {{ mentorado()!.client.desired_revenue.toLocaleString('pt-BR') }}</div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Diagnósticos -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Histórico de Fontes</h2>

            @if (assessments().length === 0) {
              <div class="py-12 text-center text-gray-500">
                Nenhum diagnóstico realizado ainda
              </div>
            }

            @if (assessments().length > 0) {
              <div class="space-y-4">
                @for (assessment of assessments(); track assessment.assessment_id) {
                  <div class="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-semibold text-gray-900 mb-1">
                          Diagnóstico #{{ assessment.assessment_id }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{ formatDate(assessment.started_at) }}
                        </div>
                        @if (assessment.status) {
                          <span [class]="getStatusClass(assessment.status)" class="inline-block mt-2 px-3 py-1 rounded-full text-sm">
                            {{ getStatusLabel(assessment.status) }}
                          </span>
                        }
                      </div>
                      @if (assessment.overall_score !== undefined && assessment.overall_score !== null) {
                        <div class="text-right">
                          <div class="text-3xl font-bold text-blue-600">{{ assessment.overall_score.toFixed(1) }}</div>
                          <div class="text-sm text-gray-500">Score Geral</div>
                        </div>
                      }
                    </div>

                    @if (assessment.status === 'completed' || assessment.status === 'reviewed') {
                      <a
                        [routerLink]="['/diagnosis/result', assessment.assessment_id]"
                        class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                      >
                        Ver Detalhes →
                      </a>
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @placeholder {
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="flex items-center gap-4">
              <app-skeleton variant="avatar" class="w-20 h-20" />
              <div>
                <app-skeleton variant="text" class="w-48 mb-2" />
                <app-skeleton variant="text" class="w-64" />
              </div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-6 mb-6">
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
            <app-skeleton variant="stats" />
          </div>
          <app-skeleton variant="card" class="h-96" />
        }
      </div>
    </div>
  `
})
export class MentoradoDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly error = signal<string | null>(null);
  readonly mentorado = signal<any>(null);
  readonly assessments = signal<any[]>([]);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.error.set('ID não encontrado');
      return;
    }

    this.loadMentoradoDetails(Number(userId));
  }

  private loadMentoradoDetails(userId: number): void {
    this.error.set(null);

    // Buscar dados do mentorado (simplificado - backend precisa implementar)
    this.http.get<any>(`${this.baseUrl}/api/mentor/mentorados/${userId}`).subscribe({
      next: (data) => {
        this.mentorado.set(data.mentorado || data);
        this.assessments.set(data.assessments || []);
      },
      error: () => {
        this.error.set('Erro ao carregar dados do mentorado');
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'in_progress': 'Em Progresso',
      'completed': 'Concluído',
      'reviewed': 'Revisado'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'reviewed': 'bg-blue-100 text-blue-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }
}
