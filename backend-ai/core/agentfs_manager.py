"""
AgentFS Manager - Stub module
Gerenciamento de estado de agentes
"""

class AgentFSManager:
    """Stub para AgentFS Manager"""

    def __init__(self, user_id: int = None):
        self.user_id = user_id

    async def get(self, key: str, default=None):
        return default

    async def set(self, key: str, value):
        pass

    async def delete(self, key: str):
        pass

    async def close(self):
        pass

# Cache global de managers
_managers = {}

def get_agentfs_manager(user_id: int) -> AgentFSManager:
    """Retorna um manager para o usuário"""
    if user_id not in _managers:
        _managers[user_id] = AgentFSManager(user_id)
    return _managers[user_id]

async def close_all_agentfs():
    """Fecha todos os managers"""
    for manager in _managers.values():
        await manager.close()
    _managers.clear()

async def cleanup_old_data():
    """Limpa dados antigos - stub"""
    return {
        'users_processed': 0,
        'users_cleaned': 0,
        'tool_calls_deleted': 0,
        'kv_deleted': 0,
        'errors': []
    }
