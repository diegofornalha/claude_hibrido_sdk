import { Directive, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WebSocketChatService } from '../../services/websocket-chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatHeaderConfig } from './chat-header.component';

export interface ChatPageConfig {
  basePath: 'chat' | 'CRM' | 'admin';
  header: ChatHeaderConfig;
  historyTitle: string;
  historyEmptyText: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  suggestions: string[];
}

type ServiceBasePath = 'chat' | 'CRM';

@Directive()
export abstract class ChatPageBase implements OnInit, OnDestroy {
  // Services injetados
  protected readonly chatService = inject(WebSocketChatService);
  protected readonly authService = inject(AuthService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  // Signals compartilhados
  readonly isToolsMinimized = signal(true);
  readonly scrollTargetIdx = signal<number | null>(null);

  // Configuracao abstrata - cada chat implementa
  abstract readonly config: ChatPageConfig;

  ngOnInit(): void {
    // Definir basePath apenas para chat e CRM (admin usa adminMode)
    if (this.config.basePath !== 'admin') {
      this.chatService.basePath.set(this.config.basePath as ServiceBasePath);
    }
    this.chatService.clearSessions();

    // Hook para logica especifica antes de conectar
    this.beforeConnect();

    // Conectar ao WebSocket
    this.chatService.connect();

    // Carregar sessao da URL se existir
    this.loadSessionFromRoute();

    // Hook para logica especifica apos conectar
    this.afterConnect();
  }

  ngOnDestroy(): void {
    // Hook para cleanup especifico
    this.beforeDisconnect();

    this.chatService.disconnect();
  }

  // Hooks que podem ser sobrescritos
  protected beforeConnect(): void {}
  protected afterConnect(): void {}
  protected beforeDisconnect(): void {}

  // Metodos compartilhados
  toggleToolsMinimized(): void {
    this.isToolsMinimized.update(v => !v);
  }

  sendMessage(message: string): void {
    const messages = this.chatService.messages();
    this.chatService.sendMessage(message);

    // Define o target para scroll
    const newMessageIdx = messages.length;
    this.scrollTargetIdx.set(newMessageIdx);
  }

  sendSuggestion(suggestion: string): void {
    this.sendMessage(suggestion);
  }

  newSession(): void {
    this.chatService.newSession();
    this.scrollTargetIdx.set(null);
    this.router.navigate([this.getNewSessionRoute()]);
  }

  toggleHistory(): void {
    this.chatService.toggleHistory();
  }

  loadSession(sessionId: string): void {
    this.chatService.loadSession(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.chatService.deleteSession(sessionId);
  }

  closeHistory(): void {
    this.chatService.showHistory.set(false);
  }

  dismissError(): void {
    this.chatService.error.set(null);
  }

  protected loadSessionFromRoute(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (sessionId) {
      setTimeout(() => this.chatService.loadSession(sessionId), 1000);
    }
  }

  // Metodo abstrato - cada chat define sua propria rota
  protected abstract getNewSessionRoute(): string;
}
