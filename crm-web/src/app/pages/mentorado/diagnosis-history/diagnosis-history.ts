import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DiagnosisService, Assessment } from '../../../core/services/diagnosis.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-diagnosis-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-4 md:p-8 mb-6">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Histórico de Diagnósticos</h1>
            <a
              routerLink="/diagnosis/new"
              class="px-3 py-2 md:px-6 md:py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition text-sm md:text-base"
            >
              + Novo
            </a>
          </div>

          <!-- Error State -->
          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">
              {{ error() }}
            </div>
          }

          @defer (when !loading() && !error()) {
            <!-- Empty State -->
            @if (assessments().length === 0) {
              <div class="py-16 text-center">
                <div class="text-6xl mb-4">📊</div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Nenhum diagnóstico realizado</h2>
                <p class="text-gray-600 mb-6">Faça seu primeiro diagnóstico para começar</p>
                <a
                  routerLink="/diagnosis/new"
                  class="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                  Fazer Diagnóstico
                </a>
              </div>
            }

            <!-- Assessments List -->
            @if (assessments().length > 0) {
            <div class="space-y-4">
              @for (assessment of assessments(); track assessment.assessment_id) {
                <div
                  class="border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:border-emerald-500 hover:shadow-md transition cursor-pointer"
                  (click)="viewResult(assessment.assessment_id)"
                >
                  <div class="flex items-center justify-between gap-2 md:gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-4 mb-2">
                        <div
                          class="px-3 py-1 rounded-full text-sm font-semibold"
                          [class.bg-yellow-100]="assessment.status === 'in_progress'"
                          [class.text-yellow-800]="assessment.status === 'in_progress'"
                          [class.bg-green-100]="assessment.status === 'completed'"
                          [class.text-green-800]="assessment.status === 'completed'"
                          [class.bg-blue-100]="assessment.status === 'reviewed'"
                          [class.text-blue-800]="assessment.status === 'reviewed'"
                        >
                          {{ getStatusLabel(assessment.status) }}
                        </div>
                        <div class="text-sm text-gray-500">
                          ID: #{{ assessment.assessment_id }}
                        </div>
                      </div>

                      <div class="text-gray-700">
                        <span class="font-medium">Iniciado em:</span>
                        {{ formatDate(assessment.started_at) }}
                      </div>

                      @if (assessment.completed_at) {
                        <div class="text-gray-700">
                          <span class="font-medium">Concluído em:</span>
                          {{ formatDate(assessment.completed_at) }}
                        </div>
                      }

                      @if (assessment.session_id) {
                        <div class="text-sm text-gray-500 mt-1">
                          Sessão: {{ assessment.session_id.substring(0, 8) }}...
                        </div>
                      }
                    </div>

                    <div class="flex-shrink-0">
                      @if (assessment.status === 'completed' || assessment.status === 'reviewed') {
                        <button
                          class="p-2 md:p-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-xl md:text-2xl"
                          title="Ver resultado"
                        >
                          →
                        </button>
                      } @else if (assessment.status === 'in_progress') {
                        <button
                          class="p-2 md:p-3 border-2 border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50 transition text-xl md:text-2xl"
                          title="Continuar diagnóstico"
                        >
                          →
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
            }
          } @placeholder {
            <app-skeleton variant="chat-list" [count]="5" />
          } @loading (minimum 300ms) {
            <app-skeleton variant="chat-list" [count]="5" />
          }
        </div>

        <div class="text-center">
          <a
            routerLink="/dashboard"
            class="inline-block p-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-2xl"
            title="Voltar ao Dashboard"
          >
            ←
          </a>
        </div>
      </div>
    </div>
  `
})
export class DiagnosisHistory implements OnInit {
  private readonly diagnosisService = inject(DiagnosisService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly assessments = signal<Assessment[]>([]);

  ngOnInit(): void {
    this.loadAssessments();
  }

  private loadAssessments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.diagnosisService.listMyAssessments().subscribe({
      next: (assessments) => {
        // Ordenar por data (mais recentes primeiro)
        const sorted = assessments.sort((a, b) => {
          return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
        });
        this.assessments.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Erro ao carregar histórico. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  viewResult(assessmentId: number): void {
    this.router.navigate(['/diagnosis/result', assessmentId]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'in_progress': 'Em Progresso',
      'completed': 'Concluído',
      'reviewed': 'Revisado'
    };
    return labels[status] || status;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
