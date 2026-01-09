import { Component, inject, input, output, signal, viewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { WebSocketChatService, ToolEvent } from '../../services/websocket-chat.service';
import { RotatingStatusComponent } from '../rotating-status.component';

@Component({
  selector: 'app-tools-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RotatingStatusComponent],
  template: `
    @if (activeTools().size > 0) {
      <!-- Versão Minimizada - Banner fixo abaixo do header -->
      @if (isMinimized()) {
        <div class="fixed top-[72px] left-0 right-0 z-40 pointer-events-none">
          <div class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-2.5 shadow-md pointer-events-auto border-b border-purple-400/30">
            <div class="max-w-4xl mx-auto flex items-center justify-between">
              <div class="flex items-center gap-3">
                <!-- Indicador animado -->
                <div class="relative">
                  <div class="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                  </div>
                  <div class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse border border-white/50"></div>
                </div>

                <!-- Texto principal -->
                <div class="flex items-center gap-2">
                  <app-rotating-status class="font-medium text-sm" />
                  <span class="text-purple-200/80 text-xs">{{ getRunningToolsCount() }} {{ getRunningToolsCount() === 1 ? 'tarefa' : 'tarefas' }}</span>
                  @if (getCompletedToolsCount() > 0) {
                    <span class="text-green-300 text-xs flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      {{ getCompletedToolsCount() }}
                    </span>
                  }
                </div>
              </div>

              <!-- Botão expandir -->
              <button
                (click)="toggle()"
                class="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full transition text-xs font-medium"
                title="Ver detalhes"
              >
                <span>Detalhes</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      } @else {
        <!-- Versão Maximizada - Modal Fullscreen -->
        <div class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-4 pb-4 pointer-events-none">
          <div class="w-full max-w-5xl h-[calc(100vh-2rem)] mx-4 bg-white/98 backdrop-blur-lg rounded-3xl shadow-2xl border border-purple-200 overflow-hidden pointer-events-auto flex flex-col animate-fade-in">
            <!-- Header Fixo com Botão Minimizar -->
            <div class="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 border-b border-purple-500">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-xl font-bold">O Agente está trabalhando...</h3>
                    <p class="text-purple-200 text-sm mt-0.5">{{ activeTools().size }} {{ activeTools().size === 1 ? 'ferramenta ativa' : 'ferramentas ativas' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-purple-200 text-sm">
                    <div class="bg-white/10 px-3 py-1 rounded-full">
                      <app-rotating-status />
                    </div>
                  </div>
                  <button
                    (click)="toggle()"
                    class="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition ml-3"
                    title="Minimizar"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Thinking Panel (Debug/Insights) -->
            @if (thinkingContent() && thinkingContent().trim()) {
              <div class="flex-shrink-0 bg-blue-50 border-b border-blue-200 px-6 py-3">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-semibold text-blue-900">Pensando...</span>
                      <span class="text-xs text-blue-600">(Raciocínio interno do Claude)</span>
                    </div>
                    <div class="text-xs text-blue-800 bg-white/60 rounded-lg px-3 py-2 max-h-24 overflow-y-auto font-mono">
                      {{ thinkingContent() }}
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Lista de Ferramentas com Scroll Automático -->
            <div class="flex-1 overflow-y-auto p-6" #toolsContainer>
              <div class="space-y-3">
                @for (tool of getVisibleTools(); track tool.tool_use_id; let idx = $index) {
                  <div class="transform transition-all duration-300"
                       [class.animate-slide-in]="tool.status === 'running'"
                       [class.opacity-60]="tool.status === 'done' || tool.status === 'error'">
                    <div class="bg-gradient-to-r from-gray-50 to-white px-5 py-4 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                         [class.border-purple-400]="tool.status === 'running'"
                         [class.border-green-400]="tool.status === 'done'"
                         [class.border-red-400]="tool.status === 'error'"
                         [class.from-purple-50]="tool.status === 'running'"
                         [class.from-green-50]="tool.status === 'done'"
                         [class.from-red-50]="tool.status === 'error'">

                      <!-- Badge de Número -->
                      <div class="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                           [class.bg-purple-200]="tool.status === 'running'"
                           [class.text-purple-700]="tool.status === 'running'"
                           [class.bg-green-200]="tool.status === 'done'"
                           [class.text-green-700]="tool.status === 'done'"
                           [class.bg-red-200]="tool.status === 'error'"
                           [class.text-red-700]="tool.status === 'error'">
                        #{{ idx + 1 + getHiddenToolsCount() }}
                      </div>

                      <div class="flex items-start gap-4">
                        <!-- Ícone de Status -->
                        <div class="flex-shrink-0 mt-1">
                          @if (tool.status === 'running') {
                            <div class="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          } @else if (tool.status === 'done') {
                            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                          } @else {
                            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                            </svg>
                          }
                        </div>

                        <!-- Conteúdo -->
                        <div class="flex-1 min-w-0 pr-8">
                          <!-- Nome da Ferramenta com Badge de Status -->
                          <div class="flex items-center gap-2 mb-3">
                            <span class="text-2xl flex-shrink-0">{{ chatService.getToolIcon(tool.tool) }}</span>
                            <div class="flex-1 min-w-0">
                              <div class="font-semibold text-gray-900 text-base truncate">
                                {{ chatService.getToolDisplayName(tool.tool) }}
                              </div>
                              @if (tool.status === 'running') {
                                <div class="text-xs text-purple-600 mt-0.5">Em execução...</div>
                              } @else if (tool.status === 'done') {
                                <div class="text-xs text-green-600 mt-0.5">Concluído</div>
                              } @else if (tool.status === 'error') {
                                <div class="text-xs text-red-600 mt-0.5">Erro</div>
                              }
                            </div>
                          </div>

                          <!-- Detalhes da Operação (SEMPRE VISÍVEL) -->
                          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl mb-2 border border-blue-200">
                            <div class="flex items-start gap-2">
                              <svg class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              <div class="flex-1 min-w-0">
                                <div class="text-xs font-semibold text-blue-800 mb-1">Operação:</div>
                                <div class="text-sm text-blue-900 font-mono break-words">
                                  {{ chatService.getToolDetails(tool) }}
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Tempo de Execução -->
                          @if (chatService.getToolDuration(tool) !== null) {
                            <div class="flex items-center gap-2 text-xs text-gray-500 mt-2">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              <span>{{ chatService.formatDuration(chatService.getToolDuration(tool)!) }}</span>
                            </div>
                          }

                          <!-- Mensagem de Erro (se houver) -->
                          @if (tool.status === 'error' && tool.content) {
                            <div class="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                              {{ tool.content }}
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- Botão para expandir/colapsar ferramentas anteriores -->
                @if (getHiddenToolsCount() > 0) {
                  <div class="text-center py-3">
                    <button
                      (click)="toggleToolsView()"
                      class="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md border border-purple-200"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                      <span>
                        + {{ getHiddenToolsCount() }} {{ getHiddenToolsCount() === 1 ? 'ferramenta anterior' : 'ferramentas anteriores' }}
                      </span>
                      <span class="text-xs text-purple-500">(clique para ver)</span>
                    </button>
                  </div>
                }

                <!-- Botão para colapsar quando expandido -->
                @if (showAllTools() && activeTools().size > 1) {
                  <div class="text-center py-3">
                    <button
                      (click)="toggleToolsView()"
                      class="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                    >
                      <svg class="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                      <span>Ocultar ferramentas anteriores</span>
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Footer com Estatísticas -->
            <div class="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3">
              <div class="flex items-center justify-between text-xs text-gray-600">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span>{{ getRunningToolsCount() }} em execução</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{{ getCompletedToolsCount() }} concluídas</span>
                  </div>
                  @if (getErrorToolsCount() > 0) {
                    <div class="flex items-center gap-1.5">
                      <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>{{ getErrorToolsCount() }} com erro</span>
                    </div>
                  }
                </div>
                <div class="text-gray-500">
                  As ferramentas concluídas serão removidas automaticamente
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    }
  `
})
export class ToolsIndicatorComponent {
  readonly chatService = inject(WebSocketChatService);

  // Inputs
  readonly activeTools = input.required<Map<string, ToolEvent>>();
  readonly thinkingContent = input<string>('');
  readonly isMinimized = input(true);

  // Outputs
  readonly toggleMinimized = output<void>();

  // Estado local
  private readonly toolsContainer = viewChild<ElementRef>('toolsContainer');
  readonly showAllTools = signal(false);
  private readonly MAX_VISIBLE_TOOLS = 1;
  private lastToolsScrollHeight = 0;

  toggle(): void {
    this.toggleMinimized.emit();
  }

  toggleToolsView(): void {
    this.showAllTools.update(v => !v);
  }

  getVisibleTools(): ToolEvent[] {
    const allTools = Array.from(this.activeTools().values());

    const sortedTools = allTools.sort((a, b) => {
      const timeA = a.startTime?.getTime() ?? 0;
      const timeB = b.startTime?.getTime() ?? 0;
      return timeA - timeB;
    });

    if (this.showAllTools()) {
      return sortedTools;
    } else {
      return sortedTools.slice(-this.MAX_VISIBLE_TOOLS);
    }
  }

  getHiddenToolsCount(): number {
    if (this.showAllTools()) {
      return 0;
    }
    const total = this.activeTools().size;
    return total > 1 ? total - 1 : 0;
  }

  getRunningToolsCount(): number {
    return Array.from(this.activeTools().values())
      .filter(t => t.status === 'running').length;
  }

  getCompletedToolsCount(): number {
    return Array.from(this.activeTools().values())
      .filter(t => t.status === 'done').length;
  }

  getErrorToolsCount(): number {
    return Array.from(this.activeTools().values())
      .filter(t => t.status === 'error').length;
  }
}
