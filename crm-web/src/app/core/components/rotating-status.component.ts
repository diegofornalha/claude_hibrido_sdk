import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';

/**
 * Componente que exibe texto rotativo de status (similar ao Claude Code).
 * O texto muda a cada 1 segundo entre diferentes frases criativas.
 *
 * Uso: <app-rotating-status class="text-gray-500 text-sm" />
 */
@Component({
  selector: 'app-rotating-status',
  standalone: true,
  template: `<span>{{ currentText() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RotatingStatusComponent implements OnInit, OnDestroy {
  private readonly MESSAGES = [
    // Estrelas Básicas
    '⭑ Calculando…',
    '⭒ Calibrando…',
    '✪ Orbitando…',
    '✫ Cintilando…',
    '✬ Brilhando…',
    '✭ Reluzindo…',
    '✮ Resplandecendo…',
    '✯ Fulgurando…',
    '✰ Irradiando…',
    '✴ Centralizando…',
    '✵ Focalizando…',
    '✶ Desvendando…',
    '✷ Projetando…',
    '✸ Expandindo…',
    '✹ Ramificando…',
    '✺ Avaliando…',
    '✻ Explorando…',
    '✼ Navegando…',
    '✽ Marinando…',
    '✾ Desabrochando…',
    '✿ Florescendo…',
    '❀ Cultivando…',
    '❁ Germinando…',

    // Estrelas Decorativas
    '✦ Processando…',
    '✧ Analisando…',
    '✩ Observando…',
    '✫ Gravitando…',
    '✭ Ascendendo…',
    '✮ Transcendendo…',
    '✯ Iluminando…',
    '❂ Entrelaçando…',
    '❃ Harmonizando…',
    '❉ Sincronizando…',
    '❊ Equilibrando…',
    '❋ Balanceando…',
    '⁂ Pontuando…',
    '⁎ Marcando…',
    '⁑ Destacando…',
    '※ Notificando…',
    '⚝ Simbolizando…',
    '✢ Pensando…',
    '✣ Articulando…',
    '✤ Elaborando…',
    '✥ Refinando…',

    // Formas Geométricas
    '✤ Atravessando…',
    '✥ Transpassando…',
    '✱ Intersectando…',
    '✲ Dividindo…',
    '✴ Dispersando…',
    '✵ Espalhando…',
    '✶ Distribuindo…',
    '✷ Propagando…',
    '✹ Difundindo…',
    '❃ Polinizando…',
    '❊ Disseminando…',
    '⚹ Catalisando…',

    // Flores e Variações
    '❀ Brotando…',
    '❈ Ecoando…',
    '❉ Ressoando…',
    '❊ Vibrando…',
    '❋ Pulsando…',
    '✿ Perfumando…',
    '⚘ Enraizando…',
    '⁕ Ramificando…',
    '☙ Folheando…',
    '❦ Ornamentando…',
    '❧ Embelezando…',
  ];

  readonly currentText = signal(this.MESSAGES[0]);
  private intervalId?: ReturnType<typeof setInterval>;
  private currentIndex = 0;

  ngOnInit(): void {
    // Iniciar com mensagem aleatória para variar
    this.currentIndex = Math.floor(Math.random() * this.MESSAGES.length);
    this.currentText.set(this.MESSAGES[this.currentIndex]);

    // Trocar mensagem a cada 1 segundo
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.MESSAGES.length;
      this.currentText.set(this.MESSAGES[this.currentIndex]);
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
