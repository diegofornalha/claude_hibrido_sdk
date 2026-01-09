import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DiagnosisService, AssessmentResult } from '../../../core/services/diagnosis.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-diagnosis-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Error State -->
        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              {{ error() }}
            </div>
            <a
              routerLink="/dashboard"
              class="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Voltar ao Dashboard
            </a>
          </div>
        }

        <!-- Result -->
        @defer (when result() && !loading() && !error()) {
          <!-- Header with Overall Score -->
          <div class="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
            <h1 class="text-4xl font-bold mb-4">Diagnóstico Inteligente</h1>
            <div class="flex items-center gap-6">
              <div>
                <div class="text-7xl font-bold">{{ formatScore(result()!.summary.overall_score) }}</div>
                <div class="text-emerald-100 text-sm">de 10.0</div>
              </div>
              <div class="flex-1">
                <div class="text-2xl font-semibold mb-2">{{ result()!.summary.profile_type }}</div>
                <div class="text-emerald-100">
                  Avaliação realizada em {{ formatDate(result()!.summary.started_at || result()!.summary.completed_at || '') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Area Scores Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            @for (areaScore of result()!.area_scores; track areaScore.area_id) {
              <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-gray-900">{{ areaScore.area_name }}</h3>
                  <div
                    class="text-2xl font-bold"
                    [class.text-green-600]="areaScore.score >= 7"
                    [class.text-yellow-600]="areaScore.score >= 5 && areaScore.score < 7"
                    [class.text-red-600]="areaScore.score < 5"
                  >
                    {{ areaScore.score.toFixed(1) }}
                  </div>
                </div>

                @if (areaScore.strengths) {
                  <div class="mb-3">
                    <div class="text-xs font-semibold text-green-700 mb-1">✓ Pontos Fortes:</div>
                    <p class="text-sm text-gray-700">{{ areaScore.strengths }}</p>
                  </div>
                }

                @if (areaScore.improvements) {
                  <div class="mb-3">
                    <div class="text-xs font-semibold text-yellow-700 mb-1">⚠ Melhorias:</div>
                    <p class="text-sm text-gray-700">{{ areaScore.improvements }}</p>
                  </div>
                }

                @if (areaScore.recommendations) {
                  <div>
                    <div class="text-xs font-semibold text-blue-700 mb-1">→ Recomendações:</div>
                    <p class="text-sm text-gray-700">{{ areaScore.recommendations }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Main Insights -->
          @if (result()!.summary.main_insights) {
            <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-4">💡 Principais Insights</h2>
              <div class="prose max-w-none text-gray-700">
                <p class="whitespace-pre-wrap">{{ result()!.summary.main_insights }}</p>
              </div>
            </div>
          }

          <!-- Action Plan -->
          @if (result()!.summary.action_plan) {
            <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-4">🎯 Plano de Ação</h2>
              <div class="prose max-w-none text-gray-700">
                <p class="whitespace-pre-wrap">{{ result()!.summary.action_plan }}</p>
              </div>
            </div>
          }

          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            @if (result()!.summary.strongest_area) {
              <div class="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                <div class="text-green-700 font-semibold mb-2">🏆 Área Mais Forte</div>
                <div class="text-2xl font-bold text-green-900">{{ result()!.summary.strongest_area }}</div>
              </div>
            }

            @if (result()!.summary.weakest_area) {
              <div class="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                <div class="text-red-700 font-semibold mb-2">🎯 Área de Foco</div>
                <div class="text-2xl font-bold text-red-900">{{ result()!.summary.weakest_area }}</div>
              </div>
            }
          </div>

          <!-- Actions -->
          <div class="bg-white rounded-2xl shadow-lg p-4 md:p-8">
            <div class="flex justify-center gap-3 md:gap-4">
              <a
                routerLink="/chat"
                class="p-3 md:p-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-2xl md:text-3xl"
                title="Conversar com Nanda"
              >
                💬
              </a>
              <a
                routerLink="/diagnosis/history"
                class="p-3 md:p-4 border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition text-2xl md:text-3xl"
                title="Histórico de Fontes"
              >
                📊
              </a>
              <a
                routerLink="/dashboard"
                class="p-3 md:p-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-2xl md:text-3xl"
                title="Voltar ao Dashboard"
              >
                ←
              </a>
            </div>
          </div>
        } @placeholder {
          <app-skeleton variant="diagnosis-card" [count]="1" />
        } @loading (minimum 300ms) {
          <app-skeleton variant="diagnosis-card" [count]="1" />
        }
      </div>
    </div>
  `
})
export class DiagnosisResult implements OnInit {
  private readonly diagnosisService = inject(DiagnosisService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly result = signal<AssessmentResult | null>(null);

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.paramMap.get('id');

    if (!assessmentId) {
      this.error.set('ID de avaliação não encontrado');
      this.loading.set(false);
      return;
    }

    this.loadResult(Number(assessmentId));
  }

  private loadResult(assessmentId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.diagnosisService.getAssessmentResult(assessmentId).subscribe({
      next: (result) => {
        // Converter scores de string para number
        if (result.area_scores) {
          result.area_scores = result.area_scores.map(area => ({
            ...area,
            score: parseFloat(String(area.score)) || 0
          }));
        }
        if (result.summary) {
          result.summary.overall_score = parseFloat(String(result.summary.overall_score)) || 0;
        }
        this.result.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Erro ao carregar resultado. Tente novamente.');
        this.loading.set(false);
      }
    });
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

  formatScore(score: number | string): string {
    return (parseFloat(String(score)) / 10).toFixed(1);
  }
}
