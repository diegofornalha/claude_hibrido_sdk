import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-emerald-600 mb-2">CRM</h1>
            <p class="text-gray-500">Sistema de Diagnostico </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="email"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="********"
              />
            </div>

            @if (error()) {
              <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {{ error() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="form.invalid || authService.isLoading()"
              class="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              @if (authService.isLoading()) {
                <span>Entrando...</span>
              } @else {
                <span>Entrar</span>
              }
            </button>
          </form>

          <p class="mt-6 text-center text-gray-500">
            Não tem conta?
            <a routerLink="/register" class="text-emerald-600 font-semibold hover:underline">
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class Login {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        if (response.success) {
          // Redirecionar baseado no role do usuário
          const role = this.authService.userRole();
          this.redirectByRole(role);
        } else {
          this.error.set(response.error || 'Erro ao fazer login');
        }
      },
      error: (err) => {
        const errorMsg = this.extractErrorMessage(err);
        this.error.set(errorMsg);
      }
    });
  }

  private redirectByRole(role: string | null): void {
    console.log('[Login] Redirecionando por role:', role);
    switch (role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'mentor':
        this.router.navigate(['/mentor/dashboard']);
        break;
      case 'mentorado':
        this.router.navigate(['/dashboard']);
        break;
      case 'lead':
        this.router.navigate(['/aguardando-aprovacao']);
        break;
      default:
        console.warn('[Login] Role desconhecido:', role);
        this.router.navigate(['/dashboard']);
    }
  }

  private extractErrorMessage(err: unknown): string {
    const error = (err as { error?: unknown }).error;

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      if (typeof errorObj['detail'] === 'string') return errorObj['detail'];
      if (typeof errorObj['message'] === 'string') return errorObj['message'];
      if (typeof errorObj['error'] === 'string') return errorObj['error'];
    }

    return 'Erro ao fazer login. Verifique suas credenciais.';
  }
}
