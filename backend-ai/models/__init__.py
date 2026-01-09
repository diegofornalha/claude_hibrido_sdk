"""
Models Package - Pydantic models para Structured Output (DT-SDK-003)

Define schemas que o Claude Agent SDK pode usar para garantir
respostas estruturadas e validadas.
"""

from .diagnosis_models import (
    DiagnosisAreaScore,
    DiagnosisSummary,
    DiagnosisReport,
    QuickDiagnosisOutput,
)

from .analysis_models import (
    DataAnalysisResult,
    SessionCostReport,
    UserActivityReport,
)

__all__ = [
    # Diagnosis
    "DiagnosisAreaScore",
    "DiagnosisSummary",
    "DiagnosisReport",
    "QuickDiagnosisOutput",
    # Analysis
    "DataAnalysisResult",
    "SessionCostReport",
    "UserActivityReport",
]
