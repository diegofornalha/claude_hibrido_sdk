import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="fixed bottom-0 left-0 right-0 border-t bg-white p-4 z-40">
      <div class="max-w-4xl mx-auto">
        @if (error()) {
          <div class="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1">
              <p class="font-medium">Erro</p>
              <p class="text-sm">{{ error() }}</p>
            </div>
            <button (click)="dismissError()" class="text-red-500 hover:text-red-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }
        <form (submit)="onSubmit($event)" class="flex gap-3">
          <input
            type="text"
            [(ngModel)]="messageInput"
            name="message"
            placeholder="Ex: Liste os diagnósticos, Mostre estatísticas..."
            autocomplete="off"
            [disabled]="!isConnected()"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            [disabled]="!messageInput.trim() || isTyping() || !isConnected()"
            class="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  `
})
export class ChatInputComponent {
  // Inputs
  readonly isTyping = input.required<boolean>();
  readonly isConnected = input.required<boolean>();
  readonly error = input<string | null>(null);

  // Outputs
  readonly messageSent = output<string>();
  readonly errorDismissed = output<void>();

  // Estado local
  messageInput = '';

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.messageInput.trim()) return;

    this.messageSent.emit(this.messageInput.trim());
    this.messageInput = '';
  }

  dismissError(): void {
    this.errorDismissed.emit();
  }
}
