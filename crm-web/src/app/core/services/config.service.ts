import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Interface para status de um agente
 */
export interface AgentConfig {
  name: string;
  description: string;
  enabled: boolean;
  model: 'opus' | 'sonnet' | 'haiku';
  allowed_roles: string[];
  default_tools?: string[];
}

/**
 * Interface para status de uma ferramenta MCP
 */
export interface ToolConfig {
  name: string;
  full_name: string;
  description: string;
  enabled: boolean;
}

/**
 * Resumo da configuração
 */
export interface ConfigSummary {
  agents: {
    total: number;
    enabled: number;
    disabled: number;
  };
  tools: {
    total: number;
    enabled: number;
    disabled: number;
  };
}

/**
 * Configuração de LLM Provider
 */
export interface LLMConfig {
  provider: 'claude' | 'minimax' | 'openrouter';
  model: string;
  has_api_key: boolean;
  available_providers: string[];
  available_models: Record<string, string[]>;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Cache configuration
  private readonly CACHE_KEY = 'config_cache';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // Signals para estado reativo
  private readonly _agents = signal<AgentConfig[]>([]);
  private readonly _tools = signal<ToolConfig[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _llmConfig = signal<LLMConfig | null>(null);

  // Computed para estatísticas
  readonly agents = this._agents.asReadonly();
  readonly tools = this._tools.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly hasData = computed(() =>
    this._agents().length > 0 || this._tools().length > 0
  );

  readonly enabledAgentsCount = computed(() =>
    this._agents().filter(a => a.enabled).length
  );

  readonly enabledToolsCount = computed(() =>
    this._tools().filter(t => t.enabled).length
  );

  readonly llmConfig = this._llmConfig.asReadonly();

  // =====================================================
  // SEPARAÇÃO CORE vs CRM
  // =====================================================

  /**
   * Ferramentas Core (sempre disponíveis - essenciais para o sistema)
   * Prefixo: mcp__platform__
   */
  readonly coreTools = computed(() => {
    const coreToolNames = [
      'execute_sql_query',
      'save_diagnosis',
      'get_diagnosis_areas',
      'get_user_diagnosis',
      'get_user_chat_sessions',
      'get_session_user_info',
      'get_agentfs_status',
      'get_tool_call_stats',
      'get_recent_tool_calls'
    ];
    return this._tools().filter(t => coreToolNames.includes(t.name));
  });

  /**
   * Ferramentas CRM (opcionais - módulo de vendas)
   * Prefixo: mcp__crm__
   */
  readonly crmTools = computed(() => {
    return this._tools().filter(t => t.full_name.startsWith('mcp__crm__'));
  });

  /**
   * Contagem de ferramentas Core habilitadas
   */
  readonly enabledCoreToolsCount = computed(() =>
    this.coreTools().filter(t => t.enabled).length
  );

  /**
   * Contagem de ferramentas CRM habilitadas
   */
  readonly enabledCrmToolsCount = computed(() =>
    this.crmTools().filter(t => t.enabled).length
  );

  /**
   * Carrega todos os agentes
   */
  loadAgents(): Observable<AgentConfig[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<{ agents: AgentConfig[] }>(`${this.baseUrl}/api/admin/config/agents`).pipe(
      map(response => response.agents || []),
      tap({
        next: (agents) => {
          this._agents.set(agents);
          this._loading.set(false);
        },
        error: (err) => {
          this._error.set(err.message || 'Erro ao carregar agentes');
          this._loading.set(false);
        }
      })
    );
  }

  /**
   * Carrega todas as ferramentas
   */
  loadTools(): Observable<ToolConfig[]> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<{ tools: ToolConfig[] }>(`${this.baseUrl}/api/admin/config/tools`).pipe(
      map(response => response.tools || []),
      tap({
        next: (tools) => {
          this._tools.set(tools);
          this._loading.set(false);
        },
        error: (err) => {
          this._error.set(err.message || 'Erro ao carregar ferramentas');
          this._loading.set(false);
        }
      })
    );
  }

  /**
   * Carrega resumo completo com estratégia de cache
   */
  loadSummary(): Observable<{ summary: ConfigSummary; agents: AgentConfig[]; tools: ToolConfig[] }> {
    // 1. Tentar carregar do cache primeiro
    this.loadFromCache();

    // 2. Fazer fetch em background para dados frescos
    this._error.set(null);

    return this.http.get<{ summary: ConfigSummary; agents: AgentConfig[]; tools: ToolConfig[] }>(
      `${this.baseUrl}/api/admin/config/summary`
    ).pipe(
      tap({
        next: (response) => {
          this._agents.set(response.agents || []);
          this._tools.set(response.tools || []);
          this._loading.set(false);

          // 3. Salvar no cache
          this.saveToCache(response.agents, response.tools);
        },
        error: (err) => {
          this._error.set(err.message || 'Erro ao carregar configuração');
          this._loading.set(false);
        }
      })
    );
  }

  /**
   * Carrega dados do localStorage se válido
   */
  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        this._loading.set(true);
        return;
      }

      const { agents, tools, timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < this.CACHE_TTL;

      if (isValid && agents && tools) {
        this._agents.set(agents);
        this._tools.set(tools);
        this._loading.set(false); // Não precisa loading se tem cache válido
      } else {
        this._loading.set(true);
      }
    } catch (error) {
      this._loading.set(true);
    }
  }

  /**
   * Salva dados no localStorage
   */
  private saveToCache(agents: AgentConfig[], tools: ToolConfig[]): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        agents,
        tools,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Ativa/desativa um agente
   */
  toggleAgent(agentName: string, enabled: boolean): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/admin/config/agents/${agentName}/status`,
      { enabled }
    ).pipe(
      tap(() => {
        // Atualiza estado local
        this._agents.update(agents =>
          agents.map(a => a.name === agentName ? { ...a, enabled } : a)
        );
        // Atualiza cache
        this.saveToCache(this._agents(), this._tools());
      })
    );
  }

  /**
   * Altera o modelo de um agente
   */
  updateAgentModel(agentName: string, model: 'opus' | 'sonnet' | 'haiku'): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/admin/config/agents/${agentName}/model`,
      { model }
    ).pipe(
      tap(() => {
        this._agents.update(agents =>
          agents.map(a => a.name === agentName ? { ...a, model } : a)
        );
        this.saveToCache(this._agents(), this._tools());
      })
    );
  }

  /**
   * Atualiza roles de um agente
   */
  updateAgentRoles(agentName: string, roles: string[]): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/admin/config/agents/${agentName}/roles`,
      { roles }
    ).pipe(
      tap(() => {
        this._agents.update(agents =>
          agents.map(a => a.name === agentName ? { ...a, allowed_roles: roles } : a)
        );
        this.saveToCache(this._agents(), this._tools());
      })
    );
  }

  /**
   * Ativa/desativa uma ferramenta
   */
  toggleTool(toolName: string, enabled: boolean): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/admin/config/tools/${toolName}/status`,
      { enabled }
    ).pipe(
      tap(() => {
        this._tools.update(tools =>
          tools.map(t => t.name === toolName ? { ...t, enabled } : t)
        );
        this.saveToCache(this._agents(), this._tools());
      })
    );
  }

  /**
   * Atualiza múltiplos agentes de uma vez
   */
  bulkUpdateAgents(agents: Record<string, boolean>): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/admin/config/agents/bulk`,
      { agents }
    ).pipe(
      tap(() => {
        this._agents.update(currentAgents =>
          currentAgents.map(a => ({
            ...a,
            enabled: agents[a.name] ?? a.enabled
          }))
        );
        this.saveToCache(this._agents(), this._tools());
      })
    );
  }

  /**
   * Atualiza múltiplas ferramentas de uma vez
   */
  bulkUpdateTools(tools: Record<string, boolean>): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/admin/config/tools/bulk`,
      { tools }
    ).pipe(
      tap(() => {
        this._tools.update(currentTools =>
          currentTools.map(t => ({
            ...t,
            enabled: tools[t.name] ?? t.enabled
          }))
        );
        this.saveToCache(this._agents(), this._tools());
      })
    );
  }

  // =============================================================================
  // LLM PROVIDER CONFIG
  // =============================================================================

  /**
   * Carrega configuração de LLM provider
   */
  loadLLMConfig(): Observable<LLMConfig> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<{ success: boolean } & LLMConfig>(
      `${this.baseUrl}/api/config/llm`
    ).pipe(
      map(response => ({
        provider: response.provider,
        model: response.model,
        has_api_key: response.has_api_key,
        available_providers: response.available_providers,
        available_models: response.available_models
      })),
      tap({
        next: (config) => {
          this._llmConfig.set(config);
          this._loading.set(false);
        },
        error: (err) => {
          this._error.set(err.message || 'Erro ao carregar configuração LLM');
          this._loading.set(false);
        }
      })
    );
  }

  /**
   * Atualiza configuração de LLM provider
   */
  updateLLMConfig(provider: string, model: string, apiKey?: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/config/llm`,
      { provider, model, api_key: apiKey }
    ).pipe(
      tap(() => {
        this._llmConfig.update(c => c ? {
          ...c,
          provider: provider as 'claude' | 'minimax' | 'openrouter',
          model,
          has_api_key: apiKey ? true : c.has_api_key
        } : null);
      })
    );
  }

  // =============================================================================
  // USER OPENROUTER KEY
  // =============================================================================

  /**
   * Verifica se usuário tem chave OpenRouter configurada
   */
  checkUserOpenRouterKey(): Observable<{ has_openrouter_key: boolean }> {
    return this.http.get<{ success: boolean; has_openrouter_key: boolean }>(
      `${this.baseUrl}/api/users/me/openrouter-key/status`
    );
  }

  /**
   * Configura chave OpenRouter do usuário
   */
  setUserOpenRouterKey(apiKey: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/users/me/openrouter-key`,
      { api_key: apiKey }
    );
  }

  /**
   * Remove chave OpenRouter do usuário
   */
  deleteUserOpenRouterKey(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/users/me/openrouter-key`);
  }
}
