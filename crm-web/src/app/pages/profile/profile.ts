import { Component, inject, signal, ChangeDetectionStrategy, afterNextRender } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-emerald-600 text-white p-4 shadow-lg">
        <div class="max-w-2xl mx-auto flex items-center gap-3">
          <a routerLink="/dashboard" class="hover:bg-emerald-700 p-2 rounded-lg transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 class="text-xl font-bold">Meu Perfil</h1>
        </div>
      </header>

      <div class="max-w-2xl mx-auto p-4 space-y-6">

        <!-- Foto de Perfil -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Foto de Perfil</h3>

          <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()" class="space-y-4">
            <div>
              <input
                type="file"
                (change)="onImageSelect($event)"
                accept="image/*"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              @if (imagePreview()) {
                <div class="mt-3 text-center">
                  <img [src]="imagePreview()" class="inline-block w-32 h-32 rounded-full object-cover border-4 border-emerald-100" />
                </div>
              }
            </div>

            @if (successMessage()) {
              <div class="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm">
                {{ successMessage() }}
              </div>
            }

            @if (error()) {
              <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {{ error() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="saving()"
              class="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              @if (saving()) {
                <span>Salvando...</span>
              } @else {
                <span>Salvar Foto</span>
              }
            </button>
          </form>

          <p class="mt-4 text-sm text-gray-500 text-center">
            Para alterar nome, email ou telefone, use o chat.
          </p>
        </div>

        <!-- Change Password -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Alterar Senha</h3>

          <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4">
            <div>
              <label for="current_password" class="block text-sm font-medium text-gray-700 mb-1">
                Senha Atual
              </label>
              <input
                id="current_password"
                type="password"
                formControlName="current_password"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label for="new_password" class="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <input
                id="new_password"
                type="password"
                formControlName="new_password"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label for="confirm_password" class="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                id="confirm_password"
                type="password"
                formControlName="confirm_password"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            @if (passwordSuccess()) {
              <div class="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm">
                {{ passwordSuccess() }}
              </div>
            }

            @if (passwordError()) {
              <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {{ passwordError() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="passwordForm.invalid || changingPassword()"
              class="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              @if (changingPassword()) {
                <span>Alterando...</span>
              } @else {
                <span>Alterar Senha</span>
              }
            </button>
          </form>
        </div>

        <!-- Account Info -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Informações da Conta</h3>
          <dl class="space-y-3">
            <div class="flex justify-between">
              <dt class="text-gray-500">ID do Usuário</dt>
              <dd class="font-medium">{{ authService.user()?.user_id }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Data de Cadastro</dt>
              <dd class="font-medium">{{ formatDate(authService.user()?.registration_date) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Status de Verificação</dt>
              <dd class="font-medium">
                @if (authService.user()?.verification_status === 1) {
                  <span class="text-emerald-600">Verificado</span>
                } @else {
                  <span class="text-yellow-600">Pendente</span>
                }
              </dd>
            </div>
          </dl>
        </div>

        <!-- Logout and Delete Account Buttons -->
        <div class="flex gap-3">
          <button
            (click)="logout()"
            class="flex-1 bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 transition"
          >
            Sair da Conta
          </button>
          <button
            (click)="showDeleteConfirm.set(true)"
            class="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Excluir Cadastro
          </button>
        </div>

        <!-- Delete Confirmation Modal -->
        @if (showDeleteConfirm()) {
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="showDeleteConfirm.set(false)">
            <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4" (click)="$event.stopPropagation()">
              <h3 class="text-xl font-bold text-red-600 mb-3">⚠️ Excluir Cadastro</h3>
              <p class="text-gray-700 mb-4">
                Tem certeza que deseja excluir sua conta permanentemente?
                Esta ação não pode ser desfeita.
              </p>
              <p class="text-sm text-gray-500 mb-6">
                Seus dados serão removidos conforme a LGPD.
              </p>
              <div class="flex gap-3">
                <button
                  (click)="showDeleteConfirm.set(false)"
                  class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  (click)="deleteAccount()"
                  [disabled]="deletingAccount()"
                  class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  @if (deletingAccount()) {
                    <span>Excluindo...</span>
                  } @else {
                    <span>Confirmar Exclusão</span>
                  }
                </button>
              </div>
              @if (deleteError()) {
                <div class="mt-3 bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {{ deleteError() }}
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class Profile {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly deletingAccount = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly imagePreview = signal<string | null>(null);

  readonly changingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal<string | null>(null);

  readonly profileForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone_number: [''],
    profile_image_url: ['']
  });

  readonly passwordForm = this.fb.nonNullable.group({
    current_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]]
  });

  constructor() {
    afterNextRender(() => {
      const user = this.authService.user();
      if (user) {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email,
          phone_number: user.phone_number || '',
          profile_image_url: user.profile_image_url || ''
        });
        // Mostrar preview se já tem foto
        if (user.profile_image_url) {
          this.imagePreview.set(user.profile_image_url);
        }
      }
    });
  }

  getInitials(): string {
    const username = this.authService.user()?.username || '';
    return username.substring(0, 2).toUpperCase();
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  onImageSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        this.imagePreview.set(base64);
        this.profileForm.patchValue({ profile_image_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) return;

    const user = this.authService.user();
    if (!user) return;

    this.saving.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const data = this.profileForm.getRawValue();

    this.authService.updateUser(user.user_id, data).subscribe({
      next: (response) => {
        this.saving.set(false);
        if (response.success) {
          this.successMessage.set('Perfil atualizado com sucesso!');
        } else {
          this.error.set('Erro ao atualizar perfil');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.detail || 'Erro ao atualizar perfil');
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) return;

    const { current_password, new_password, confirm_password } = this.passwordForm.getRawValue();

    if (new_password !== confirm_password) {
      this.passwordError.set('As senhas não coincidem');
      return;
    }

    this.changingPassword.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(null);

    this.authService.changePassword(current_password, new_password).subscribe({
      next: (response) => {
        this.changingPassword.set(false);
        if (response.success) {
          this.passwordSuccess.set('Senha alterada com sucesso!');
          this.passwordForm.reset();
        } else {
          this.passwordError.set('Erro ao alterar senha');
        }
      },
      error: (err) => {
        this.changingPassword.set(false);
        this.passwordError.set(err.error?.detail || 'Erro ao alterar senha');
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  deleteAccount(): void {
    this.deletingAccount.set(true);
    this.deleteError.set(null);

    this.authService.deleteAccount().subscribe({
      next: () => {
        // Exclusão bem-sucedida - fazer logout automaticamente
        alert('Conta excluída com sucesso. Você será redirecionado.');
        this.authService.logout();
      },
      error: (err) => {
        this.deletingAccount.set(false);
        this.deleteError.set(err.error?.detail || 'Erro ao excluir conta. Tente novamente.');
      }
    });
  }
}
