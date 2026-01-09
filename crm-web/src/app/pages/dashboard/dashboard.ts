import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../../core/services/client.service';
import { SkeletonComponent } from '../../core/components/skeleton.component';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-4 md:p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold">Bem-vindo, {{ authService.user()?.username }}!</h1>
            </div>
            <div class="flex items-center gap-2">
              <a
                [routerLink]="'/' + userId() + '/profile'"
                class="px-2 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm md:text-base"
              >
                Perfil
              </a>
              <button
                (click)="authService.logout()"
                class="px-2 py-1.5 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm md:text-base"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Acoes Rapidas</h2>
          <div class="grid grid-cols-2 gap-4">

            <a
              [routerLink]="'/' + userId() + '/chat'"
              class="flex items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl hover:shadow-lg hover:border-blue-400 transition"
            >
              <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <div>
                <div class="font-bold text-blue-900 text-lg">Chat</div>
                <div class="text-sm text-blue-700">Conversa com IA</div>
              </div>
            </a>

            <a
              [routerLink]="'/' + userId() + '/profile'"
              class="flex items-center gap-4 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl hover:shadow-lg hover:border-emerald-400 transition"
            >
              <svg class="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <div>
                <div class="font-bold text-emerald-900 text-lg">Perfil</div>
                <div class="text-sm text-emerald-700">Meus dados</div>
              </div>
            </a>
          </div>
        </div>

        <!-- Info Card -->
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="text-center py-8">
            <div class="text-6xl mb-4">💬</div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Pronto para comecar?</h3>
            <p class="text-gray-600 mb-6">Inicie uma conversa com nossa IA para obter ajuda personalizada.</p>
            <a
              [routerLink]="'/' + userId() + '/chat'"
              class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Iniciar Chat
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class Dashboard implements OnInit {
  readonly authService = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly router = inject(Router);

  readonly userId = computed(() => this.authService.user()?.user_id || 0);
  readonly hasProfile = signal(false);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.clientService.getMyProfile().subscribe({
      next: () => this.hasProfile.set(true),
      error: () => this.hasProfile.set(false)
    });
  }
}
