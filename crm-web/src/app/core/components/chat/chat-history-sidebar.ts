import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { WebSocketChatService, ChatSession } from '../../services/websocket-chat.service';
import { SkeletonComponent } from '../skeleton.component';

@Component({
  selector: 'app-chat-history-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent],
  template: `
    @if (isOpen()) {
      <div class="absolute inset-0 z-50 flex" (click)="close()">
        <!-- Backdrop -->
        <div class="flex-1 bg-black/30"></div>
        <!-- Sidebar -->
        <div class="w-80 bg-white shadow-xl flex flex-col h-full" (click)="$event.stopPropagation()">
          <div class="p-4 border-b flex items-center justify-between bg-purple-50">
            <h2 class="font-semibold text-gray-800">{{ historyTitle() }}</h2>
            <button (click)="close()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto">
            @if (isLoading()) {
              <app-skeleton variant="chat-list" [count]="4"></app-skeleton>
            } @else if (sessions().length === 0) {
              <div class="p-4 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                {{ emptyText() }}
              </div>
            } @else {
              <div class="divide-y">
                @for (session of sessions(); track session.session_id) {
                  <div class="p-3 hover:bg-gray-50 cursor-pointer group"
                       [class.bg-purple-100]="currentSessionId() === session.session_id"
                       [class.border-l-4]="currentSessionId() === session.session_id"
                       [class.border-purple-500]="currentSessionId() === session.session_id">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0" (click)="selectSession(session.session_id)">
                        <p class="text-sm font-medium text-gray-800 truncate">{{ session.title || defaultSessionTitle() }}</p>
                        <p class="text-xs text-gray-500 mt-1">{{ formatRelativeDate(session.created_at) }}</p>
                      </div>
                      <button
                        (click)="confirmDelete(session.session_id, $event)"
                        class="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-red-500 hover:text-red-700 p-2 transition"
                        [title]="deleteTitle()"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ChatHistorySidebarComponent {
  private readonly chatService = inject(WebSocketChatService);

  // Inputs
  readonly isOpen = input.required<boolean>();
  readonly sessions = input.required<ChatSession[]>();
  readonly isLoading = input.required<boolean>();
  readonly currentSessionId = input<string | null>(null);

  // Textos customizáveis (padrão: diagnóstico)
  readonly historyTitle = input('Histórico de Diagnósticos');
  readonly emptyText = input('Nenhum diagnóstico ainda');
  readonly defaultSessionTitle = input('Novo diagnóstico');
  readonly deleteTitle = input('Apagar diagnóstico');
  readonly deleteConfirmText = input('Tem certeza que deseja apagar este diagnóstico?');

  // Outputs
  readonly sessionSelected = output<string>();
  readonly sessionDeleted = output<string>();
  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  selectSession(sessionId: string): void {
    this.sessionSelected.emit(sessionId);
  }

  confirmDelete(sessionId: string, event: Event): void {
    event.stopPropagation();
    if (confirm(this.deleteConfirmText())) {
      this.sessionDeleted.emit(sessionId);
    }
  }

  formatRelativeDate(dateStr: string): string {
    return this.chatService.formatRelativeDate(dateStr);
  }
}
