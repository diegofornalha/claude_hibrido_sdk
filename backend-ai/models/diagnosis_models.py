"""
Diagnosis Models - Pydantic models para diagnósticos estruturados (DT-SDK-003)

Estes modelos são usados com output_format do Claude Agent SDK para garantir
respostas estruturadas quando o usuário pede resumos ou análises de diagnósticos.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class DiagnosisAreaScore(BaseModel):
    """Score de uma área específica do diagnóstico"""

    # area_key é dinâmica - validada contra tabela diagnosis_areas do banco
    # Keys padrão: mentalidade, cliente_proposta, experiencia_cliente,
    # marketing_retencao, equipe_processos, gestao_negocio, expertise_tecnica
    area_key: str = Field(..., description="Chave da área de diagnóstico (validada dinamicamente)")

    area_name: str = Field(..., description="Nome da área em português")

    score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Pontuação da área de 0 a 100"
    )

    strengths: str = Field(
        default="",
        description="Pontos fortes identificados na área"
    )

    improvements: str = Field(
        default="",
        description="Pontos a melhorar na área"
    )

    recommendations: str = Field(
        default="",
        description="Recomendações específicas para a área"
    )


class DiagnosisSummary(BaseModel):
    """Resumo executivo do diagnóstico"""

    overall_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Pontuação geral de 0 a 100"
    )

    profile_type: Literal["iniciante", "intermediario", "avancado"] = Field(
        ...,
        description="Tipo de perfil do mentorado"
    )

    strongest_area: str = Field(
        ...,
        description="Nome da área mais forte"
    )

    weakest_area: str = Field(
        ...,
        description="Nome da área mais fraca"
    )

    main_insights: str = Field(
        ...,
        description="Principais insights do diagnóstico (2-3 parágrafos)"
    )

    action_plan: str = Field(
        ...,
        description="Plano de ação prioritário com 3-5 itens"
    )


class DiagnosisReport(BaseModel):
    """Relatório completo de diagnóstico estruturado

    Use este modelo quando o usuário pedir:
    - Resumo do seu diagnóstico
    - Análise detalhada das áreas
    - Plano de ação personalizado
    """

    user_id: int = Field(..., description="ID do usuário")

    assessment_id: Optional[int] = Field(
        None,
        description="ID do assessment no banco"
    )

    created_at: Optional[str] = Field(
        None,
        description="Data de criação do diagnóstico"
    )

    summary: DiagnosisSummary = Field(
        ...,
        description="Resumo executivo do diagnóstico"
    )

    area_scores: List[DiagnosisAreaScore] = Field(
        ...,
        description="Lista com scores de todas as 7 áreas",
        min_length=7,
        max_length=7
    )

    next_steps: List[str] = Field(
        ...,
        description="Lista de próximos passos recomendados (3-5 itens)",
        min_length=1,
        max_length=5
    )


class QuickDiagnosisOutput(BaseModel):
    """Output simplificado para diagnóstico rápido

    Use quando o usuário quer apenas uma visão geral rápida.
    """

    overall_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Pontuação geral"
    )

    profile_type: Literal["iniciante", "intermediario", "avancado"] = Field(
        ...,
        description="Tipo de perfil"
    )

    top_strength: str = Field(
        ...,
        description="Principal ponto forte em uma frase"
    )

    top_improvement: str = Field(
        ...,
        description="Principal ponto a melhorar em uma frase"
    )

    priority_action: str = Field(
        ...,
        description="Ação prioritária mais importante"
    )
