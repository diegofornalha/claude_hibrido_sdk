import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-emerald-600 mb-2">CRM</h1>
            <p class="text-gray-500">Crie sua conta</p>
          </div>

          @if (!showOtp()) {
            <form [formGroup]="registerForm" (ngSubmit)="onRegister()" class="space-y-5">
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
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
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              @if (error()) {
                <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {{ error() }}
                </div>
              }

              <button
                type="submit"
                [disabled]="registerForm.invalid || authService.isLoading()"
                class="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                @if (authService.isLoading()) {
                  <span>Cadastrando...</span>
                } @else {
                  <span>Cadastrar</span>
                }
              </button>
            </form>
          } @else {
            <form [formGroup]="otpForm" (ngSubmit)="onVerifyOtp()" class="space-y-5">
              <div class="text-center mb-4">
                <p class="text-gray-600">
                  Enviamos um código para <strong>{{ registerForm.get('email')?.value }}</strong>
                </p>
              </div>

              <div>
                <label for="otp" class="block text-sm font-medium text-gray-700 mb-1">
                  Código de verificação
                </label>
                <input
                  id="otp"
                  type="text"
                  formControlName="otp"
                  class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxlength="6"
                />
              </div>

              @if (error()) {
                <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {{ error() }}
                </div>
              }

              <button
                type="submit"
                [disabled]="otpForm.invalid || authService.isLoading()"
                class="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                @if (authService.isLoading()) {
                  <span>Verificando...</span>
                } @else {
                  <span>Verificar</span>
                }
              </button>

              <button
                type="button"
                (click)="showOtp.set(false)"
                class="w-full text-gray-500 py-2 hover:text-gray-700 transition"
              >
                Voltar
              </button>
            </form>
          }

          <p class="mt-6 text-center text-gray-500">
            Já tem conta?
            <a routerLink="/login" class="text-emerald-600 font-semibold hover:underline">
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class Register {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal<string | null>(null);
  readonly showOtp = signal(false);

  readonly registerForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly otpForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  onRegister(): void {
    if (this.registerForm.invalid) return;

    this.error.set(null);
    const data = this.registerForm.getRawValue();

    this.authService.register(data).subscribe({
      next: (response) => {
        if (response.success) {
          // Redirecionar baseado no role após registro
          const role = this.authService.userRole();
          this.redirectByRole(role);
        } else {
          this.error.set(response.error || 'Erro ao cadastrar');
        }
      },
      error: (err) => {
        this.error.set(this.extractErrorMessage(err, 'Erro ao cadastrar'));
      }
    });
  }

  private redirectByRole(role: string | null): void {
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
      default:
        this.router.navigate(['/dashboard']);
    }
  }

  onVerifyOtp(): void {
    if (this.otpForm.invalid) return;

    this.error.set(null);
    const email = this.registerForm.get('email')?.value || '';
    const otp = this.otpForm.get('otp')?.value || '';

    this.authService.verifyRegistration({ email, otp }).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.error.set(response.error || 'Código inválido');
        }
      },
      error: (err) => {
        this.error.set(this.extractErrorMessage(err, 'Código inválido'));
      }
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
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

    return fallback;
  }
}
