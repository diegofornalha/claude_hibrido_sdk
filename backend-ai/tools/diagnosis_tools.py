"""
Diagnosis Tools - Ferramentas para salvar diagnósticos de mentorados

Permite que a CRM salve o diagnóstico estruturado após avaliar as respostas.
"""

import json
import logging
from typing import Dict, Any
from datetime import datetime

from claude_agent_sdk import tool

logger = logging.getLogger(__name__)


@tool(
    "save_diagnosis",
    """Salva o diagnóstico completo do mentorado. CHAME ESTA FERRAMENTA ao final do diagnóstico!

    Parâmetros:
    - user_id: ID do usuário (número inteiro)
    - session_id: ID da sessão de chat (string)
    - area_scores_json: JSON string com array de 7 objetos, cada um com:
      {"area_key": "mentalidade", "score": 50, "strengths": "...", "improvements": "...", "recommendations": "..."}
      Use get_diagnosis_areas para obter as chaves válidas dinamicamente do banco de dados
    - overall_score: Pontuação geral 0-100 (número)
    - profile_type: "iniciante" | "intermediario" | "avancado"
    - strongest_area: chave da área mais forte
    - weakest_area: chave da área mais fraca
    - main_insights: texto com principais insights
    - action_plan: texto com plano de ação
    """,
    {
        "user_id": int,
        "session_id": str,
        "area_scores_json": str,  # JSON string com array de objetos
        "overall_score": float,
        "profile_type": str,
        "strongest_area": str,
        "weakest_area": str,
        "main_insights": str,
        "action_plan": str
    }
)
async def save_diagnosis(args: Dict[str, Any]) -> Dict:
    """
    Salva diagnóstico completo no banco de dados.

    Args:
        user_id: ID do usuário (será convertido para client_id automaticamente)
        session_id: ID da sessão de chat
        area_scores: Lista com scores de cada área:
            - area_key: chave da área (obtida via get_diagnosis_areas)
            - score: pontuação 0-100
            - strengths: pontos fortes identificados
            - improvements: pontos a melhorar
            - recommendations: recomendações específicas
        overall_score: Pontuação geral 0-100
        profile_type: Tipo de perfil (iniciante, intermediario, avancado)
        strongest_area: Área mais forte (area_key)
        weakest_area: Área mais fraca (area_key)
        main_insights: Principais insights do diagnóstico
        action_plan: Plano de ação recomendado

    Returns:
        Confirmação do diagnóstico salvo com assessment_id
    """
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app import get_db_connection

    try:
        conn = get_db_connection()
        if not conn:
            return {
                "content": [{
                    "type": "text",
                    "text": "Erro: Falha na conexão com o banco de dados"
                }],
                "isError": True
            }

        cursor = conn.cursor(dictionary=True)

        # 0. Obter user_id (tabela clients removida)
        user_id = args.get("user_id")
        if not user_id:
            return {
                "content": [{
                    "type": "text",
                    "text": "Erro: user_id é obrigatório"
                }],
                "isError": True
            }

        # 1. Criar assessment (usando user_id diretamente)
        cursor.execute("""
            INSERT INTO assessments (user_id, session_id, status, started_at, completed_at)
            VALUES (%s, %s, 'completed', datetime('now'), datetime('now'))
        """, (user_id, args["session_id"]))

        assessment_id = cursor.lastrowid
        logger.info(f"Created assessment {assessment_id} for user {user_id}")

        # 2. Parse do JSON string de area_scores
        area_scores = json.loads(args["area_scores_json"])
        logger.info(f"Parsed {len(area_scores)} area scores from JSON")

        # 3. Salvar scores por área (usa area_key diretamente)
        saved_count = 0
        for area_score in area_scores:
            area_key = area_score.get("area_key")
            if not area_key:
                continue

            cursor.execute("""
                INSERT INTO assessment_area_scores
                (assessment_id, area_key, score, strengths, improvements, recommendations)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                assessment_id,
                area_key,
                area_score.get("score", 0),
                area_score.get("strengths", ""),
                area_score.get("improvements", ""),
                area_score.get("recommendations", "")
            ))
            saved_count += 1

        logger.info(f"Saved {saved_count} area scores")

        # 4. Atualizar assessment com dados do resumo
        cursor.execute("""
            UPDATE assessments SET
                overall_score = %s,
                profile_type = %s,
                strongest_area = %s,
                weakest_area = %s,
                main_insights = %s,
                action_plan = %s
            WHERE assessment_id = %s
        """, (
            args.get("overall_score", 0),
            args.get("profile_type", "iniciante"),
            args.get("strongest_area", ""),
            args.get("weakest_area", ""),
            args.get("main_insights", ""),
            args.get("action_plan", ""),
            assessment_id
        ))

        conn.commit()
        cursor.close()
        conn.close()

        logger.info(f"Diagnosis saved successfully: assessment_id={assessment_id}")

        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "success": True,
                    "assessment_id": assessment_id,
                    "message": f"Diagnóstico salvo com sucesso! ID: {assessment_id}",
                    "overall_score": args.get("overall_score"),
                    "profile_type": args.get("profile_type")
                }, ensure_ascii=False)
            }]
        }

    except Exception as e:
        logger.error(f"Error saving diagnosis: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Erro ao salvar diagnóstico: {str(e)}"
            }],
            "isError": True
        }


@tool(
    "get_diagnosis_areas",
    "Retorna as 7 áreas de diagnóstico disponíveis com suas chaves para uso no save_diagnosis.",
    {}
)
async def get_diagnosis_areas(args: Dict[str, Any]) -> Dict:
    """
    Lista as áreas de diagnóstico disponíveis.
    Útil para a CRM saber as area_keys corretas.
    """
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app import get_db_connection

    try:
        conn = get_db_connection()
        if not conn:
            return {
                "content": [{
                    "type": "text",
                    "text": "Erro: Falha na conexão com o banco de dados"
                }],
                "isError": True
            }

        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT area_id, area_key, area_name, order_index, area_icon
            FROM diagnosis_areas
            ORDER BY order_index
        """)
        areas = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "areas": areas,
                    "count": len(areas)
                }, ensure_ascii=False, default=str)
            }]
        }

    except Exception as e:
        logger.error(f"Error getting diagnosis areas: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Erro ao buscar áreas: {str(e)}"
            }],
            "isError": True
        }


@tool(
    "get_user_diagnosis",
    """Busca o diagnóstico mais recente do usuário. USE ESTA FERRAMENTA quando o usuário perguntar sobre seu diagnóstico anterior, plano de ação, ou quiser saber seus pontos fortes/fracos.

    Parâmetros:
    - user_id: ID do usuário (número inteiro)

    Retorna:
    - overall_score: Pontuação geral 0-100
    - profile_type: Tipo de perfil (iniciante, intermediario, avancado)
    - strongest_area: Área mais forte
    - weakest_area: Área mais fraca
    - main_insights: Principais insights do diagnóstico
    - action_plan: Plano de ação personalizado
    - area_scores: Scores detalhados por área
    - created_at: Data do diagnóstico
    """,
    {
        "user_id": int
    }
)
async def get_user_diagnosis(args: Dict[str, Any]) -> Dict:
    """
    Busca o diagnóstico mais recente do usuário no banco de dados.

    Args:
        user_id: ID do usuário

    Returns:
        Diagnóstico completo com scores, insights e plano de ação
    """
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app import get_db_connection

    try:
        user_id = args.get("user_id")
        if not user_id:
            return {
                "content": [{
                    "type": "text",
                    "text": "Erro: user_id é obrigatório"
                }],
                "isError": True
            }

        conn = get_db_connection()
        if not conn:
            return {
                "content": [{
                    "type": "text",
                    "text": "Erro: Falha na conexão com o banco de dados"
                }],
                "isError": True
            }

        cursor = conn.cursor(dictionary=True)

        # 1. Buscar assessment mais recente (dados estão na tabela assessments)
        cursor.execute("""
            SELECT assessment_id, status, started_at, completed_at,
                   overall_score, profile_type, main_insights, action_plan,
                   strongest_area, weakest_area, created_at
            FROM assessments
            WHERE user_id = %s AND status = 'completed'
            ORDER BY completed_at DESC
            LIMIT 1
        """, (user_id,))

        assessment = cursor.fetchone()

        if not assessment:
            cursor.close()
            conn.close()
            return {
                "content": [{
                    "type": "text",
                    "text": json.dumps({
                        "found": False,
                        "message": "Nenhum diagnóstico completo encontrado para este usuário."
                    }, ensure_ascii=False)
                }]
            }

        assessment_id = assessment["assessment_id"]

        # 2. Buscar nomes das áreas mais forte/fraca (pelo area_key)
        strongest_area = assessment.get("strongest_area")
        weakest_area = assessment.get("weakest_area")

        # Buscar nomes das áreas se temos as keys
        if strongest_area:
            cursor.execute("SELECT area_name FROM diagnosis_areas WHERE area_key = %s",
                          (strongest_area,))
            row = cursor.fetchone()
            if row:
                strongest_area = row["area_name"]

        if weakest_area:
            cursor.execute("SELECT area_name FROM diagnosis_areas WHERE area_key = %s",
                          (weakest_area,))
            row = cursor.fetchone()
            if row:
                weakest_area = row["area_name"]

        # 3. Buscar scores por área (usando area_key)
        cursor.execute("""
            SELECT da.area_name, aas.area_key, aas.score, aas.strengths, aas.improvements, aas.recommendations
            FROM assessment_area_scores aas
            JOIN diagnosis_areas da ON aas.area_key = da.area_key
            WHERE aas.assessment_id = %s
            ORDER BY da.order_index
        """, (assessment_id,))

        area_scores = cursor.fetchall()

        cursor.close()
        conn.close()

        # 5. Montar resposta
        result = {
            "found": True,
            "assessment_id": assessment_id,
            "overall_score": float(assessment["overall_score"]) if assessment.get("overall_score") else None,
            "profile_type": assessment.get("profile_type"),
            "strongest_area": strongest_area,
            "weakest_area": weakest_area,
            "main_insights": assessment.get("main_insights"),
            "action_plan": assessment.get("action_plan"),
            "created_at": str(assessment.get("created_at") or assessment.get("completed_at")),
            "area_scores": [
                {
                    "area_name": a["area_name"],
                    "area_key": a["area_key"],
                    "score": float(a["score"]) if a.get("score") else 0
                }
                for a in area_scores
            ]
        }

        logger.info(f"Found diagnosis for user {user_id}: assessment_id={assessment_id}, score={result['overall_score']}")

        return {
            "content": [{
                "type": "text",
                "text": json.dumps(result, ensure_ascii=False, default=str)
            }]
        }

    except Exception as e:
        logger.error(f"Error getting user diagnosis: {e}")
        return {
            "content": [{
                "type": "text",
                "text": f"Erro ao buscar diagnóstico: {str(e)}"
            }],
            "isError": True
        }
