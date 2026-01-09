import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MentorService, MentorInvite } from '../../../core/services/mentor.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-invite-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-3xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-6">Código de Convite</h1>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{{ error() }}</div>
          }

          @defer {
            <div class="space-y-6">
              <!-- Código -->
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-8 text-center">
                <div class="text-sm font-medium text-blue-700 mb-2">Seu Código de Convite</div>
                <div class="text-5xl font-bold text-blue-600 mb-4 tracking-wider font-mono">
                  {{ invite()!.invite_code }}
                </div>
                <button
                  (click)="copyCode()"
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  {{ copied() ? '✓ Copiado!' : '📋 Copiar Código' }}
                </button>
              </div>

              <!-- Estatísticas -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-sm text-gray-500 mb-1">Total de usos</div>
                  <div class="text-2xl font-bold text-gray-900">{{ invite()!.uses_count }}</div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-sm text-gray-500 mb-1">Status</div>
                  <div [class]="invite()!.is_active ? 'text-green-600' : 'text-red-600'" class="text-2xl font-bold">
                    {{ invite()!.is_active ? 'Ativo' : 'Inativo' }}
                  </div>
                </div>
              </div>

              <!-- Instruções -->
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 class="font-bold text-blue-900 mb-3">📝 Como usar</h3>
                <ol class="space-y-2 text-sm text-blue-800">
                  <li>1. Compartilhe este código com seus futuros mentorados</li>
                  <li>2. Eles devem inserir o código ao se cadastrarem na plataforma</li>
                  <li>3. Após o cadastro, eles aparecerão automaticamente na sua lista de mentorados</li>
                </ol>
              </div>

              <!-- Ações -->
              <div class="flex gap-4">
                <button
                  (click)="regenerate()"
                  [disabled]="regenerating()"
                  class="flex-1 px-6 py-3 border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 transition"
                >
                  {{ regenerating() ? 'Gerando...' : '🔄 Gerar Novo Código' }}
                </button>

                <a
                  routerLink="/mentor/dashboard"
                  class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  ← Voltar
                </a>
              </div>

              @if (regenerating()) {
                <div class="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm">
                  ⚠️ Atenção: Ao gerar um novo código, o código anterior será desativado.
                </div>
              }
            </div>
          } @placeholder {
            <div class="space-y-6">
              <app-skeleton variant="card" class="h-48" />
              <div class="grid grid-cols-2 gap-4">
                <app-skeleton variant="stats" />
                <app-skeleton variant="stats" />
              </div>
              <app-skeleton variant="card" class="h-32" />
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class InviteCode implements OnInit {
  private readonly mentorService = inject(MentorService);

  readonly error = signal<string | null>(null);
  readonly invite = signal<MentorInvite | null>(null);
  readonly copied = signal(false);
  readonly regenerating = signal(false);

  ngOnInit(): void {
    this.loadInvite();
  }

  private loadInvite(): void {
    this.error.set(null);

    this.mentorService.getMyInvite().subscribe({
      next: (invite) => {
        this.invite.set(invite);
      },
      error: () => {
        this.error.set('Erro ao carregar código de convite');
      }
    });
  }

  copyCode(): void {
    const code = this.invite()?.invite_code;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  regenerate(): void {
    if (!confirm('Deseja realmente gerar um novo código? O código atual será desativado.')) {
      return;
    }

    this.regenerating.set(true);
    this.error.set(null);

    this.mentorService.regenerateInvite().subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.regenerating.set(false);
      },
      error: () => {
        this.error.set('Erro ao gerar novo código');
        this.regenerating.set(false);
      }
    });
  }
}
