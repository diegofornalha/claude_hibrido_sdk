import { Injectable, inject, computed } from '@angular/core';
import { WebSocketChatService } from './websocket-chat.service';

interface DiagnosticArea {
  key: string;
  name: string;
  keywords: string[];
}

@Injectable({ providedIn: 'root' })
export class DiagnosticProgressService {
  private readonly chatService = inject(WebSocketChatService);

  // Areas do diagnostico na ordem correta
  readonly diagnosticAreas: DiagnosticArea[] = [
    { key: 'vendas', name: 'Vendas', keywords: ['vendas', 'venda', 'precificacao', 'preco', 'ticket', 'faturamento', 'primeira area', '1a area'] },
    { key: 'cliente', name: 'Cliente', keywords: ['cliente', 'proposta de valor', 'posicionamento', 'segunda area', '2a area'] },
    { key: 'experiencia', name: 'Experiencia', keywords: ['experiencia do cliente', 'jornada', 'encantamento', 'terceira area', '3a area'] },
    { key: 'marketing', name: 'Marketing', keywords: ['marketing', 'atracao', 'captacao', 'leads', 'quarta area', '4a area'] },
    { key: 'equipe', name: 'Equipe', keywords: ['equipe', 'time', 'colaborador', 'quinta area', '5a area'] },
    { key: 'gestao', name: 'Gestao', keywords: ['gestao', 'financeiro', 'planejamento', 'sexta area', '6a area'] },
    { key: 'tecnico', name: 'Tecnico', keywords: ['tecnico', 'dominio tecnico', 'especialidade', 'setima area', '7a area'] }
  ];

  // Detecta areas ja cobertas baseado nas mensagens do assistente
  readonly areasCompleted = computed(() => {
    const messages = this.chatService.messages();

    // Precisa de pelo menos 2 mensagens para comecar a contar
    if (messages.length < 2) return 0;

    // Junta todas as mensagens do assistente
    const assistantContent = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.content.toLowerCase())
      .join(' ');

    // Conta quantas areas distintas foram mencionadas
    let areasFound = 0;
    for (const area of this.diagnosticAreas) {
      const found = area.keywords.some(keyword =>
        assistantContent.includes(keyword.toLowerCase())
      );
      if (found) areasFound++;
    }

    return areasFound;
  });

  // Progresso em porcentagem
  readonly progress = computed(() => {
    return Math.min(Math.round((this.areasCompleted() / 7) * 100), 100);
  });

  // Area atual sendo avaliada
  readonly currentArea = computed(() => {
    const completed = this.areasCompleted();
    if (completed >= 7) return 'Diagnostico completo!';
    if (completed === 0) return 'Aguardando inicio';

    return `Avaliando: ${this.diagnosticAreas[Math.min(completed, 6)].name}`;
  });

  // Detecta se o diagnostico foi salvo (ferramenta save_diagnosis chamada)
  readonly isSaved = computed(() => {
    const messages = this.chatService.messages();
    if (messages.length === 0) return false;

    // Verifica apenas as ultimas 3 mensagens do assistente
    const lastAssistantMessages = messages
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content.toLowerCase())
      .join(' ');

    // Detecta frases especificas de conclusao
    return lastAssistantMessages.includes('diagnostico salvo') ||
           lastAssistantMessages.includes('seu diagnostico esta pronto') ||
           lastAssistantMessages.includes('**seu plano de acao') ||
           lastAssistantMessages.includes('cobrimos todas as areas');
  });

  // Verifica se esta gerando o diagnostico (100% mas ainda nao salvo)
  readonly isGenerating = computed(() => {
    return this.progress() >= 100 && !this.isSaved();
  });
}
