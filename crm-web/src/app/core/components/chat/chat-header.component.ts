import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface ChatHeaderConfig {
  title: string;
  subtitle?: string;
  backRoute: string;
  configRoute?: string;
  gradient?: boolean;
}

@Component({
  selector: 'app-chat-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header [class]="headerClass()">
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <a [routerLink]="config().backRoute" class="hover:bg-purple-700 p-2 rounded-lg transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-xl font-bold flex items-center gap-2">
              {{ config().title }}
              @if (isConnected()) {
                <span class="w-2 h-2 bg-green-400 rounded-full" title="Conectado"></span>
              } @else {
                <span class="w-2 h-2 bg-red-400 rounded-full animate-pulse" title="Desconectado"></span>
              }
            </h1>
            @if (config().subtitle) {
              <p class="text-purple-200 text-sm">{{ config().subtitle }}</p>
            }
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (config().configRoute) {
            <a
              [routerLink]="config().configRoute"
              class="bg-purple-700 hover:bg-purple-800 p-2 rounded-lg transition"
              title="Configurar LLM"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </a>
          }
          <button
            (click)="historyClicked.emit()"
            class="bg-purple-700 hover:bg-purple-800 p-2 rounded-lg transition"
            [class.ring-2]="showHistory()"
            [class.ring-white]="showHistory()"
            [title]="historyTitle()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
          <button
            (click)="newSessionClicked.emit()"
            class="bg-purple-700 hover:bg-purple-800 p-2 rounded-lg transition"
            [title]="newSessionTitle()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `
})
export class ChatHeaderComponent {
  // Inputs
  readonly config = input.required<ChatHeaderConfig>();
  readonly isConnected = input(false);
  readonly showHistory = input(false);
  readonly historyTitle = input('Historico');
  readonly newSessionTitle = input('Nova Conversa');

  // Outputs
  readonly historyClicked = output<void>();
  readonly newSessionClicked = output<void>();

  // Computed class for header
  readonly headerClass = computed(() => {
    const base = 'text-white p-4 shadow-lg';
    const gradient = this.config().gradient
      ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
      : 'bg-purple-600';
    return `${gradient} ${base}`;
  });
}
