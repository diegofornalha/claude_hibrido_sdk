import { Component, inject, signal, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiagnosisService, DiagnosisArea, DiagnosisQuestion, AssessmentAnswer } from '../../../core/services/diagnosis.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-diagnosis-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Diagnóstico Inteligente</h1>
          <p class="text-gray-600 mb-4">
            Responda às perguntas abaixo para receber seu diagnóstico personalizado
          </p>

          <!-- Progress Bar -->
          <div class="mt-6">
            <div class="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso</span>
              <span>{{ answeredCount() }}/{{ totalQuestions() }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div
                class="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                [style.width.%]="progressPercentage()"
              ></div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg">
              {{ error() }}
            </div>
          </div>
        }

        <!-- Questions by Area -->
        @defer (when !loading() && !error()) {
          @for (area of areas(); track area.area_id) {
            <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <!-- Area Header -->
              <div class="mb-6 pb-6 border-b border-gray-200">
                <div class="flex items-center gap-3 mb-2">
                  @if (area.icon) {
                    <span class="text-2xl">{{ area.icon }}</span>
                  }
                  <h2 class="text-2xl font-bold text-gray-900">{{ area.area_name }}</h2>
                </div>
                @if (area.description) {
                  <p class="text-gray-600">{{ area.description }}</p>
                }
              </div>

              <!-- Questions for this Area -->
              @for (question of getQuestionsForArea(area.area_id); track question.question_id) {
                <div class="mb-8 last:mb-0">
                  <label class="block text-gray-700 font-medium mb-3">
                    {{ question.question_order }}. {{ question.question_text }}
                  </label>

                  @if (question.help_text) {
                    <p class="text-sm text-gray-500 mb-3">{{ question.help_text }}</p>
                  }

                  <!-- Score Slider -->
                  <div class="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      [value]="getAnswer(question.question_id)"
                      (input)="setAnswer(question.question_id, $any($event.target).value)"
                      class="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div class="flex justify-between text-xs text-gray-500">
                      <span>0 - Muito baixo</span>
                      <span class="font-bold text-lg text-emerald-600">
                        {{ getAnswer(question.question_id) }}
                      </span>
                      <span>10 - Muito alto</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Submit Button -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            @if (submitError()) {
              <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                {{ submitError() }}
              </div>
            }

            <button
              (click)="onSubmit()"
              [disabled]="!isComplete() || submitting()"
              class="w-full bg-emerald-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              @if (submitting()) {
                <span>Processando diagnóstico...</span>
              } @else if (!isComplete()) {
                <span>Responda todas as perguntas para continuar ({{ answeredCount() }}/{{ totalQuestions() }})</span>
              } @else {
                <span>Finalizar e Ver Diagnóstico</span>
              }
            </button>
          </div>
        } @placeholder {
          <app-skeleton variant="form" [count]="5" />
        } @loading (minimum 300ms) {
          <app-skeleton variant="form" [count]="5" />
        }
      </div>
    </div>
  `,
  styles: [`
    .slider::-webkit-slider-thumb {
      appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #059669;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .slider::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #059669;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `]
})
export class DiagnosisForm implements OnInit {
  private readonly diagnosisService = inject(DiagnosisService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly areas = signal<DiagnosisArea[]>([]);
  readonly questions = signal<DiagnosisQuestion[]>([]);
  readonly answers = signal<Map<number, number>>(new Map());

  private assessmentId: number | null = null;

  readonly totalQuestions = computed(() => this.questions().length);
  readonly answeredCount = computed(() => this.answers().size);
  readonly progressPercentage = computed(() => {
    const total = this.totalQuestions();
    return total > 0 ? (this.answeredCount() / total) * 100 : 0;
  });
  readonly isComplete = computed(() => this.answeredCount() === this.totalQuestions());

  ngOnInit(): void {
    this.loadQuestions();
  }

  private loadQuestions(): void {
    this.loading.set(true);
    this.error.set(null);

    // Criar nova avaliação
    this.diagnosisService.createAssessment().subscribe({
      next: (assessment) => {
        this.assessmentId = assessment.assessment_id;

        // Carregar perguntas
        this.diagnosisService.getQuestions().subscribe({
          next: (data) => {
            this.areas.set(data.areas.sort((a, b) => a.area_order - b.area_order));
            this.questions.set(
              data.questions.sort((a, b) => {
                if (a.area_id === b.area_id) {
                  return a.question_order - b.question_order;
                }
                return a.area_id - b.area_id;
              })
            );

            // Inicializar respostas com 5.0 (valor médio)
            const initialAnswers = new Map<number, number>();
            data.questions.forEach(q => initialAnswers.set(q.question_id, 5.0));
            this.answers.set(initialAnswers);

            this.loading.set(false);
          },
          error: (err) => {
            this.error.set('Erro ao carregar perguntas. Tente novamente.');
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        this.error.set('Erro ao criar avaliação. Tente novamente.');
        this.loading.set(false);
      }
    });
  }

  getQuestionsForArea(areaId: number): DiagnosisQuestion[] {
    return this.questions().filter(q => q.area_id === areaId);
  }

  getAnswer(questionId: number): number {
    return this.answers().get(questionId) || 5.0;
  }

  setAnswer(questionId: number, value: string): void {
    const numValue = parseFloat(value);
    const newAnswers = new Map(this.answers());
    newAnswers.set(questionId, numValue);
    this.answers.set(newAnswers);
  }

  onSubmit(): void {
    if (!this.isComplete() || !this.assessmentId) return;

    this.submitting.set(true);
    this.submitError.set(null);

    // Converter respostas para formato da API
    const answersArray: AssessmentAnswer[] = [];
    this.answers().forEach((score, question_id) => {
      answersArray.push({ question_id, score });
    });

    // Salvar respostas
    this.diagnosisService.saveAnswers(this.assessmentId, answersArray).subscribe({
      next: () => {
        // Finalizar avaliação
        this.diagnosisService.completeAssessment(this.assessmentId!).subscribe({
          next: () => {
            this.submitting.set(false);
            // Redirecionar para resultado
            this.router.navigate(['/diagnosis/result', this.assessmentId]);
          },
          error: (err) => {
            this.submitError.set('Erro ao processar diagnóstico. Tente novamente.');
            this.submitting.set(false);
          }
        });
      },
      error: (err) => {
        this.submitError.set('Erro ao salvar respostas. Tente novamente.');
        this.submitting.set(false);
      }
    });
  }
}
