import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfigService, LLMConfig } from '../../../core/services/config.service';
import { SkeletonComponent } from '../../../core/components/skeleton.component';

@Component({
  selector: 'app-llm-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SkeletonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold">Provedor de IA</h1>
              <p class="text-white/80 mt-1">Configure o provedor LLM do sistema</p>
            </div>
            <a
              routerLink="/admin/system-config"
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

        @if (loading() && !configService.llmConfig()) {
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <app-skeleton variant="card" class="h-96" />
          </div>
        }

        @if (configService.llmConfig(); as config) {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-2xl shadow-lg p-8">

            <!-- Provider Selection -->
            <div class="mb-8">
              <label class="block text-sm font-medium text-gray-700 mb-3">Provedor de IA</label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                @for (provider of config.available_providers; track provider) {
                  <button
                    type="button"
                    (click)="selectProvider(provider)"
                    class="p-5 rounded-xl border-2 transition text-left hover:shadow-md"
                    [class.border-indigo-500]="selectedProvider() === provider"
                    [class.bg-indigo-50]="selectedProvider() === provider"
                    [class.border-gray-200]="selectedProvider() !== provider"
                  >
                    <div class="flex items-center gap-3 mb-2">
                      <span class="text-2xl">{{ getProviderIcon(provider) }}</span>
                      <div class="font-bold text-lg text-gray-900">{{ getProviderName(provider) }}</div>
                    </div>
                    <div class="text-sm text-gray-500">{{ getProviderDescription(provider) }}</div>
                    @if (provider === 'claude') {
                      <span class="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Sua assinatura
                      </span>
                    }
                  </button>
                }
              </div>
            </div>

            <!-- Model Selection -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
              <select
                formControlName="model"
                class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                @for (model of availableModels(); track model) {
                  <option [value]="model">{{ model }}</option>
                }
              </select>
            </div>

            <!-- API Key (para MiniMax e OpenRouter) -->
            @if (showApiKey()) {
              <!-- Mostrar campo apenas se não tiver chave configurada ou for OpenRouter -->
              @if (!config.has_api_key || selectedProvider() === 'openrouter') {
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    API Key {{ selectedProvider() === 'minimax' ? 'MiniMax' : 'OpenRouter' }}
                  </label>
                  <input
                    type="password"
                    formControlName="apiKey"
                    [placeholder]="selectedProvider() === 'openrouter' ? 'sk-or-v1-...' : 'Token JWT MiniMax'"
                    class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  @if (config.has_api_key && selectedProvider() === 'openrouter') {
                    <p class="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <span>&#10003;</span> Chave configurada
                    </p>
                  }
                </div>
              } @else {
                <!-- Mostrar apenas mensagem de confirmação para MiniMax com chave configurada -->
                <div class="mb-6">
                  <p class="text-sm text-green-600 flex items-center gap-1">
                    <span>&#10003;</span> API Key MiniMax configurada
                  </p>
                </div>
              }
            }

            <!-- Features Warning -->
            @if (selectedProvider() !== 'claude' && selectedProvider() !== 'hybrid') {
              <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div class="flex items-start gap-3">
                  <span class="text-xl">&#9888;&#65039;</span>
                  <div>
                    <p class="text-yellow-800 font-medium">Features limitadas</p>
                    <p class="text-yellow-700 text-sm mt-1">
                      Hooks de seguranca SQL, MCP Servers e Agentes customizados
                      nao funcionam com {{ getProviderName(selectedProvider()) }}.
                    </p>
                  </div>
                </div>
              </div>
            }

            <!-- Hybrid Mode Info -->
            @if (selectedProvider() === 'hybrid') {
              <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div class="flex items-start gap-3">
                  <span class="text-xl">&#9889;</span>
                  <div>
                    <p class="text-blue-800 font-medium">Modo Híbrido</p>
                    <p class="text-blue-700 text-sm mt-1">
                      MiniMax responde rapidamente para conversas simples.
                      Claude assume automaticamente quando precisa usar ferramentas (SQL, diagnósticos, etc).
                    </p>
                  </div>
                </div>
              </div>
            }

            <!-- Current Config Info -->
            <div class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div class="flex items-center gap-3">
                <span class="text-xl">&#9881;&#65039;</span>
                <div>
                  <p class="text-gray-700 font-medium">Configuracao atual</p>
                  <p class="text-gray-500 text-sm">
                    {{ getProviderName(config.provider) }} / {{ config.model }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="saving() || !form.valid"
              class="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              @if (saving()) {
                <span class="animate-spin">&#9881;&#65039;</span>
                Salvando...
              } @else {
                Salvar Configuracao
              }
            </button>

            @if (successMessage()) {
              <div class="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center">
                {{ successMessage() }}
              </div>
            }
          </form>
        }
      </div>
    </div>
  `
})
export class LLMConfigComponent implements OnInit {
  readonly configService = inject(ConfigService);
  private readonly fb = inject(FormBuilder);

  readonly loading = this.configService.loading;
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    provider: ['claude', Validators.required],
    model: ['claude-opus-4-5', Validators.required],
    apiKey: ['']
  });

  // Signal para rastrear provider selecionado (para reatividade com computed)
  readonly selectedProvider = signal<string>('claude');

  readonly availableModels = computed(() => {
    const config = this.configService.llmConfig();
    const provider = this.selectedProvider();
    return config?.available_models[provider] || [];
  });

  readonly showApiKey = computed(() => {
    const provider = this.selectedProvider();
    return provider === 'minimax' || provider === 'hybrid' || provider === 'openrouter';
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.error.set(null);

    this.configService.loadLLMConfig().subscribe({
      next: (config) => {
        this.selectedProvider.set(config.provider);
        this.form.patchValue({
          provider: config.provider,
          model: config.model
        });
      },
      error: (err) => {
        this.error.set(err.message || 'Erro ao carregar configuracao LLM');
      }
    });
  }

  selectProvider(provider: string): void {
    this.selectedProvider.set(provider);
    this.form.patchValue({ provider });
    // Reset model to first available for provider
    const models = this.configService.llmConfig()?.available_models[provider];
    if (models?.length) {
      this.form.patchValue({ model: models[0] });
    }
    // Clear API key when switching
    this.form.patchValue({ apiKey: '' });
  }

  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      'claude': '\u{1F9E0}', // brain
      'hybrid': '\u{26A1}', // lightning bolt
      'minimax': '\u{1F680}', // rocket
      'openrouter': '\u{1F310}' // globe
    };
    return icons[provider] || '\u{2699}\u{FE0F}';
  }

  getProviderName(provider: string | null): string {
    if (!provider) return '';
    const names: Record<string, string> = {
      'claude': 'Claude',
      'hybrid': 'Híbrido',
      'minimax': 'MiniMax',
      'openrouter': 'OpenRouter'
    };
    return names[provider] || provider;
  }

  getProviderDescription(provider: string): string {
    const descriptions: Record<string, string> = {
      'claude': 'Todas as features, sem custo extra',
      'hybrid': 'MiniMax rápido + Claude para tools',
      'minimax': 'API direta MiniMax',
      'openrouter': 'GPT, Gemini, Llama e mais'
    };
    return descriptions[provider] || '';
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    this.saving.set(true);
    this.successMessage.set(null);
    this.error.set(null);

    const { provider, model, apiKey } = this.form.value;

    this.configService.updateLLMConfig(provider!, model!, apiKey || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Configuracao salva com sucesso!');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.detail || 'Erro ao salvar configuracao');
      }
    });
  }
}
