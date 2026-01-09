import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../../core/services/config.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-system-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold">Configuracoes do Sistema</h1>
              <p class="text-white/80 mt-1">Gerencie ferramentas, IA e evolucao de usuarios</p>
            </div>
            <a
              routerLink="/admin/dashboard"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <span>&larr;</span> Voltar
            </a>
          </div>
        </div>

        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-skeleton variant="card" class="h-32" />
            <app-skeleton variant="card" class="h-32" />
            <app-skeleton variant="card" class="h-32" />
            <app-skeleton variant="card" class="h-32" />
          </div>
        } @else {
          <!-- Config Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Provedor de IA -->
            <a
              routerLink="/admin/llm-config"
              class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group"
            >
              <div class="flex items-center gap-4">
                <div class="text-5xl">&#129504;</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition">Provedor de IA</h3>
                  <p class="text-gray-500 text-sm">Claude, MiniMax ou OpenRouter</p>
                </div>
                <span class="text-gray-300 group-hover:text-indigo-600 transition text-2xl">&rarr;</span>
              </div>
            </a>

            <!-- Organizacao -->
            <a
              routerLink="/admin/settings"
              class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group"
            >
              <div class="flex items-center gap-4">
                <div class="text-5xl">&#128101;</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-gray-900 group-hover:text-gray-800 transition">Organizacao</h3>
                  <p class="text-gray-500 text-sm">Niveis de gestao e hierarquia</p>
                </div>
                <span class="text-gray-300 group-hover:text-gray-800 transition text-2xl">&rarr;</span>
              </div>
            </a>

            <!-- Ferramentas Core -->
            <a
              routerLink="/admin/core-tools"
              class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group"
            >
              <div class="flex items-center gap-4">
                <div class="text-5xl">&#9881;&#65039;</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-gray-900 group-hover:text-purple-600 transition">Ferramentas Core</h3>
                  <p class="text-gray-500 text-sm">
                    @if (configService.hasData()) {
                      {{ configService.enabledCoreToolsCount() }}/{{ configService.coreTools().length }} ativas
                    } @else {
                      Essenciais do sistema
                    }
                  </p>
                </div>
                <span class="text-gray-300 group-hover:text-purple-600 transition text-2xl">&rarr;</span>
              </div>
            </a>

            <!-- Ferramentas CRM -->
            <a
              routerLink="/admin/crm-tools"
              class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition group"
            >
              <div class="flex items-center gap-4">
                <div class="text-5xl">&#128202;</div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition">Ferramentas CRM</h3>
                  <p class="text-gray-500 text-sm">
                    @if (configService.hasData()) {
                      {{ configService.enabledCrmToolsCount() }}/{{ configService.crmTools().length }} ativas
                    } @else {
                      Modulo de vendas
                    }
                  </p>
                </div>
                <span class="text-gray-300 group-hover:text-blue-600 transition text-2xl">&rarr;</span>
              </div>
            </a>

            </div>
        }
      </div>
    </div>
  `
})
export class SystemConfig implements OnInit {
  readonly configService = inject(ConfigService);
  readonly loading = this.configService.loading;

  ngOnInit(): void {
    // Pre-load data para mostrar contagens
    this.configService.loadSummary().subscribe();
  }
}
