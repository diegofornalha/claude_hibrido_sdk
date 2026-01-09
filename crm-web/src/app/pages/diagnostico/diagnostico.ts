import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DiagnosticProgressService } from '../../core/services/diagnostic-progress.service';

// Componentes compartilhados de chat
import {
  ChatPageBase,
  ChatPageConfig,
  ChatHeaderComponent,
  ChatInputComponent,
  ChatHistorySidebarComponent,
  ToolsIndicatorComponent,
  ChatMessagesComponent
} from '../../core/components/chat';

@Component({
  selector: 'app-diagnostico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ChatHeaderComponent,
    ChatInputComponent,
    ChatHistorySidebarComponent,
    ToolsIndicatorComponent,
    ChatMessagesComponent
  ],
  template: `
    <div class="h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      <!-- Header -->
      <app-chat-header
        [config]="headerConfig()"
        [isConnected]="chatService.isConnected()"
        [showHistory]="chatService.showHistory()"
        historyTitle="Historico de Diagnosticos"
        newSessionTitle="Novo Diagnostico"
        (historyClicked)="toggleHistory()"
        (newSessionClicked)="newDiagnostic()"
      />

      <!-- History Sidebar -->
      <app-chat-history-sidebar
        [isOpen]="chatService.showHistory()"
        [sessions]="chatService.sessions()"
        [isLoading]="chatService.isLoadingSessions()"
        [currentSessionId]="chatService.conversationId()"
        [historyTitle]="config.historyTitle"
        [emptyText]="config.historyEmptyText"
        defaultSessionTitle="Novo diagnostico"
        deleteTitle="Apagar diagnostico"
        deleteConfirmText="Tem certeza que deseja apagar este diagnostico?"
        (sessionSelected)="loadDiagnosticSession($event)"
        (sessionDeleted)="deleteSession($event)"
        (closed)="closeHistory()"
      />

      <!-- Tools Indicator -->
      <app-tools-indicator
        [activeTools]="chatService.activeTools()"
        [thinkingContent]="chatService.thinkingContent()"
        [isMinimized]="isToolsMinimized()"
        (toggleMinimized)="toggleToolsMinimized()"
      />

      <!-- Barra de Progresso do Diagnostico -->
      <div class="bg-white border-b border-gray-200 px-4 py-3">
        <div class="max-w-4xl mx-auto">
          @if (progressService.isGenerating()) {
            <!-- Estado: Gerando diagnostico -->
            <div class="flex flex-col items-center justify-center gap-2 py-2">
              <div class="flex items-center gap-3">
                <div class="flex gap-1">
                  <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
                <span class="text-purple-600 font-medium">Gerando seu diagnostico...</span>
              </div>
              <span class="text-purple-400 text-sm">Aguarde enquanto analisamos suas respostas</span>
            </div>
            <div class="w-full bg-purple-100 rounded-full h-2 mt-2 overflow-hidden">
              <div class="bg-purple-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
          } @else if (progressService.isSaved()) {
            <!-- Estado: Diagnostico salvo -->
            <div class="flex items-center justify-center gap-2 py-2">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span class="text-green-600 font-medium">Diagnostico concluido!</span>
              <a
                [routerLink]="'/' + userId() + '/diagnostico/recents'"
                class="ml-2 text-purple-600 hover:underline text-sm"
              >
                Ver historico
              </a>
            </div>
            <div class="w-full bg-green-100 rounded-full h-2 mt-2">
              <div class="bg-green-500 h-2 rounded-full w-full"></div>
            </div>
          } @else {
            <!-- Estado: Em andamento ou nao iniciado -->
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium text-gray-700">
                @if (progressService.progress() === 0) {
                  Pronto para iniciar
                } @else {
                  Diagnostico em andamento
                }
              </span>
              <span class="text-sm text-purple-600 font-semibold">{{ progressService.progress() }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-purple-600 h-2 rounded-full transition-all duration-500"
                [style.width.%]="progressService.progress()"
              ></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-500">
              <span>{{ progressService.currentArea() }}</span>
              <span>{{ progressService.areasCompleted() }}/7 areas</span>
            </div>
          }
        </div>
      </div>

      <!-- Messages -->
      <app-chat-messages
        [messages]="chatService.messages()"
        [isTyping]="chatService.isTyping()"
        [suggestions]="config.suggestions"
        [hasActiveTools]="chatService.activeTools().size > 0 && isToolsMinimized()"
        [scrollTargetIdx]="scrollTargetIdx()"
        [scrollToBottom]="shouldScrollToBottom()"
        [emptyTitle]="config.emptyStateTitle"
        [emptyDescription]="config.emptyStateDescription"
        (suggestionClicked)="sendSuggestion($event)"
      />

      <!-- Input -->
      <app-chat-input
        [isTyping]="chatService.isTyping()"
        [isConnected]="chatService.isConnected()"
        [error]="chatService.error()"
        (messageSent)="sendMessage($event)"
        (errorDismissed)="dismissError()"
      />
    </div>
  `
})
export class Diagnostico extends ChatPageBase {
  readonly progressService = inject(DiagnosticProgressService);

  // UserId para construir rotas
  readonly userId = computed(() => this.authService.user()?.user_id || 0);

  // Estado local adicional
  readonly shouldScrollToBottom = signal(false);

  // Header config dinamico baseado no userId
  readonly headerConfig = computed(() => ({
    ...this.config.header,
    backRoute: '/' + this.userId() + '/dashboard',
    gradient: true
  }));

  // Configuracao do diagnostico
  readonly config: ChatPageConfig = {
    basePath: 'diagnostico',
    header: {
      title: 'Diagnostico Profissional',
      subtitle: 'Avaliacao das 7 areas do seu negocio',
      backRoute: '/dashboard',
      gradient: true
    },
    historyTitle: 'Historico de Diagnosticos',
    historyEmptyText: 'Nenhum diagnostico ainda',
    emptyStateTitle: 'Diagnostico Profissional',
    emptyStateDescription: 'Vamos avaliar as 7 areas do seu negocio para criar um plano de acao personalizado',
    suggestions: [
      'Quero fazer meu diagnostico profissional',
      'Continuar de onde parei',
      'Ver meu ultimo diagnostico'
    ]
  };

  protected override afterConnect(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (sessionId) {
      // Scroll para baixo apos carregar mensagens
      setTimeout(() => {
        this.shouldScrollToBottom.set(true);
        setTimeout(() => this.shouldScrollToBottom.set(false), 500);
      }, 500);
    }
  }

  protected override beforeDisconnect(): void {
    // Reset basePath para chat (padrao)
    this.chatService.basePath.set('chat');
  }

  protected override getNewSessionRoute(): string {
    return '/' + this.userId() + '/diagnostico';
  }

  // Metodo especifico para novo diagnostico (sem navegar)
  newDiagnostic(): void {
    this.chatService.newSession();
    this.scrollTargetIdx.set(null);
    this.router.navigate(['/', this.userId(), 'diagnostico']);
  }

  // Metodo especifico para carregar sessao com atualizacao de URL
  loadDiagnosticSession(sessionId: string): void {
    this.chatService.loadSession(sessionId);
    this.router.navigate(['/', this.userId(), 'diagnostico', sessionId]);
  }
}
