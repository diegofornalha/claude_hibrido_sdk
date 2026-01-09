import { Component, input, output, signal, viewChild, viewChildren, ElementRef, afterRenderEffect, ChangeDetectionStrategy } from '@angular/core';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { RotatingStatusComponent } from '../rotating-status.component';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  mapUrl?: string;
}

@Component({
  selector: 'app-chat-messages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 min-h-0 flex flex-col overflow-hidden'
  },
  imports: [MarkdownPipe, RotatingStatusComponent],
  template: `
    <div class="flex-1 overflow-y-auto p-4 pb-[80vh] transition-all duration-300"
         [class.pt-16]="hasActiveTools()"
         #messagesContainer>
      <div class="max-w-4xl mx-auto space-y-4">
        @if (messages().length === 0) {
          <div class="text-center py-12">
            <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h2 class="text-xl font-semibold text-gray-700 mb-2">{{ emptyTitle() }}</h2>
            <p class="text-gray-500 mb-6">{{ emptyDescription() }}</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              @for (suggestion of suggestions(); track suggestion) {
                <button
                  (click)="onSuggestionClick(suggestion)"
                  class="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition"
                >
                  <span class="text-gray-700">{{ suggestion }}</span>
                </button>
              }
            </div>
          </div>
        }

        @for (message of messages(); track $index; let idx = $index) {
          @if (message.role === 'user') {
            <!-- Mensagem do usuário -->
            <div #userMessageEl class="flex justify-end" [attr.data-idx]="idx">
              <div class="bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                <div [innerHTML]="message.content | markdown" class="prose prose-sm max-w-none"></div>
              </div>
            </div>
          } @else {
            <!-- Mensagem do assistente -->
            <div class="flex flex-col items-start gap-2">
              <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%] shadow-sm">
                <div class="prose prose-sm max-w-none">
                  <span [innerHTML]="formatMessage(getMessageWithoutSuggestions(message.content))"></span>
                  @if (isTyping() && $last) {
                    <span class="inline-block w-2 h-4 bg-purple-600 ml-1 animate-pulse"></span>
                  }
                </div>

                @if (message.imageUrl) {
                  <img [src]="message.imageUrl" alt="Resultado" class="mt-3 rounded-lg max-w-full"/>
                }
              </div>

              <!-- Sugestões de resposta extraídas da mensagem -->
              @if ($last && !isTyping()) {
                @if (extractSuggestions(message.content).length > 0) {
                  <div class="flex flex-wrap gap-2 ml-2">
                    @for (suggestion of extractSuggestions(message.content); track suggestion) {
                      <button
                        (click)="onSuggestionClick(suggestion)"
                        class="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition border border-purple-200"
                      >
                        {{ suggestion }}
                      </button>
                    }
                  </div>
                }
              }
            </div>
          }
        }

        @if (isTyping() && !hasPartialAssistantMessage()) {
          <!-- Mostrar bolinhas apenas quando não tem texto parcial ainda -->
          <div class="flex justify-start">
            <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div class="flex items-center gap-2">
                <div class="flex gap-1">
                  <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
                <app-rotating-status class="text-gray-500 text-sm" />
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ChatMessagesComponent {
  // Inputs
  readonly messages = input.required<ChatMessage[]>();
  readonly isTyping = input.required<boolean>();
  readonly suggestions = input<string[]>([]);
  readonly hasActiveTools = input(false);
  readonly scrollTargetIdx = input<number | null>(null);
  readonly scrollToBottom = input(false);
  readonly emptyTitle = input('Chat');
  readonly emptyDescription = input('Como posso te ajudar hoje?');

  // Outputs
  readonly suggestionClicked = output<string>();

  // ViewChildren para scroll
  private readonly messagesContainer = viewChild<ElementRef>('messagesContainer');
  private readonly userMessageElements = viewChildren<ElementRef>('userMessageEl');

  constructor() {
    // afterRenderEffect com fases separadas para scroll preciso
    afterRenderEffect({
      earlyRead: () => {
        const container = this.messagesContainer()?.nativeElement;
        if (!container) return null;

        // Scroll to bottom quando carregar sessão
        if (this.scrollToBottom()) {
          return { scrollPosition: container.scrollHeight, container, toBottom: true };
        }

        const targetIdx = this.scrollTargetIdx();
        const elements = this.userMessageElements();

        // Só processa se tiver target
        if (targetIdx === null || elements.length === 0) {
          return null;
        }

        // Encontra o elemento alvo
        const targetElement = elements.find(
          el => parseInt(el.nativeElement.dataset.idx) === targetIdx
        )?.nativeElement;

        if (!targetElement) return null;

        // Cálculo preciso usando getBoundingClientRect (não offsetTop)
        const containerRect = container.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();

        // Posição de scroll = scroll atual + distância do elemento ao topo do container
        const scrollPosition = container.scrollTop + (elementRect.top - containerRect.top) - 16;

        return { scrollPosition, container, toBottom: false };
      },
      write: (dataSignal) => {
        const data = dataSignal();
        if (!data) return;

        // Scroll to bottom com behavior smooth
        if (data.toBottom) {
          data.container.scrollTo({
            top: data.scrollPosition,
            behavior: 'smooth'
          });
          return;
        }

        // Só faz scroll se a diferença for significativa
        if (Math.abs(data.container.scrollTop - data.scrollPosition) > 5) {
          data.container.scrollTo({
            top: Math.max(0, data.scrollPosition),
            behavior: 'instant' // instant durante streaming para não acumular
          });
        }
      }
    });
  }

  onSuggestionClick(suggestion: string): void {
    this.suggestionClicked.emit(suggestion);
  }

  hasPartialAssistantMessage(): boolean {
    const msgs = this.messages();
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    return lastMsg.role === 'assistant' && lastMsg.content.length > 0;
  }

  /**
   * Extrai sugestões de resposta do texto do assistente.
   * Procura pelo padrão: 💡 **Sugestões:** seguido de lista com "-"
   */
  extractSuggestions(content: string): string[] {
    // Padrão: 💡 **Sugestões:** ou variações
    const suggestionsPattern = /💡\s*\*{0,2}Sugestões:?\*{0,2}\s*([\s\S]*?)(?=\n\n|$)/i;
    const match = content.match(suggestionsPattern);

    if (!match) return [];

    // Extrair itens da lista (linhas que começam com -)
    const listItems = match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(item => item.length > 0 && item.length < 100);

    return listItems.slice(0, 4); // Máximo 4 sugestões
  }

  /**
   * Remove a seção de sugestões do texto para exibição limpa
   */
  getMessageWithoutSuggestions(content: string): string {
    // Remove a seção de sugestões do texto
    return content
      .replace(/💡\s*\*{0,2}Sugestões:?\*{0,2}\s*[\s\S]*?(?=\n\n|$)/gi, '')
      .trim();
  }

  formatMessage(content: string): string {
    return content
      // Remove tool calls do texto (ex: get_session_user_info({"session_id": "..."}))
      .replace(/\b(get_session_user_info|get_user_diagnosis|get_diagnosis_areas|save_diagnosis|execute_sql_query|mcp__\w+)\s*(\([^)]*\))?/g, '')
      // Remove blocos de código SQL (```sql ... ``` ou `sql ... `)
      .replace(/```sql[\s\S]*?```/gi, '')
      .replace(/`sql\s+[^`]+`/gi, '')
      // Remove queries SQL inline (SELECT, INSERT, UPDATE, DELETE)
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE)\s+[\w\s,.*='"()]+\s+(FROM|INTO|SET|WHERE)[\w\s,.*='"();<>-]+/gi, '')
      // Remove tags XML de ferramentas (<query>...</query>, <tool>...</tool>, etc)
      .replace(/<(query|tool|function|sql)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/?[a-z_]+>/gi, '')
      // Remove linhas vazias extras criadas pela remoção
      .replace(/\n{3,}/g, '\n\n')
      // Markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="my-2 rounded-lg max-w-full"/>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-purple-600 hover:underline">$1</a>');
  }
}
