import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-aguardando-aprovacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          <h1 class="text-2xl font-bold text-gray-900 mb-2">Aguardando Aprovacao</h1>
          <p class="text-gray-600 mb-6">
            Seu cadastro esta sendo analisado pela nossa equipe.
            Em breve voce recebera acesso completo ao sistema.
          </p>

          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-amber-800">
              <strong>{{ user()?.username }}</strong><br>
              {{ user()?.email }}
            </p>
          </div>

          <button
            (click)="logout()"
            class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  `
})
export class AguardandoAprovacao {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
