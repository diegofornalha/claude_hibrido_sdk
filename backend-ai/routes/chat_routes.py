"""
Chat Routes - WebSocket endpoint para chat com Claude Agent SDK

Inspirado em: /Users/2a/Desktop/crm/backend-chat/server.py
"""

import time
import logging
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, Header, HTTPException
from typing import Optional, Dict, List

from core.llm_provider import is_using_claude, is_hybrid_mode, needs_tools, get_llm_provider, get_configured_provider

# White Label: TenantService para prompts dinâmicos
from core.tenant_service import get_tenant_service

# AgentFS para tracking de provider usado no modo híbrido
try:
    from core.agentfs_client import get_agentfs
    AGENTFS_AVAILABLE = True
except ImportError:
    AGENTFS_AVAILABLE = False
from claude_agent_sdk import (
    ClaudeAgentOptions,
    ClaudeSDKClient,
    AssistantMessage,
    TextBlock,
    ThinkingBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
)
from claude_agent_sdk.types import HookMatcher

# DT-SDK-004: Custom Agents + Config Manager dinâmico
from core.config_manager import get_config_manager

# Armazena checkpoints de arquivos por sessão para permitir rewind
# Estrutura: {conversation_id: [{"user_message_id": str, "timestamp": float, "message": str}]}
file_checkpoints: Dict[str, List[Dict]] = {}

# Importar funções de utilidade (evitando importação circular)
from core.turso_database import get_db_connection
from core.auth import verify_token
from core.session_manager import SessionManager
from core.hooks import (
    validate_sql_query,
    stop_on_critical_error,
    audit_tool_usage,
    track_tool_start,
    # Factories com user_id via closure (isolamento por usuário)
    create_track_tool_start,
    create_audit_tool_usage,
)
from tools import platform_mcp_server

logger = logging.getLogger(__name__)


def sanitize_error_message(error: str) -> str:
    """
    Sanitiza mensagens de erro para exibição ao usuário.
    Substitui mensagens técnicas por mensagens amigáveis.
    """
    error_lower = error.lower()

    # Rate limit errors (Claude/Anthropic API)
    if "hit your limit" in error_lower or "rate limit" in error_lower:
        return "Limite de uso atingido. Contate o desenvolvedor ou altere o provedor de IA em Configurações > LLM."

    # API key errors
    if "api key" in error_lower or "authentication" in error_lower:
        return "Erro de autenticação com o provedor de IA. Verifique as configurações."

    # Timeout errors
    if "timeout" in error_lower:
        return "A requisição demorou muito. Tente novamente."

    # Connection errors
    if "connection" in error_lower or "network" in error_lower:
        return "Erro de conexão. Verifique sua internet e tente novamente."

    # Return original if no match
    return error


def build_system_prompt(
    user_id: int,
    user_role: str,
    conversation_id: str,
    agents_section: str,
    tenant_id: str = "default",
    mode: str = "chat"  # 'chat' ou 'diagnostico'
) -> str:
    """
    Constrói system prompt dinâmico usando configurações do banco (White Label).

    Args:
        user_id: ID do usuário
        user_role: Role do usuário (admin, mentorado)
        conversation_id: ID da conversa
        agents_section: Seção de agentes disponíveis
        tenant_id: ID do tenant para White Label

    Returns:
        System prompt completo
    """
    tenant_service = get_tenant_service()
    brand = tenant_service.get_brand(tenant_id)
    areas = tenant_service.get_diagnosis_areas(tenant_id)

    brand_name = brand.brand_name

    # Formatar áreas de diagnóstico
    areas_list = []
    areas_detail = []
    for i, area in enumerate(areas, 1):
        areas_list.append(f"{i}. {area.area_key} - {area.area_name}")
        areas_detail.append(f"{i}. **{area.area_key}** - {area.area_name}")

    areas_text = "\n".join(areas_list)
    areas_detail_text = "\n".join(areas_detail)

    if user_role == "admin":
        return f"""
Eu sou seu Agente, assistente com acesso ao banco de dados do sistema.

INFORMAÇÕES DO ADMIN:
- admin_user_id: {user_id}
- conversation_id: {conversation_id}

VOCÊ É ADMIN E PODE:
1. Consultar dados de qualquer mentorado via execute_sql_query
2. Fazer diagnóstico DE UM MENTORADO ESPECÍFICO (não do admin)
3. Gerenciar dados do sistema

PARA FAZER DIAGNÓSTICO DE UM MENTORADO:
1. Primeiro, o admin deve informar QUAL mentorado quer diagnosticar (por nome ou user_id)
2. Use execute_sql_query para buscar o user_id do mentorado:
   SELECT user_id, username FROM users WHERE username LIKE '%nome%' AND role = 'mentorado'
3. Conduza as perguntas sobre as {len(areas)} áreas
4. Ao final, use save_diagnosis com o user_id DO MENTORADO (não do admin!)

{len(areas)} ÁREAS DE DIAGNÓSTICO:
{areas_text}

EXEMPLO - ADMIN FAZENDO DIAGNÓSTICO DO MENTORADO "diegofornalha":
1. Admin: "Quero fazer diagnóstico do diegofornalha"
2. Eu busco: SELECT user_id FROM users WHERE username = 'diegofornalha' → user_id = 4
3. Eu faço as perguntas das {len(areas)} áreas
4. Ao final, chamo save_diagnosis com user_id=4 (do mentorado, NÃO do admin)

FERRAMENTAS:
- execute_sql_query: Consultar banco Turso/SQLite (use sintaxe SQLite!)
- save_diagnosis: Salvar diagnóstico (SEMPRE use o user_id do MENTORADO!)
- get_diagnosis_areas: Ver áreas disponíveis

COMANDOS SQLite ÚTEIS:
- Listar tabelas: SELECT name FROM sqlite_master WHERE type='table'
- Ver estrutura: PRAGMA table_info(nome_tabela)
- Ver schema: SELECT sql FROM sqlite_master WHERE name='nome_tabela'

{agents_section}

IMPORTANTE:
- Responda em português brasileiro
- Quando fizer diagnóstico, pergunte QUAL mentorado primeiro
- O user_id no save_diagnosis deve ser do MENTORADO, não do admin
- session_id sempre use: "{conversation_id}"
"""
    else:
        # Construir lista de objetivos dinâmica
        goals_text = "\n".join(f"- {goal}" for goal in brand.audience_goals)

        # Prompt base comum
        base_prompt = f"""
Eu sou seu Agente, {brand.brand_tagline}. Expert em {brand.business_context}.

INFORMAÇÕES DO USUÁRIO:
- user_id: {user_id}
- conversation_id: {conversation_id}

## REGRA CRÍTICA: APENAS UMA PERGUNTA!

⚠️ VOCÊ SÓ PODE FAZER **UMA ÚNICA PERGUNTA** POR MENSAGEM. ISSO É OBRIGATÓRIO E INVIOLÁVEL.

❌ PROIBIDO (múltiplas perguntas):
- "Quantos clientes? Qual ticket? Qual dificuldade?"
- "Como você capta leads? Usa redes sociais? Faz parcerias?"

✅ CORRETO (uma pergunta só):
- "Quantos clientes você atende por mês?"
- (espera resposta)
- "Qual seu ticket médio?"
- (espera resposta)
- "Qual sua maior dificuldade na venda?"

REGRAS DE ESTILO:
1. Máximo 2-3 linhas por mensagem
2. Sem listas numeradas longas
3. Sem emojis excessivos (máximo 1 por mensagem)
4. Tom casual de WhatsApp, não de formulário

## QUANDO O USUÁRIO PERGUNTAR SOBRE SI MESMO

Se o usuário perguntar "o que você sabe sobre mim?", "qual meu nome?", "quem sou eu?" ou similar:
1. PRIMEIRO use get_session_user_info com session_id="{conversation_id}"
2. DEPOIS responda com os dados encontrados

## FERRAMENTAS DISPONÍVEIS

1. **get_session_user_info**: Buscar dados do usuário (nome, email, profissão)
   - USE IMEDIATAMENTE quando perguntarem sobre dados pessoais
   - Chame: get_session_user_info({{"session_id": "{conversation_id}"}})

2. **get_user_diagnosis**: Buscar diagnóstico anterior
   - USE quando perguntarem sobre diagnóstico passado, pontos fortes/fracos
   - Chame: get_user_diagnosis({{"user_id": {user_id}}})

3. **save_diagnosis**: Salvar diagnóstico ao final
   - USE após avaliar TODAS as {len(areas)} áreas

4. **update_user_profile**: Atualizar dados do usuário
   - USE quando pedirem para mudar nome, email, profissão, telefone
   - Chame: update_user_profile({{"session_id": "{conversation_id}", "field": "nome", "value": "Novo Nome"}})

## FLUXO DO DIAGNÓSTICO (UMA PERGUNTA POR VEZ!)

As {len(areas)} áreas são:
{areas_detail_text}

**Como conduzir:**
1. Pergunte sobre UMA área por vez
2. Espere a resposta
3. Dê uma nota mental de 0-10 para aquele aspecto
4. Faça a próxima pergunta
5. Ao final, use save_diagnosis com todos os scores

**Exemplo de conversa:**
- Agente: "Vamos começar pelo Flywheel. Como você atrai novos clientes hoje?"
- Usuário: [responde]
- Agente: "Entendi! E depois que atrai, como você converte esses leads em clientes?"
- Usuário: [responde]
- ... continua uma pergunta por vez ...

## QUANDO CONCLUIR O DIAGNÓSTICO

⚠️ IMPORTANTE: Após cobrir TODAS as {len(areas)} áreas, você DEVE:

1. AVISAR: "Cobrimos todas as áreas! Vou salvar seu diagnóstico..."
2. CHAMAR save_diagnosis IMEDIATAMENTE com:
   - user_id: {user_id}
   - session_id: "{conversation_id}"
   - area_scores: JSON com {len(areas)} áreas e suas notas (0-100 cada)
   - overall_score: Média geral (0-100)
   - profile_type: "iniciante" (<40) | "intermediario" (40-70) | "avancado" (>70)
   - strongest_area: área com maior nota
   - weakest_area: área com menor nota
   - main_insights: 3-5 descobertas principais
   - action_plan: 3 ações prioritárias

3. APRESENTAR RESULTADO resumido:
   - Nota geral (ex: "Sua nota geral foi 65/100")
   - Ponto mais forte
   - Ponto mais fraco

4. APRESENTAR PLANO DE AÇÃO com 3 ações prioritárias:
   "📋 **Seu Plano de Ação:**
   1. [Ação prioritária 1 - relacionada ao ponto fraco]
   2. [Ação prioritária 2]
   3. [Ação prioritária 3]"

5. CONFIRMAR: "Diagnóstico salvo! Quer que eu detalhe alguma dessas ações?"

NÃO ESQUEÇA DE SALVAR E APRESENTAR O PLANO! Se já cobriu todas as áreas, FAÇA ISSO AGORA.

{agents_section}

## ESTILO DE COMUNICAÇÃO

- Português brasileiro
- Direto e objetivo
- UMA pergunta por vez (isso é crítico!)
- Empático mas focado em resultados
- Após salvar diagnóstico, informe que está disponível no painel

## SUGESTÕES DE RESPOSTA

SEMPRE termine sua pergunta com sugestões clicáveis. Use EXATAMENTE este formato:

[Sua pergunta curta]

💡 **Sugestões:**
- opção curta 1
- opção curta 2
- opção curta 3

EXEMPLO CORRETO:
"Quantos clientes você atende por mês?

💡 **Sugestões:**
- Menos de 10
- Entre 10 e 30
- Mais de 30"

REGRAS DAS SUGESTÕES:
- Máximo 3 opções
- Cada opção com máximo 5 palavras
- Baseadas no contexto da conversa
"""

        # Modo CHAT: prompt mais simples, sem fluxo de diagnóstico
        if mode == "chat":
            return f"""
Eu sou seu Agente, {brand.brand_tagline}. Expert em {brand.business_context}.

INFORMAÇÕES DO USUÁRIO:
- user_id: {user_id}
- conversation_id: {conversation_id}

## MODO: CHAT LIVRE

Este é um chat livre para conversar, tirar dúvidas e consultar informações.
NÃO inicie um diagnóstico automaticamente. Só faça diagnóstico se o usuário pedir explicitamente.

## QUANDO O USUÁRIO PERGUNTAR SOBRE SI MESMO

Se o usuário perguntar "o que você sabe sobre mim?", "qual meu nome?", "quem sou eu?" ou similar:
1. PRIMEIRO use get_session_user_info com session_id="{conversation_id}"
2. DEPOIS responda com os dados encontrados

## FERRAMENTAS DISPONÍVEIS

1. **get_session_user_info**: Buscar dados do usuário (nome, email, profissão)
   - USE IMEDIATAMENTE quando perguntarem sobre dados pessoais
   - Chame: get_session_user_info({{"session_id": "{conversation_id}"}})

2. **get_user_diagnosis**: Buscar diagnóstico anterior
   - USE quando perguntarem sobre diagnóstico passado, pontos fortes/fracos
   - Chame: get_user_diagnosis({{"user_id": {user_id}}})

3. **update_user_profile**: Atualizar dados do usuário
   - USE quando pedirem para mudar nome, email, profissão, telefone
   - Chame: update_user_profile({{"session_id": "{conversation_id}", "field": "nome", "value": "Novo Nome"}})

{agents_section}

## ESTILO DE COMUNICAÇÃO

- Português brasileiro
- Direto e objetivo
- Empático e prestativo
- Se o usuário quiser fazer diagnóstico, sugira ir para a página de diagnóstico

## SUGESTÕES DE RESPOSTA

Termine suas respostas com sugestões úteis quando apropriado:

💡 **Sugestões:**
- opção 1
- opção 2
- opção 3
"""

        # Modo DIAGNÓSTICO: prompt completo com fluxo de diagnóstico
        return base_prompt


# DT-SDK-005: Callback para processar stderr do CLI do Claude
async def stderr_handler(line: str):
    """Processa linhas de stderr do CLI para debug e monitoramento"""
    # Ignorar linhas vazias
    if not line.strip():
        return

    # Classificar por nível de severidade
    line_lower = line.lower()
    if "error" in line_lower or "failed" in line_lower:
        logger.error(f"[Claude CLI stderr] {line}")
    elif "warning" in line_lower or "warn" in line_lower:
        logger.warning(f"[Claude CLI stderr] {line}")
    else:
        logger.debug(f"[Claude CLI stderr] {line}")


def get_user_role(user_id: int) -> str:
    """
    Retorna o role efetivo do usuário considerando hierarquia.

    Usa get_effective_role que verifica:
    - role na tabela users ("admin" ou "mentorado")
    - admin_level (se definido, considera como admin)
    """
    from core.auth import get_effective_role
    return get_effective_role(user_id)


async def get_user_from_token(authorization: Optional[str] = Header(None)) -> int:
    """Extract user ID from JWT token in Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Remove "Bearer " prefix if present
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization

    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_id


router = APIRouter(prefix="/api/chat", tags=["chat-v2"])

# Inicializar managers
session_manager = SessionManager(get_db_connection)


@router.websocket("/ws")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(...)  # JWT via query param ?token=...
):
    """
    WebSocket endpoint para chat streaming com Agent SDK + RAG

    Expected message format:
    {
        "message": "string",
        "conversation_id": "string|null"
    }

    Response formats:
    - {"type": "user_message_saved", "conversation_id": "..."}
    - {"type": "text_chunk", "content": "..."}
    - {"type": "thinking", "content": "..."}
    - {"type": "tool_start", "tool": "...", "tool_use_id": "...", "input": {...}}
    - {"type": "tool_result", "tool_use_id": "...", "content": "..."}
    - {"type": "result", "content": "...", "cost": 0.01, "duration_ms": 1234, "num_turns": 3}
    - {"type": "error", "error": "..."}
    """

    # Autenticar JWT
    user_id = verify_token(token)  # Retorna user_id diretamente (int ou None)
    if not user_id:
        logger.error("Authentication failed: Invalid or expired token")
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for user {user_id}")

    # Cliente ativo para permitir rewind dentro da mesma sessão
    active_client: Optional[ClaudeSDKClient] = None
    current_conversation_id: Optional[str] = None

    try:
        while True:
            # Receber mensagem
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")  # Tipo padrão é mensagem normal
            message = data.get("message", "")
            conversation_id = data.get("conversation_id")
            chat_mode = data.get("mode", "chat")  # 'chat' ou 'diagnostico'

            # Handler para comando de rewind
            if msg_type == "rewind_files":
                checkpoint_id = data.get("checkpoint_id")
                target_conversation = data.get("conversation_id", current_conversation_id)

                if not target_conversation or target_conversation not in file_checkpoints:
                    await websocket.send_json({
                        "type": "rewind_error",
                        "error": "Nenhum checkpoint disponível para esta sessão"
                    })
                    continue

                checkpoints = file_checkpoints[target_conversation]
                if not checkpoints:
                    await websocket.send_json({
                        "type": "rewind_error",
                        "error": "Nenhum checkpoint disponível"
                    })
                    continue

                # Se não especificou checkpoint_id, usa o mais recente
                if not checkpoint_id and checkpoints:
                    checkpoint_id = checkpoints[-1]["user_message_id"]

                # Buscar checkpoint específico
                checkpoint = next((c for c in checkpoints if c["user_message_id"] == checkpoint_id), None)

                if not checkpoint:
                    await websocket.send_json({
                        "type": "rewind_error",
                        "error": f"Checkpoint '{checkpoint_id}' não encontrado"
                    })
                    continue

                # Se temos um cliente ativo, tentar fazer rewind
                if active_client:
                    try:
                        await active_client.rewind_files(checkpoint_id)
                        await websocket.send_json({
                            "type": "rewind_success",
                            "checkpoint_id": checkpoint_id,
                            "message": f"Arquivos revertidos para checkpoint: {checkpoint['message'][:50]}..."
                        })
                        logger.info(f"Files rewound to checkpoint {checkpoint_id} for user {user_id}")
                    except Exception as rewind_error:
                        await websocket.send_json({
                            "type": "rewind_error",
                            "error": f"Erro ao reverter: {str(rewind_error)}"
                        })
                else:
                    await websocket.send_json({
                        "type": "rewind_error",
                        "error": "Nenhuma sessão ativa. Envie uma mensagem primeiro."
                    })
                continue

            # Handler para listar checkpoints
            if msg_type == "list_checkpoints":
                target_conversation = data.get("conversation_id", current_conversation_id)
                checkpoints = file_checkpoints.get(target_conversation, [])

                await websocket.send_json({
                    "type": "checkpoints_list",
                    "conversation_id": target_conversation,
                    "checkpoints": [
                        {
                            "id": c["user_message_id"],
                            "timestamp": c["timestamp"],
                            "message_preview": c["message"][:100] + "..." if len(c["message"]) > 100 else c["message"]
                        }
                        for c in checkpoints
                    ]
                })
                continue

            # Mensagem normal de chat
            if not message.strip():
                await websocket.send_json({
                    "type": "error",
                    "error": "Empty message"
                })
                continue

            # Criar ou reutilizar sessão
            if not conversation_id:
                conversation_id = await session_manager.create_session(user_id)

            # Atualizar conversation_id atual para comandos de rewind
            current_conversation_id = conversation_id

            # Inicializar lista de checkpoints para esta conversa se não existir
            if conversation_id not in file_checkpoints:
                file_checkpoints[conversation_id] = []

            # Salvar mensagem do usuário
            await session_manager.save_message(
                conversation_id,
                user_id,
                "user",
                message
            )

            # Confirmar save
            await websocket.send_json({
                "type": "user_message_saved",
                "conversation_id": conversation_id
            })

            # Buscar histórico da conversa para contexto
            history = await session_manager.get_session_history(conversation_id, limit=50)

            # Formatar histórico para o Claude (exceto a última mensagem que acabou de ser salva)
            history_text = ""
            if len(history) > 1:  # Se há mensagens anteriores
                history_text = "\n\n--- HISTÓRICO DA CONVERSA ---\n"
                for msg in history[:-1]:  # Todas exceto a última (que é a mensagem atual)
                    role_label = "MENTORADO" if msg["role"] == "user" else "NANDA"
                    history_text += f"\n{role_label}: {msg['content']}\n"
                history_text += "\n--- FIM DO HISTÓRICO ---\n\n"

            # Mensagem atual com contexto do histórico
            message_with_context = history_text + f"MENTORADO: {message}" if history_text else message

            # Processar com Claude Agent SDK
            full_content = ""
            thinking_content = ""
            tool_names = {}
            start_time = time.time()
            num_turns = 0

            # Detectar role do usuário para prompt diferente
            user_role = get_user_role(user_id)
            is_admin = user_role == 'admin'

            # Obter ConfigManager para carregar config dinâmica (ANTES do system_prompt)
            config_mgr = get_config_manager()

            # Obter agentes habilitados para construir o system prompt dinamicamente
            if config_mgr:
                enabled_agents = config_mgr.get_enabled_agents(user_role)
            else:
                enabled_agents = {}

            # Construir seção de agentes dinamicamente
            if enabled_agents:
                agents_lines = ["AGENTES ESPECIALIZADOS DISPONÍVEIS:",
                               "Você pode delegar tarefas para estes agentes quando apropriado:"]
                for name, agent in enabled_agents.items():
                    agents_lines.append(f"- {name}: {agent.description}")
                agents_lines.append("")
                agents_lines.append('Para usar um agente, mencione-o no seu raciocínio. Exemplo:')
                agents_lines.append('"Vou usar o sql-analyst para analisar os dados..."')
                agents_section = "\n".join(agents_lines)
            else:
                agents_section = "NOTA: Nenhum agente especializado está habilitado no momento."

            # White Label: System prompt dinâmico via TenantService
            system_prompt = build_system_prompt(
                user_id=user_id,
                user_role=user_role,
                conversation_id=conversation_id,
                agents_section=agents_section,
                tenant_id="default",  # TODO: Obter tenant_id do usuário quando multi-tenant
                mode=chat_mode  # 'chat' ou 'diagnostico'
            )

            # Definir ferramentas baseado no role (via ConfigManager)
            if config_mgr:
                allowed_tools = config_mgr.get_enabled_tools(user_role)
            else:
                # Fallback se ConfigManager não inicializado
                if is_admin:
                    allowed_tools = [
                        "mcp__platform__execute_sql_query",
                        "mcp__platform__save_diagnosis",
                        "mcp__platform__get_diagnosis_areas",
                        "mcp__platform__get_user_diagnosis",
                        "mcp__platform__get_user_chat_sessions",
                        "mcp__platform__get_session_user_info",
                        # AgentFS tools (auditoria)
                        "mcp__platform__get_agentfs_status",
                        "mcp__platform__get_tool_call_stats",
                        "mcp__platform__get_recent_tool_calls",
                    ]
                else:
                    allowed_tools = [
                        "mcp__platform__save_diagnosis",
                        "mcp__platform__get_diagnosis_areas",
                        "mcp__platform__get_user_diagnosis",
                        "mcp__platform__get_session_user_info",
                        "mcp__platform__update_user_profile",
                    ]

            # Criar hooks com user_id via closure (isolamento por usuário no AgentFS)
            # Isso garante que tool_calls vão para .agentfs/user-{user_id}.db
            user_track_start = create_track_tool_start(user_id)
            user_audit_usage = create_audit_tool_usage(user_id)

            # Configurar hooks baseado no role (simplificado)
            if is_admin:
                # Hooks para admin incluem validação de SQL + tracking AgentFS
                hooks_config = {
                    "PreToolUse": [
                        # Tracking de todas as tools no AgentFS (auditoria por usuário)
                        HookMatcher(matcher=None, hooks=[user_track_start]),
                        # Validação SQL específica
                        HookMatcher(
                            matcher="mcp__platform__execute_sql_query",
                            hooks=[validate_sql_query]
                        ),
                    ],
                    "PostToolUse": [
                        HookMatcher(matcher=None, hooks=[stop_on_critical_error]),
                        HookMatcher(matcher=None, hooks=[user_audit_usage]),
                    ],
                }
            else:
                # Hooks para mentorado (sem SQL) + tracking AgentFS
                hooks_config = {
                    "PreToolUse": [
                        # Tracking de todas as tools no AgentFS (auditoria por usuário)
                        HookMatcher(matcher=None, hooks=[user_track_start]),
                    ],
                    "PostToolUse": [
                        HookMatcher(matcher=None, hooks=[stop_on_critical_error]),
                        HookMatcher(matcher=None, hooks=[user_audit_usage]),
                    ],
                }

            logger.info(f"User {user_id} (role={user_role}): allowed_tools={allowed_tools}")

            # DT-SDK-004: Usar agentes já carregados (enabled_agents)
            custom_agents = enabled_agents
            agent_names = list(custom_agents.keys())
            logger.info(f"User {user_id} (role={user_role}): custom_agents={agent_names}")

            # Definir setting sources baseado no role
            if is_admin:
                setting_sources = ["user", "project"]  # Admin pode usar configs do projeto
            else:
                setting_sources = []  # Mentorado: ZERO configs externas = máxima segurança

            # Configurar opções do Agent
            options = ClaudeAgentOptions(
                model="claude-sonnet-4-5",
                max_turns=50,  # Aumentado de 15 para 50 para permitir mais interações
                max_thinking_tokens=16000,  # Aumentado de 4096 para 16000 para respostas complexas
                permission_mode="bypassPermissions",
                system_prompt=system_prompt,
                mcp_servers={"platform": platform_mcp_server},
                allowed_tools=allowed_tools,
                enable_file_checkpointing=True,  # Permite reverter alterações de arquivos
                hooks=hooks_config,
                agents=custom_agents,  # DT-SDK-004: Custom Agents
                setting_sources=setting_sources,  # Isolamento por role
            )

            # Verificar se está usando Claude ou outro provider
            using_claude = is_using_claude()
            hybrid_mode = is_hybrid_mode()

            # No modo híbrido, verificar necessidade de tools considerando contexto
            use_tools = False
            if hybrid_mode:
                # Verificar mensagem atual
                use_tools = needs_tools(message)

                # Se não detectou na mensagem atual, verificar contexto das últimas mensagens
                # Isso captura casos como: "editar telefone" -> "21999887766"
                if not use_tools and len(history) > 0:
                    # Verificar últimas 3 mensagens do histórico
                    recent_messages = history[-3:] if len(history) > 3 else history
                    for msg in recent_messages:
                        if needs_tools(msg.get("content", "")):
                            use_tools = True
                            logger.info(f"Detected tool need from conversation context: {msg.get('content', '')[:50]}...")
                            break

            logger.info(f"Provider check: using_claude={using_claude}, hybrid={hybrid_mode}, needs_tools={use_tools}")

            # Track no AgentFS qual provider foi escolhido (para analytics)
            # NOTA: Usa user_id para isolamento por usuário (.agentfs/user-{id}.db)
            if AGENTFS_AVAILABLE and hybrid_mode:
                try:
                    agentfs = await get_agentfs(user_id=user_id)
                    await agentfs.kv_set(f"hybrid:decision:{conversation_id}:{int(time.time())}", {
                        "message_preview": message[:100],
                        "needs_tools": use_tools,
                        "provider_chosen": "claude" if use_tools else "minimax",
                        "timestamp": time.time()
                    })
                except Exception as e:
                    logger.warning(f"AgentFS tracking failed: {e}")

            # Lógica de decisão:
            # - Claude puro: sempre usa ClaudeSDKClient
            # - Híbrido + precisa de tools: usa ClaudeSDKClient
            # - Híbrido + modo diagnóstico: SEMPRE usa ClaudeSDKClient (diagnóstico precisa salvar)
            # - Híbrido + não precisa de tools: usa MiniMax (rápido)
            # - MiniMax/OpenRouter puro: usa provider alternativo
            is_diagnostico_mode = chat_mode == "diagnostico"
            should_use_claude = using_claude or (hybrid_mode and use_tools) or (hybrid_mode and is_diagnostico_mode)

            if is_diagnostico_mode and hybrid_mode:
                logger.info("Diagnostic mode: forcing Claude for tool support")

            # Se NÃO for Claude (nem híbrido com tools), usar provider alternativo (MiniMax/OpenRouter)
            if not should_use_claude:
                try:
                    provider = get_llm_provider()
                    if provider is None:
                        logger.error("Non-Claude provider selected but get_llm_provider() returned None")
                        await websocket.send_json({
                            "type": "error",
                            "error": "Provider não configurado corretamente. Verifique a API key."
                        })
                        continue

                    provider_name, model_name, _ = get_configured_provider()
                    logger.info(f"Using alternative provider: {provider_name} / {model_name}")

                    # Preparar mensagens para o provider
                    provider_messages = []
                    if len(history) > 1:
                        for msg in history[:-1]:
                            provider_messages.append({
                                "role": msg["role"] if msg["role"] != "assistant" else "assistant",
                                "content": msg["content"]
                            })
                    provider_messages.append({
                        "role": "user",
                        "content": message
                    })

                    # Gerar resposta em streaming (async)
                    full_content = ""
                    start_time = time.time()

                    try:
                        async for chunk in provider.generate_stream(
                            messages=provider_messages,
                            system_prompt=system_prompt
                        ):
                            # Sanitizar chunk para esconder mensagens técnicas de erro
                            sanitized_chunk = sanitize_error_message(chunk)
                            full_content += sanitized_chunk
                            await websocket.send_json({
                                "type": "text_chunk",
                                "content": sanitized_chunk
                            })
                    except Exception as stream_error:
                        logger.warning(f"Provider {provider_name} failed: {stream_error}, falling back to Claude")
                        # Fallback para Claude - não continua, deixa o código abaixo usar Claude
                        should_use_claude = True
                        full_content = ""  # Reset para não salvar conteúdo parcial

                    # Se não fez fallback, continuar com salvamento e resultado
                    if not should_use_claude and full_content:
                        duration_ms = int((time.time() - start_time) * 1000)

                        # Salvar mensagem no banco
                        try:
                            await session_manager.save_message(
                                conversation_id,
                                user_id,
                                "assistant",
                                full_content
                            )
                            logger.info(f"Assistant message saved to DB for session {conversation_id}")
                        except Exception as save_error:
                            logger.error(f"Failed to save assistant message: {save_error}")

                        # Enviar resultado final
                        await websocket.send_json({
                            "type": "result",
                            "content": full_content,
                            "thinking": "",
                            "cost": 0.0,  # Providers alternativos não reportam custo aqui
                            "duration_ms": duration_ms,
                            "num_turns": 1,
                            "is_error": False,
                            "provider": provider_name,
                            "model": model_name
                        })

                        logger.info(f"Chat completed via {provider_name} for user {user_id}: {duration_ms}ms")
                        continue  # Continuar loop para próxima mensagem
                    # Se should_use_claude = True, continua para usar Claude abaixo

                except Exception as provider_error:
                    logger.warning(f"Alternative provider error: {provider_error}, falling back to Claude")
                    should_use_claude = True
                    # Continua para usar Claude abaixo

            # Stream resposta usando Claude Agent SDK (provider = claude)
            try:
                async with ClaudeSDKClient(options=options) as client:
                    # Guardar referência ao cliente ativo para permitir rewind
                    active_client = client

                    # Gerar ID único para este checkpoint (baseado na mensagem do usuário)
                    checkpoint_id = str(uuid.uuid4())

                    # Criar checkpoint ANTES de processar (para poder reverter se algo der errado)
                    file_checkpoints[conversation_id].append({
                        "user_message_id": checkpoint_id,
                        "timestamp": time.time(),
                        "message": message[:200]  # Preview da mensagem
                    })

                    # Limitar a 20 checkpoints por conversa (remover mais antigos)
                    if len(file_checkpoints[conversation_id]) > 20:
                        file_checkpoints[conversation_id] = file_checkpoints[conversation_id][-20:]

                    # Enviar informação do checkpoint ao cliente
                    try:
                        await websocket.send_json({
                            "type": "checkpoint_created",
                            "checkpoint_id": checkpoint_id,
                            "message": "Checkpoint criado. Você pode reverter alterações de arquivos se necessário."
                        })
                    except Exception:
                        pass

                    await client.query(message_with_context)

                    # Contador para heartbeat (enviar a cada 20 mensagens para manter conexão viva)
                    heartbeat_counter = 0
                    last_heartbeat_time = time.time()

                    async for msg in client.receive_response():
                        num_turns += 1

                        # Heartbeat: enviar ping a cada 15 segundos para manter conexão viva
                        heartbeat_counter += 1
                        current_time = time.time()
                        if current_time - last_heartbeat_time > 15:
                            try:
                                await websocket.send_json({
                                    "type": "heartbeat",
                                    "timestamp": current_time
                                })
                                last_heartbeat_time = current_time
                            except Exception:
                                pass  # Cliente desconectou

                        if isinstance(msg, AssistantMessage):
                            for block in msg.content:
                                if isinstance(block, TextBlock):
                                    # Sanitizar texto para esconder mensagens técnicas de erro
                                    sanitized_text = sanitize_error_message(block.text)
                                    full_content += sanitized_text
                                    try:
                                        await websocket.send_json({
                                            "type": "text_chunk",
                                            "content": sanitized_text
                                        })
                                    except Exception:
                                        pass  # Cliente desconectou, continuar processando

                                elif isinstance(block, ThinkingBlock):
                                    thinking_content += block.thinking
                                    try:
                                        await websocket.send_json({
                                            "type": "thinking",
                                            "content": block.thinking
                                        })
                                    except Exception:
                                        pass  # Cliente desconectou, continuar processando

                                elif isinstance(block, ToolUseBlock):
                                    tool_names[block.id] = block.name
                                    try:
                                        await websocket.send_json({
                                            "type": "tool_start",
                                            "tool": block.name,
                                            "tool_use_id": block.id,
                                            "input": block.input
                                        })
                                    except Exception:
                                        pass  # Cliente desconectou, continuar processando

                                elif isinstance(block, ToolResultBlock):
                                    try:
                                        await websocket.send_json({
                                            "type": "tool_result",
                                            "tool_use_id": block.tool_use_id,
                                            "tool": tool_names.get(block.tool_use_id, "unknown"),
                                            "content": block.content,
                                            "is_error": block.is_error
                                        })
                                    except Exception:
                                        pass  # Cliente desconectou, continuar processando

                        elif isinstance(msg, ResultMessage):
                            duration_ms = int((time.time() - start_time) * 1000)
                            cost_usd = msg.total_cost_usd or 0.0

                            # SEMPRE salvar no banco PRIMEIRO (independente do WebSocket)
                            try:
                                await session_manager.save_message(
                                    conversation_id,
                                    user_id,
                                    "assistant",
                                    full_content
                                )
                                logger.info(f"Assistant message saved to DB for session {conversation_id}")
                            except Exception as save_error:
                                logger.error(f"CRITICAL: Failed to save assistant message to DB: {save_error}")

                            # DT-SDK-002: Salvar custo da sessão no banco (para auditoria)
                            try:
                                await session_manager.update_session_cost(
                                    conversation_id,
                                    cost_usd
                                )
                            except Exception as cost_error:
                                logger.error(f"Failed to update session cost: {cost_error}")

                            # Tentar enviar pelo WebSocket (pode falhar se desconectado)
                            try:
                                await websocket.send_json({
                                    "type": "result",
                                    "content": full_content,
                                    "thinking": thinking_content,
                                    "cost": cost_usd,
                                    "duration_ms": duration_ms,
                                    "num_turns": num_turns,
                                    "is_error": False
                                })
                            except Exception as ws_error:
                                logger.warning(f"WebSocket send failed (client may have disconnected): {ws_error}")

                            # DT-SDK-002: Log de custos para auditoria
                            logger.info(
                                f"Chat completed for user {user_id} (role={user_role}): "
                                f"{num_turns} turns, {duration_ms}ms, cost=${cost_usd:.4f}"
                            )
                            break

            except Exception as e:
                logger.error(f"Error processing message: {e}")
                # Tentar enviar erro pelo WebSocket (pode falhar se desconectado)
                try:
                    await websocket.send_json({
                        "type": "error",
                        "error": sanitize_error_message(str(e))
                    })
                except:
                    logger.warning("Could not send error to WebSocket (client may have disconnected)")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": sanitize_error_message(str(e))
            })
        except:
            pass
        try:
            await websocket.close()
        except:
            pass


# Endpoints auxiliares para gerenciar sessões

@router.get("/sessions")
async def list_sessions(
    page: int = 1,
    per_page: int = 20,
    user_id: int = Depends(get_user_from_token)
):
    """Lista sessões de chat do usuário"""

    try:
        result = await session_manager.get_user_sessions(user_id, page, per_page)
        return {"success": True, **result}
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        return {"error": str(e)}


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    limit: int = 50
):
    """Retorna mensagens de uma sessão"""
    try:
        messages = await session_manager.get_session_history(session_id, limit)
        return {"success": True, "messages": messages}
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        return {"error": str(e)}


@router.get("/sessions/{session_id}/checkpoints")
async def get_session_checkpoints(
    session_id: str,
    user_id: int = Depends(get_user_from_token)
):
    """
    Lista checkpoints de arquivos disponíveis para uma sessão.

    Checkpoints permitem reverter alterações de arquivos feitas durante a conversa.
    Use o comando WebSocket 'rewind_files' com o checkpoint_id para reverter.
    """
    try:
        checkpoints = file_checkpoints.get(session_id, [])
        return {
            "success": True,
            "session_id": session_id,
            "checkpoints": [
                {
                    "id": c["user_message_id"],
                    "timestamp": c["timestamp"],
                    "message_preview": c["message"][:100] + "..." if len(c["message"]) > 100 else c["message"]
                }
                for c in checkpoints
            ],
            "total": len(checkpoints)
        }
    except Exception as e:
        logger.error(f"Error getting checkpoints: {e}")
        return {"error": str(e)}


@router.delete("/sessions/{session_id}/checkpoints")
async def clear_session_checkpoints(
    session_id: str,
    user_id: int = Depends(get_user_from_token)
):
    """Remove todos os checkpoints de uma sessão"""
    try:
        if session_id in file_checkpoints:
            count = len(file_checkpoints[session_id])
            del file_checkpoints[session_id]
            return {"success": True, "message": f"{count} checkpoints removidos"}
        return {"success": True, "message": "Nenhum checkpoint encontrado"}
    except Exception as e:
        logger.error(f"Error clearing checkpoints: {e}")
        return {"error": str(e)}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_id: int = Depends(get_user_from_token)
):
    """Deleta uma sessão de chat"""

    try:
        await session_manager.delete_session(session_id, user_id)
        return {"success": True, "message": "Session deleted"}
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        return {"error": str(e)}


# =============================================================================
# DT-SDK-003: Endpoints com Structured Output
# =============================================================================

from claude_agent_sdk import query
from models.diagnosis_models import DiagnosisReport
from models.analysis_models import SessionCostReport


@router.get("/reports/diagnosis/{target_user_id}")
async def get_structured_diagnosis_report(
    target_user_id: int,
    user_id: int = Depends(get_user_from_token)
):
    """
    Gera relatório estruturado de diagnóstico usando Structured Output (DT-SDK-003)

    Este endpoint usa output_format com JSON Schema para garantir
    que a resposta do Claude seja estruturada e validada.

    Requer role admin para consultar diagnósticos de outros usuários.
    """
    # Verificar permissão
    user_role = get_user_role(user_id)
    if user_role != "admin" and user_id != target_user_id:
        return {"error": "Permissão negada. Apenas admin pode ver diagnósticos de outros usuários."}

    try:
        # Configurar Structured Output com JSON Schema do Pydantic model
        options = ClaudeAgentOptions(
            model="claude-sonnet-4-5",
            max_turns=5,
            permission_mode="bypassPermissions",
            system_prompt=f"""Você é um gerador de relatórios estruturados.
Analise o diagnóstico do usuário {target_user_id} e retorne um relatório estruturado.
Use a ferramenta get_user_diagnosis para buscar os dados.""",
            mcp_servers={"platform": platform_mcp_server},
            allowed_tools=["mcp__platform__get_user_diagnosis"],
            output_format={
                "type": "json_schema",
                "schema": DiagnosisReport.model_json_schema()
            }
        )

        # Executar query com structured output
        result = None
        async for msg in query(
            prompt=f"Busque e analise o diagnóstico do usuário {target_user_id}. Retorne um relatório estruturado completo.",
            options=options
        ):
            if isinstance(msg, ResultMessage):
                result = msg.structured_output
                break

        if result:
            # Validar com Pydantic
            report = DiagnosisReport(**result)
            return {
                "success": True,
                "report": report.model_dump()
            }
        else:
            return {"error": "Não foi possível gerar o relatório estruturado"}

    except Exception as e:
        logger.error(f"Error generating structured diagnosis report: {e}")
        return {"error": str(e)}


@router.get("/reports/costs")
async def get_structured_cost_report(
    user_id: int = Depends(get_user_from_token)
):
    """
    Gera relatório estruturado de custos usando Structured Output (DT-SDK-003)

    Apenas admin pode acessar.
    """
    user_role = get_user_role(user_id)
    if user_role != "admin":
        return {"error": "Permissão negada. Apenas admin pode ver relatório de custos."}

    try:
        # Query direto no banco para custos (mais eficiente que usar Claude)
        conn = get_db_connection()
        if not conn:
            return {"error": "Database connection failed"}

        cursor = conn.cursor(dictionary=True)

        # Buscar sessões com custos
        cursor.execute("""
            SELECT
                cs.session_id,
                cs.user_id,
                u.username,
                cs.title,
                COALESCE(cs.total_cost_usd, 0) as cost_usd,
                (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.session_id) as message_count,
                cs.created_at
            FROM chat_sessions cs
            LEFT JOIN users u ON cs.user_id = u.user_id
            ORDER BY cs.created_at DESC
            LIMIT 100
        """)
        sessions = cursor.fetchall()

        cursor.close()
        conn.close()

        # Calcular totais
        total_cost = sum(s["cost_usd"] or 0 for s in sessions)
        avg_cost = total_cost / len(sessions) if sessions else 0

        # Montar resposta estruturada
        report = SessionCostReport(
            total_sessions=len(sessions),
            total_cost_usd=round(total_cost, 4),
            average_cost_usd=round(avg_cost, 4),
            sessions=[
                {
                    "session_id": s["session_id"],
                    "user_id": s["user_id"],
                    "username": s["username"],
                    "title": s["title"],
                    "cost_usd": float(s["cost_usd"] or 0),
                    "message_count": s["message_count"] or 0,
                    "created_at": str(s["created_at"]) if s["created_at"] else None
                }
                for s in sessions
            ],
            period="últimas 100 sessões"
        )

        return {
            "success": True,
            "report": report.model_dump()
        }

    except Exception as e:
        logger.error(f"Error generating structured cost report: {e}")
        return {"error": str(e)}


# =============================================================================
# Endpoints de Busca Vetorial
# =============================================================================

from core.vector_search import get_vector_search, vector_search_health_check


@router.get("/search")
async def search_similar_messages(
    query: str,
    session_id: Optional[str] = None,
    limit: int = 10,
    threshold: float = 0.8,
    user_id: int = Depends(get_user_from_token)
):
    """
    Busca mensagens similares por conteudo usando busca vetorial.

    Args:
        query: Texto da busca
        session_id: Filtrar por sessao especifica (opcional)
        limit: Numero maximo de resultados (default: 10)
        threshold: Threshold de distancia (menor = mais similar, default: 0.5)

    Returns:
        Lista de mensagens similares com score de similaridade
    """
    if not query or not query.strip():
        return {"error": "Query parameter is required", "results": []}

    try:
        vector_search = get_vector_search()
        results = await vector_search.search_similar_messages(
            query=query,
            session_id=session_id,
            user_id=user_id,
            limit=limit,
            threshold=threshold
        )

        return {
            "success": True,
            "query": query,
            "results": results,
            "count": len(results)
        }

    except Exception as e:
        logger.error(f"Error in vector search endpoint: {e}")
        return {"error": str(e), "results": []}


@router.get("/search/stats")
async def get_embedding_stats(
    user_id: int = Depends(get_user_from_token)
):
    """
    Retorna estatisticas de embeddings no banco de dados.

    Mostra quantas mensagens tem embeddings gerados e cobertura.
    """
    try:
        vector_search = get_vector_search()
        stats = await vector_search.count_embeddings()

        return {
            "success": True,
            "stats": stats
        }

    except Exception as e:
        logger.error(f"Error getting embedding stats: {e}")
        return {"error": str(e)}


@router.get("/hybrid/stats")
async def get_hybrid_stats(
    user_id: int = Depends(get_user_from_token)
):
    """
    Retorna estatísticas do modo híbrido (MiniMax + Claude).

    Mostra quantas vezes cada provider foi usado e decisões do needs_tools().
    Dados armazenados no AgentFS.
    """
    if not AGENTFS_AVAILABLE:
        return {
            "success": False,
            "error": "AgentFS não disponível",
            "stats": {}
        }

    try:
        # Usar AgentFS do usuário específico (isolamento por usuário)
        agentfs = await get_agentfs(user_id=user_id)

        # Buscar todas as decisões híbridas DESTE usuário
        keys = await agentfs.kv_list("hybrid:decision:")

        claude_count = 0
        minimax_count = 0
        decisions = []

        for key in keys[-100:]:  # Últimas 100 decisões
            try:
                data = await agentfs.kv_get(key)
                if data:
                    if data.get("provider_chosen") == "claude":
                        claude_count += 1
                    else:
                        minimax_count += 1
                    decisions.append(data)
            except Exception:
                continue

        total = claude_count + minimax_count

        return {
            "success": True,
            "stats": {
                "total_decisions": total,
                "claude_usage": claude_count,
                "minimax_usage": minimax_count,
                "claude_percentage": round((claude_count / total * 100), 1) if total > 0 else 0,
                "minimax_percentage": round((minimax_count / total * 100), 1) if total > 0 else 0,
                "recent_decisions": decisions[-10:]  # Últimas 10
            }
        }

    except Exception as e:
        logger.error(f"Error getting hybrid stats: {e}")
        return {"error": str(e), "stats": {}}


@router.post("/search/backfill")
async def backfill_embeddings(
    batch_size: int = 50,
    user_id: int = Depends(get_user_from_token)
):
    """
    Gera embeddings para mensagens antigas que nao tem.

    Util para migracao de dados existentes.
    Requer role admin.

    Args:
        batch_size: Quantas mensagens processar por vez (default: 50)
    """
    # Verificar se e admin
    user_role = get_user_role(user_id)
    if user_role != "admin":
        return {"error": "Apenas admin pode executar backfill de embeddings"}

    try:
        vector_search = get_vector_search()
        result = await vector_search.backfill_embeddings(batch_size=batch_size)

        return {
            "success": True,
            "result": result
        }

    except Exception as e:
        logger.error(f"Error in backfill endpoint: {e}")
        return {"error": str(e)}


@router.get("/search/health")
async def vector_search_health():
    """
    Health check do sistema de busca vetorial.

    Verifica se embeddings estao funcionando e busca esta operacional.
    """
    try:
        health = await vector_search_health_check()
        return {
            "success": health.get("status") == "healthy",
            "health": health
        }

    except Exception as e:
        logger.error(f"Error in vector search health check: {e}")
        return {
            "success": False,
            "health": {"status": "unhealthy", "error": str(e)}
        }
