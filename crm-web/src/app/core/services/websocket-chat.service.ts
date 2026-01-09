/**
 * WebSocket Chat Service - Real-time streaming chat com Claude Agent SDK
 *
 * Inspirado em: /Users/2a/Desktop/crm/chat-simples/js/app.js
 * Backend: /Users/2a/Desktop/crm/backend-ai/routes/chat_routes.py
 *
 * Características:
 * - WebSocket streaming em tempo real
 * - RAG com busca vetorial (image + location embeddings)
 * - Indicadores de ferramentas (tool_start, tool_result)
 * - Reconexão automática com exponential backoff
 * - State management com Angular Signals
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  mapUrl?: string;
}

export interface ToolEvent {
  tool: string;
  tool_use_id: string;
  status: 'running' | 'done' | 'error';
  input?: any;
  content?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface WebSocketMessage {
  type: 'user_message_saved' | 'text_chunk' | 'thinking' | 'tool_start' | 'tool_result' | 'result' | 'error';
  conversation_id?: string;
  content?: string;
  tool?: string;
  tool_use_id?: string;
  input?: Record<string, unknown>;
  is_error?: boolean;
  cost?: number;
  duration_ms?: number;
  num_turns?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketChatService {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly location = inject(Location);

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectDelay = 1000; // Start with 1s
  private reconnectTimeout?: number;

  // Signals (state management)
  readonly messages = signal<ChatMessage[]>([]);
  readonly isConnected = signal(false);
  readonly isTyping = signal(false);
  readonly activeTools = signal<Map<string, ToolEvent>>(new Map());
  readonly conversationId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly thinkingContent = signal<string>(''); // Debug: conteúdo do thinking

  // Histórico de sessões
  readonly sessions = signal<ChatSession[]>([]);
  readonly isLoadingSessions = signal(false);
  readonly showHistory = signal(false);

  // Target user (para admin visualizar chat de outro usuário)
  readonly targetUserId = signal<number | null>(null);

  // Base path para URLs (chat ou diagnostico)
  readonly basePath = signal<'chat' | 'diagnostico'>('chat');

  // Admin mode - usa /admin/chat em vez de /{userId}/chat
  readonly adminMode = signal(false);

  /**
   * Conectar ao WebSocket do backend
   */
  connect(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.error('[WebSocketChat] No token available');
      this.error.set('Não autenticado. Faça login novamente.');
      return;
    }

    // WebSocket URL com token como query param
    const wsProtocol = environment.apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = environment.apiUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/chat/ws?token=${token}`;

    console.log('[WebSocketChat] Connecting to:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebSocketChat] Connected');
      this.isConnected.set(true);
      this.error.set(null);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Limpar timeout de reconexão se houver
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('[WebSocketChat] Error parsing message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocketChat] WebSocket error:', error);
      this.error.set('Erro de conexão com o servidor');
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocketChat] Closed:', event.code, event.reason);
      this.isConnected.set(false);
      this.isTyping.set(false);

      // Não reconectar se foi fechamento normal (código 1000) ou unauthorized (4001)
      if (event.code === 1000 || event.code === 4001) {
        console.log('[WebSocketChat] Connection closed normally or unauthorized');
        if (event.code === 4001) {
          this.error.set('Sessão expirada. Faça login novamente.');
        }
        return;
      }

      // Tentar reconectar
      this.attemptReconnect();
    };
  }

  /**
   * Tentar reconexão com exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocketChat] Max reconnect attempts reached');
      this.error.set('Não foi possível reconectar. Atualize a página.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocketChat] Reconnecting... attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff: 1s, 2s, 4s, 8s, 15s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15000);
  }

  /**
   * Handler para mensagens do WebSocket
   */
  private handleMessage(data: WebSocketMessage): void {
    console.log('[WebSocketChat] Message:', data.type, data);

    switch (data.type) {
      case 'user_message_saved':
        this.conversationId.set(data.conversation_id ?? null);
        this.isTyping.set(true);
        this.error.set(null);
        // Atualizar URL com conversation_id (sem recarregar a página)
        if (data.conversation_id) {
          if (this.adminMode()) {
            this.location.replaceState(`/admin/chat/${data.conversation_id}`);
          } else {
            const userId = this.authService.user()?.user_id;
            if (userId) {
              this.location.replaceState(`/${userId}/${this.basePath()}/${data.conversation_id}`);
            }
          }
        }
        break;

      case 'text_chunk': {
        // Append to last assistant message or create new
        const content = data.content ?? '';
        const msgs = this.messages();
        const lastMsg = msgs[msgs.length - 1];

        if (lastMsg && lastMsg.role === 'assistant') {
          // Atualizar ultima mensagem
          lastMsg.content += content;
          this.messages.set([...msgs]);
        } else {
          // Criar nova mensagem do assistente
          this.messages.update(m => [...m, {
            role: 'assistant' as const,
            content: content,
            timestamp: new Date()
          }]);
        }
        break;
      }

      case 'thinking':
        // Optionally show in debug panel
        this.thinkingContent.update(t => t + (data.content ?? ''));
        console.log('[WebSocketChat] Thinking:', data.content);
        break;

      case 'tool_start': {
        const toolUseId = data.tool_use_id ?? '';
        const toolName = data.tool ?? 'unknown';
        this.activeTools.update(tools => {
          const newTools = new Map(tools);
          newTools.set(toolUseId, {
            tool: toolName,
            tool_use_id: toolUseId,
            status: 'running',
            input: data.input,
            startTime: new Date()
          });
          return newTools;
        });
        break;
      }

      case 'tool_result': {
        const toolUseId = data.tool_use_id ?? '';
        this.activeTools.update(tools => {
          const newTools = new Map(tools);
          const tool = newTools.get(toolUseId);
          if (tool) {
            tool.status = data.is_error ? 'error' : 'done';
            tool.content = data.content;
            tool.endTime = new Date();
            newTools.set(toolUseId, tool);

            // Auto-remove after 5s (aumentado de 3s para dar tempo de ler)
            setTimeout(() => {
              this.activeTools.update(t => {
                const updated = new Map(t);
                updated.delete(toolUseId);
                return updated;
              });
            }, 5000);
          }
          return newTools;
        });
        break;
      }

      case 'result':
        this.isTyping.set(false);
        console.log('[WebSocketChat] Conversation complete:', {
          cost: data.cost,
          duration_ms: data.duration_ms,
          num_turns: data.num_turns
        });

        // Limpar thinking content
        this.thinkingContent.set('');

        // Limpar todas as ferramentas ativas quando a resposta terminar
        this.activeTools.set(new Map());
        break;

      case 'error':
        this.isTyping.set(false);
        this.error.set(data.error || 'Erro desconhecido');
        console.error('[WebSocketChat] Error:', data.error);

        // Limpar ferramentas em caso de erro
        this.activeTools.set(new Map());

        // Remover última mensagem do usuário em caso de erro
        this.messages.update(msgs => {
          const filtered = msgs.filter(m => m.role !== 'user' || msgs.indexOf(m) !== msgs.length - 1);
          return filtered;
        });
        break;
    }
  }

  /**
   * Enviar mensagem
   */
  sendMessage(content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocketChat] WebSocket not connected');
      this.error.set('Não conectado. Tentando reconectar...');
      this.connect();
      return;
    }

    if (!content.trim()) {
      return;
    }

    // Add user message locally
    this.messages.update(m => [...m, {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }]);

    // Send to server
    const payload = {
      message: content.trim(),
      conversation_id: this.conversationId(),
      mode: this.basePath()  // 'chat' ou 'diagnostico'
    };

    console.log('[WebSocketChat] Sending message:', payload);
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Limpar chat (manter conversação no servidor)
   */
  clearChat(): void {
    this.messages.set([]);
    this.conversationId.set(null);
    this.activeTools.set(new Map());
    this.thinkingContent.set('');
    this.error.set(null);
  }

  /**
   * Nova sessão (limpa local + força nova sessão no servidor)
   */
  newSession(): void {
    this.clearChat();
    // Limpar URL para /userId/basePath ou /admin/chat
    if (this.adminMode()) {
      this.location.replaceState('/admin/chat');
    } else {
      const userId = this.authService.user()?.user_id;
      if (userId) {
        this.location.replaceState(`/${userId}/${this.basePath()}`);
      }
    }
  }

  /**
   * Limpar sessões carregadas (usado quando muda de contexto chat/diagnóstico)
   */
  clearSessions(): void {
    this.sessions.set([]);
    this.showHistory.set(false);
  }

  /**
   * Desconectar WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      console.log('[WebSocketChat] Disconnecting...');
      this.ws.close(1000, 'User disconnected'); // 1000 = normal closure
      this.ws = null;
    }

    this.isConnected.set(false);
    this.isTyping.set(false);
  }

  /**
   * Ícones para ferramentas (UI helper)
   */
  getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
      // Database
      'mcp__nanda__execute_sql_query': '💾',
      'mcp__nanda-crm__execute_query': '💾',
      'mcp__nanda-crm__execute_read_only_query': '🔍',
      'execute_sql_query': '💾',

      // Lead Management
      'mcp__nanda-crm__get_lead_state': '📊',
      'mcp__nanda-crm__update_lead_state': '✏️',
      'mcp__nanda-crm__list_leads_by_state': '📋',
      'mcp__nanda-crm__log_lead_event': '📝',
      'mcp__nanda-crm__get_lead_events': '📜',
      'mcp__nanda-crm__get_lead_by_email': '📧',
      'mcp__nanda-crm__get_lead_full_context': '🎯',
      'mcp__nanda-crm__capture_lead_from_elementor': '🎨',
      'mcp__nanda-crm__capture_lead_from_typeform': '📝',

      // Tasks
      'mcp__nanda-crm__create_task': '📌',
      'mcp__nanda-crm__complete_task': '✅',
      'mcp__nanda-crm__list_tasks': '📝',

      // Meetings
      'mcp__nanda-crm__schedule_meeting': '📅',
      'mcp__nanda-crm__update_meeting_status': '🔄',
      'mcp__nanda-crm__list_meetings': '📆',

      // Products & Orders
      'mcp__nanda-crm__list_products': '🛍️',
      'mcp__nanda-crm__create_product': '➕',
      'mcp__nanda-crm__create_order': '💰',
      'mcp__nanda-crm__update_order_status': '📦',
      'mcp__nanda-crm__list_orders': '🛒',

      // Followups
      'mcp__nanda-crm__create_followup': '📞',
      'mcp__nanda-crm__complete_followup': '✔️',
      'mcp__nanda-crm__list_followups': '📱',
      'mcp__nanda-crm__send_followup': '📤',

      // Diagnosis
      'mcp__nanda-crm__save_diagnosis_human': '🏥',
      'mcp__nanda-crm__get_diagnosis_human': '🔬',
      'mcp__nanda-crm__list_diagnoses_by_route': '🗺️',
      'mcp__nanda__save_diagnosis': '📝',
      'mcp__nanda__get_diagnosis_areas': '📊',
      'mcp__nanda__get_user_diagnosis': '🔍',
      'save_diagnosis': '📝',
      'get_diagnosis_areas': '📊',
      'get_user_diagnosis': '🔍',

      // AI Intelligence
      'mcp__nanda-crm__update_lead_intelligence': '🤖',
      'mcp__nanda-crm__generate_lead_briefing': '📋',
      'mcp__nanda-crm__analyze_diagnosis_and_suggest_route': '🧭',
      'mcp__nanda-crm__generate_call_hints': '💡',
      'mcp__nanda-crm__generate_followup_message': '✍️',

      // Dashboard & Reports
      'mcp__nanda-crm__get_crm_dashboard': '📊',

      // Chat
      'mcp__nanda__get_user_chat_sessions': '💬',
      'mcp__nanda__get_session_user_info': '👤',

      // Other
      'mcp__nanda__search_similar_waste_images': '🔍',
      'mcp__nanda__search_reports_by_location': '📍',
    };
    return icons[toolName] || '🔧';
  }

  /**
   * Calcula tempo decorrido em ms
   */
  getToolDuration(tool: ToolEvent): number | null {
    if (!tool.startTime) return null;
    const endTime = tool.endTime || new Date();
    return endTime.getTime() - tool.startTime.getTime();
  }

  /**
   * Formata duração em formato legível
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Extrai detalhes descritivos do input da ferramenta
   */
  getToolDetails(tool: ToolEvent): string {
    if (!tool.input) return 'Sem detalhes disponíveis';

    // Para queries SQL, mostrar query limpa e formatada
    if (tool.input.query) {
      const query = tool.input.query.toString()
        .trim()
        .replace(/\s+/g, ' ')  // Normalizar espaços
        .replace(/\n+/g, ' ');  // Remover quebras de linha

      // Tentar extrair informações importantes da query
      const queryUpper = query.toUpperCase();

      // SELECT
      if (queryUpper.includes('SELECT')) {
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        const whereMatch = query.match(/WHERE\s+(.{0,30})/i);

        let detail = 'SELECT';
        if (fromMatch) detail += ` FROM ${fromMatch[1]}`;
        if (whereMatch) detail += ` WHERE ${whereMatch[1]}...`;

        return detail.length > 80 ? detail.substring(0, 80) + '...' : detail;
      }

      // INSERT
      if (queryUpper.includes('INSERT')) {
        const intoMatch = query.match(/INTO\s+(\w+)/i);
        return intoMatch ? `INSERT INTO ${intoMatch[1]}` : 'INSERT';
      }

      // UPDATE
      if (queryUpper.includes('UPDATE')) {
        const tableMatch = query.match(/UPDATE\s+(\w+)/i);
        const setMatch = query.match(/SET\s+(.{0,30})/i);
        let detail = 'UPDATE';
        if (tableMatch) detail += ` ${tableMatch[1]}`;
        if (setMatch) detail += ` SET ${setMatch[1]}...`;
        return detail;
      }

      // DELETE
      if (queryUpper.includes('DELETE')) {
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        return fromMatch ? `DELETE FROM ${fromMatch[1]}` : 'DELETE';
      }

      // Fallback: mostrar primeiros 80 caracteres
      return query.length > 80 ? query.substring(0, 80) + '...' : query;
    }

    // Para operações com lead_id
    if (tool.input.lead_id) {
      return `Lead ID: ${tool.input.lead_id}`;
    }

    // Para emails
    if (tool.input.email) {
      return `Email: ${tool.input.email.toString()}`;
    }

    // Para user_id
    if (tool.input.user_id) {
      return `User ID: ${tool.input.user_id}`;
    }

    // Para session_id
    if (tool.input.session_id) {
      return `Session: ${tool.input.session_id.substring(0, 20)}...`;
    }

    // Para estados
    if (tool.input.state || tool.input.new_state) {
      return `Estado: ${tool.input.state || tool.input.new_state}`;
    }

    // Para tipos de evento/task/followup
    if (tool.input.event_type) return `Tipo: ${tool.input.event_type}`;
    if (tool.input.task_type) return `Tipo: ${tool.input.task_type}`;
    if (tool.input.followup_type) return `Tipo: ${tool.input.followup_type}`;
    if (tool.input.meeting_type) return `Tipo: ${tool.input.meeting_type}`;

    // Fallback: mostrar primeiros campos do input
    const keys = Object.keys(tool.input).slice(0, 3);
    if (keys.length > 0) {
      return keys.map(k => `${k}: ${String(tool.input[k]).substring(0, 20)}`).join(', ');
    }

    return 'Processando...';
  }

  /**
   * Nome legível da ferramenta (UI helper)
   */
  getToolDisplayName(toolName: string): string {
    const names: Record<string, string> = {
      // Database
      'mcp__nanda__execute_sql_query': 'Consultando banco de dados',
      'mcp__nanda-crm__execute_query': 'Executando query no banco',
      'mcp__nanda-crm__execute_read_only_query': 'Consultando dados',
      'execute_sql_query': 'Consultando banco de dados',

      // Lead Management
      'mcp__nanda-crm__get_lead_state': 'Verificando estado do lead',
      'mcp__nanda-crm__update_lead_state': 'Atualizando lead',
      'mcp__nanda-crm__list_leads_by_state': 'Listando leads',
      'mcp__nanda-crm__log_lead_event': 'Registrando evento',
      'mcp__nanda-crm__get_lead_events': 'Buscando histórico do lead',
      'mcp__nanda-crm__get_lead_by_email': 'Buscando lead por email',
      'mcp__nanda-crm__get_lead_full_context': 'Carregando contexto completo',
      'mcp__nanda-crm__capture_lead_from_elementor': 'Capturando lead do formulário',
      'mcp__nanda-crm__capture_lead_from_typeform': 'Capturando respostas do Typeform',

      // Tasks
      'mcp__nanda-crm__create_task': 'Criando tarefa',
      'mcp__nanda-crm__complete_task': 'Concluindo tarefa',
      'mcp__nanda-crm__list_tasks': 'Listando tarefas',

      // Meetings
      'mcp__nanda-crm__schedule_meeting': 'Agendando reunião',
      'mcp__nanda-crm__update_meeting_status': 'Atualizando status da reunião',
      'mcp__nanda-crm__list_meetings': 'Listando reuniões',

      // Products & Orders
      'mcp__nanda-crm__list_products': 'Listando produtos',
      'mcp__nanda-crm__create_product': 'Criando produto',
      'mcp__nanda-crm__create_order': 'Criando pedido',
      'mcp__nanda-crm__update_order_status': 'Atualizando pedido',
      'mcp__nanda-crm__list_orders': 'Listando pedidos',

      // Followups
      'mcp__nanda-crm__create_followup': 'Criando followup',
      'mcp__nanda-crm__complete_followup': 'Concluindo followup',
      'mcp__nanda-crm__list_followups': 'Listando followups',
      'mcp__nanda-crm__send_followup': 'Enviando followup',

      // Diagnosis
      'mcp__nanda-crm__save_diagnosis_human': 'Salvando diagnóstico humano',
      'mcp__nanda-crm__get_diagnosis_human': 'Buscando diagnóstico',
      'mcp__nanda-crm__list_diagnoses_by_route': 'Listando diagnósticos por rota',
      'mcp__nanda__save_diagnosis': 'Salvando diagnóstico',
      'mcp__nanda__get_diagnosis_areas': 'Carregando áreas de diagnóstico',
      'mcp__nanda__get_user_diagnosis': 'Buscando diagnóstico do usuário',
      'save_diagnosis': 'Salvando diagnóstico',
      'get_diagnosis_areas': 'Carregando áreas',
      'get_user_diagnosis': 'Buscando diagnóstico',

      // AI Intelligence
      'mcp__nanda-crm__update_lead_intelligence': 'Atualizando inteligência do lead',
      'mcp__nanda-crm__generate_lead_briefing': 'Gerando briefing do lead',
      'mcp__nanda-crm__analyze_diagnosis_and_suggest_route': 'Analisando diagnóstico',
      'mcp__nanda-crm__generate_call_hints': 'Gerando dicas para call',
      'mcp__nanda-crm__generate_followup_message': 'Gerando mensagem de followup',

      // Dashboard & Reports
      'mcp__nanda-crm__get_crm_dashboard': 'Carregando dashboard',

      // Chat
      'mcp__nanda__get_user_chat_sessions': 'Buscando sessões de chat',
      'mcp__nanda__get_session_user_info': 'Buscando info do usuário',

      // Other
      'mcp__nanda__search_similar_waste_images': 'Buscar imagens similares',
      'mcp__nanda__search_reports_by_location': 'Buscar por localização',
    };
    return names[toolName] || toolName.replace(/^mcp__[^_]+__/, '').replace(/_/g, ' ');
  }

  // ==================== HISTÓRICO DE SESSÕES ====================

  /**
   * Toggle do painel de histórico
   */
  toggleHistory(): void {
    this.showHistory.update(v => !v);
    if (this.showHistory() && this.sessions().length === 0) {
      this.loadSessions();
    }
  }

  /**
   * Carregar lista de sessões do usuário
   */
  loadSessions(): void {
    this.isLoadingSessions.set(true);

    // Construir URL com target_user_id se definido (admin visualizando outro usuário)
    // Usar basePath para separar sessões de chat e diagnóstico
    let url = `${environment.apiUrl}/api/${this.basePath()}/sessions`;
    const targetId = this.targetUserId();
    if (targetId) {
      url += `?target_user_id=${targetId}`;
    }

    this.http.get<{ success?: boolean; status?: string; data?: ChatSession[]; sessions?: ChatSession[] }>(url).subscribe({
      next: (response) => {
        if (response.success || response.status === 'success') {
          this.sessions.set(response.sessions || response.data || []);
        }
        this.isLoadingSessions.set(false);
      },
      error: (err) => {
        console.error('[WebSocketChat] Error loading sessions:', err);
        this.isLoadingSessions.set(false);
      }
    });
  }

  /**
   * Carregar mensagens de uma sessão específica
   */
  loadSession(sessionId: string): void {
    this.isLoadingSessions.set(true);

    this.http.get<{ success?: boolean; status?: string; messages?: any[]; data?: { session_id: string; title: string; messages: any[] } }>(
      `${environment.apiUrl}/api/chat/sessions/${sessionId}/messages`
    ).subscribe({
      next: (response) => {
        if (response.success || response.status === 'success') {
          // Suporta ambos os formatos: response.messages ou response.data.messages
          const rawMessages = response.messages || response.data?.messages || [];

          // Converter mensagens do backend para o formato do frontend
          const messages: ChatMessage[] = rawMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
            imageUrl: m.image_url,
            mapUrl: m.map_url
          }));

          this.messages.set(messages);
          this.conversationId.set(sessionId);
          this.showHistory.set(false);

          // Atualizar URL com sessionId
          if (this.adminMode()) {
            this.location.replaceState(`/admin/chat/${sessionId}`);
          } else {
            const userId = this.authService.user()?.user_id;
            if (userId) {
              this.location.replaceState(`/${userId}/${this.basePath()}/${sessionId}`);
            }
          }
        }
        this.isLoadingSessions.set(false);
      },
      error: (err) => {
        console.error('[WebSocketChat] Error loading session:', err);
        this.error.set('Erro ao carregar conversa');
        this.isLoadingSessions.set(false);
      }
    });
  }

  /**
   * Apagar uma sessão
   */
  deleteSession(sessionId: string): void {
    this.http.delete<{ success?: boolean; status?: string }>(
      `${environment.apiUrl}/api/chat/sessions/${sessionId}`
    ).subscribe({
      next: (response) => {
        if (response.success || response.status === 'success') {
          // Remover da lista local
          this.sessions.update(sessions =>
            sessions.filter(s => s.session_id !== sessionId)
          );

          // Se era a sessão atual, limpar chat
          if (this.conversationId() === sessionId) {
            this.clearChat();
          }
        }
      },
      error: (err) => {
        console.error('[WebSocketChat] Error deleting session:', err);
        this.error.set('Erro ao apagar conversa');
      }
    });
  }

  /**
   * Formatar data relativa (hoje, ontem, etc)
   */
  formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

    // Se a diferença for negativa (data no futuro por timezone), considerar como "Hoje"
    if (diffMs < 0 || diffDays === 0) {
      return `Hoje ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  }
}
