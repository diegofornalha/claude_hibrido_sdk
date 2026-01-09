"""
Pytest configuration and fixtures for backend-ai tests.
"""

import os
import sys
import pytest

# Add backend-ai to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def db_connection():
    """Fixture que fornece conexao com banco de dados de teste."""
    from core.turso_database import get_db_connection
    return get_db_connection


@pytest.fixture
def vector_search(db_connection):
    """Fixture que fornece instancia do VectorSearch."""
    from core.vector_search import VectorSearch
    return VectorSearch(db_connection)


@pytest.fixture
def sample_texts():
    """Textos de exemplo para testes de embedding."""
    return [
        "Paciente com sintomas de dengue: febre alta, dor de cabeca",
        "Analise de residuo solido urbano no municipio",
        "Febre amarela e seus sintomas caracteristicos",
        "Diagnostico de doenca cardiovascular",
        "Tratamento para diabetes tipo 2"
    ]
