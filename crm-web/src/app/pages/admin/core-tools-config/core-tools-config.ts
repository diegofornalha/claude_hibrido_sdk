import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfigService, ToolConfig } from '../../../core/services/config.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-core-tools-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold">Ferramentas Core</h1>
              <p class="text-white/80 mt-1">Ferramentas essenciais do sistema (mcp__platform__)</p>
            </div>
            <a
              routerLink="/admin/config"
              class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <span>&larr;</span> Voltar
            </a>
          </div>
        </div>

        @if (error()) {
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div class="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
              <span class="text-xl">&#9888;&#65039;</span>
              {{ error() }}
              <button
                (click)="loadData()"
                class="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        }

        @if (loading() && !configService.hasData()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="card" class="h-96" />
          </div>
        }

        @if (configService.hasData()) {
          <!-- Summary -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-gray-500 text-sm font-medium mb-1">Ferramentas Ativas</div>
                <div class="text-3xl font-bold text-purple-600">
                  {{ configService.enabledCoreToolsCount() }}/{{ configService.coreTools().length }}
                </div>
              </div>
              <div class="text-5xl">&#9881;&#65039;</div>
            </div>
          </div>

          <!-- Tools List -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div class="p-6">
              @if (configService.coreTools().length === 0) {
                <div class="text-center py-8 text-gray-500">
                  <p>Nenhuma ferramenta Core encontrada</p>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (tool of configService.coreTools(); track tool.name) {
                    <div class="border rounded-xl p-4 pr-2 hover:shadow-md transition flex items-center justify-between gap-2"
                         [class.border-purple-300]="tool.enabled"
                         [class.bg-purple-50]="tool.enabled"
                         [class.border-gray-200]="!tool.enabled"
                         [class.bg-gray-50]="!tool.enabled">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-1">
                          <h3 class="font-semibold text-gray-900">{{ tool.name }}</h3>
                          <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Core</span>
                        </div>
                        <p class="text-gray-600 text-sm break-words">{{ tool.description }}</p>
                        <p class="text-gray-400 text-xs mt-1 font-mono break-all">{{ tool.full_name }}</p>
                      </div>

                      <!-- Toggle Switch -->
                      <div class="flex-shrink-0 min-w-[44px]">
                        <button
                          (click)="toggleTool(tool)"
                          [disabled]="toolUpdating() === tool.name"
                          class="relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50"
                          [class.bg-purple-500]="tool.enabled"
                          [class.bg-gray-300]="!tool.enabled"
                        >
                        <span
                          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                          [class.translate-x-5]="tool.enabled"
                          [class.translate-x-0]="!tool.enabled"
                        ></span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class CoreToolsConfig implements OnInit {
  readonly configService = inject(ConfigService);

  readonly loading = this.configService.loading;
  readonly error = signal<string | null>(null);
  readonly toolUpdating = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.error.set(null);

    this.configService.loadSummary().subscribe({
      error: (err) => {
        this.error.set(err.message || 'Erro ao carregar configuracoes');
      }
    });
  }

  toggleTool(tool: ToolConfig): void {
    this.toolUpdating.set(tool.name);

    this.configService.toggleTool(tool.name, !tool.enabled).subscribe({
      next: () => {
        this.toolUpdating.set(null);
      },
      error: (err) => {
        console.error('Erro ao atualizar ferramenta:', err);
        this.toolUpdating.set(null);
        this.loadData();
      }
    });
  }
}
