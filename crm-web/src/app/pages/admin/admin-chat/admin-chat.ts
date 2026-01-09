import { Component, ChangeDetectionStrategy } from '@angular/core';

// Componentes compartilhados de chat
import {
  ChatPageBase,
  ChatPageConfig,
  ChatHeaderComponent,
  ChatInputComponent,
  ChatHistorySidebarComponent,
  ToolsIndicatorComponent,
  ChatMessagesComponent
} from '../../../core/components/chat';

@Component({
  selector: 'app-admin-chat',
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
        [config]="config.header"
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
export class AdminChat extends ChatPageBase {
  // Configuracao do admin chat
  readonly config: ChatPageConfig = {
    basePath: 'admin',
    header: {
      title: 'Admin Chat',
      backRoute: '/admin/dashboard',
      configRoute: '/admin/llm-config'
    },
    historyTitle: 'Historico do Admin',
    historyEmptyText: 'Nenhuma conversa ainda',
    emptyStateTitle: 'Chat Administrativo',
    emptyStateDescription: 'Gerencie mentores, mentorados e dados do sistema via chat.',
    suggestions: [
      'Quantos mentorados temos cadastrados?',
      'Como esta a saude do sistema?',
      'Alguma ferramenta com problemas?',
      'Quem esta usando mais o sistema?',
      'Como esta o uso de storage?'
    ]
  };

  protected override beforeConnect(): void {
    // Ativar modo admin para URLs corretas (/admin/chat/...)
    this.chatService.adminMode.set(true);
  }

  protected override beforeDisconnect(): void {
    this.chatService.adminMode.set(false);
  }

  protected override getNewSessionRoute(): string {
    return '/admin/chat';
  }
}
