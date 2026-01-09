import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-mentor-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">Cadastrar Mentor</h1>
              <p class="text-gray-600">Adicione um novo mentor ou promova um usuário existente</p>
            </div>
            <a routerLink="/admin/mentors" class="text-purple-600 hover:underline">← Voltar</a>
          </div>

          @if (error()) {
            <div class="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{{ error() }}</div>
          }

          @if (success()) {
            <div class="bg-green-50 text-green-600 p-4 rounded-lg mb-6">{{ success() }}</div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Email <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                [(ngModel)]="form.email"
                name="email"
                required
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
                placeholder="email@exemplo.com"
              />
              <p class="text-xs text-gray-500 mt-1">Se o email já existir, o usuário será promovido a mentor</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nome de usuário
              </label>
              <input
                type="text"
                [(ngModel)]="form.username"
                name="username"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
                placeholder="nome_usuario"
              />
              <p class="text-xs text-gray-500 mt-1">Obrigatório apenas para novos usuários</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                [(ngModel)]="form.password"
                name="password"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
                placeholder="********"
              />
              <p class="text-xs text-gray-500 mt-1">Obrigatório apenas para novos usuários</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                [(ngModel)]="form.phone_number"
                name="phone_number"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition"
                placeholder="11999999999"
              />
            </div>

            <div class="flex gap-4 pt-4">
              <button
                type="submit"
                [disabled]="loading() || !form.email"
                class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (loading()) {
                  <span class="flex items-center justify-center gap-2">
                    <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    Salvando...
                  </span>
                } @else {
                  Cadastrar Mentor
                }
              </button>

              <a
                routerLink="/admin/mentors"
                class="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-center"
              >
                Cancelar
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class MentorCreate {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  form = {
    email: '',
    username: '',
    password: '',
    phone_number: ''
  };

  onSubmit(): void {
    if (!this.form.email) {
      this.error.set('Email é obrigatório');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    this.adminService.createMentor(this.form).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        this.success.set(response.message || 'Mentor cadastrado com sucesso!');

        // Limpar formulário
        this.form = { email: '', username: '', password: '', phone_number: '' };

        // Redirecionar após 2 segundos
        setTimeout(() => {
          this.router.navigate(['/admin/mentors']);
        }, 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Erro ao cadastrar mentor');
      }
    });
  }
}
