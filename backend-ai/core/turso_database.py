"""
Turso/SQLite database connection module
Usando SQLite local para desenvolvimento
"""
import sqlite3
import os
from contextlib import contextmanager

# Caminho do banco de dados
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'crm.db')

# Conexão global para compatibilidade
db = None

def dict_factory(cursor, row):
    """Converte rows do SQLite em dicionários reais"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db_connection():
    """Retorna uma conexão SQLite com row_factory que retorna dicts"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = dict_factory
    return conn

@contextmanager
def get_db_cursor():
    """Context manager para cursor do banco"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        yield cursor, conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

class Database:
    """Classe wrapper para compatibilidade com código existente"""

    def __init__(self):
        self.db_path = DB_PATH

    def get_connection(self):
        return get_db_connection()

    def execute(self, query, params=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            conn.commit()
            return cursor
        except Exception as e:
            conn.rollback()
            raise e

# Instância global
db = Database()
