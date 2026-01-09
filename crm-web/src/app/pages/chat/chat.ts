import { Component, computed, ChangeDetectionStrategy } from '@angular/core';

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
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
        historyTitle="Historico"
        newSessionTitle="Nova Conversa"
        (historyClicked)="toggleHistory()"
        (newSessionClicked)="newSession()"
      />

      <!-- History Sidebar -->
      <app-chat-history-sidebar
        [isOpen]="chatService.showHistory()"
        [sessions]="chatService.sessions()"
        [isLoading]="chatService.isLoadingSessions()"
        [currentSessionId]="chatService.conversationId()"
        [historyTitle]="config.historyTitle"
        [emptyText]="config.historyEmptyText"
        defaultSessionTitle="Nova conversa"
        deleteTitle="Apagar conversa"
        deleteConfirmText="Tem certeza que deseja apagar esta conversa?"
        (sessionSelected)="loadSession($event)"
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

      <!-- Messages -->
      <app-chat-messages
        [messages]="chatService.messages()"
        [isTyping]="chatService.isTyping()"
        [suggestions]="config.suggestions"
        [hasActiveTools]="chatService.activeTools().size > 0 && isToolsMinimized()"
        [scrollTargetIdx]="scrollTargetIdx()"
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
export class Chat extends ChatPageBase {
  // UserId para construir rotas
  readonly userId = computed(() => this.authService.user()?.user_id || 0);

  // Header config dinamico baseado no userId
  readonly headerConfig = computed(() => ({
    ...this.config.header,
    backRoute: '/' + this.userId() + '/dashboard',
    configRoute: '/' + this.userId() + '/llm-config'
  }));

  // Configuracao do chat
  readonly config: ChatPageConfig = {
    basePath: 'chat',
    header: {
      title: 'Chat',
      backRoute: '/dashboard', // sera sobrescrito pelo computed
      configRoute: '/llm-config'
    },
    historyTitle: 'Historico de Conversas',
    historyEmptyText: 'Nenhuma conversa ainda',
    emptyStateTitle: 'Nova Conversa',
    emptyStateDescription: 'Comece uma conversa com seu assistente pessoal',
    suggestions: [
      'O que voce sabe sobre mim?',
      'Quero fazer meu CRM profissional',
      'Quantos mentorados tem cadastrados?',
      'Mostre minhas ultimas conversas'
    ]
  };

  protected override beforeConnect(): void {
    // Verificar se admin esta acessando chat de outro usuario
    const urlUserId = this.route.parent?.snapshot.paramMap.get('userId');
    const loggedUserId = this.authService.user()?.user_id;
    const isAdmin = this.authService.user()?.role === 'admin';

    if (urlUserId && loggedUserId && isAdmin && parseInt(urlUserId) !== loggedUserId) {
      // Admin visualizando chat de outro usuario
      this.chatService.targetUserId.set(parseInt(urlUserId));
    } else {
      this.chatService.targetUserId.set(null);
    }
  }

  protected override getNewSessionRoute(): string {
    return '/' + this.userId() + '/chat';
  }
}
