"""
Config Routes - Endpoints de configuração White Label

Fornece endpoints públicos (sem auth) para:
- Configuração de marca (nome, cores, logo)
- Lista de áreas de diagnóstico
- Features habilitadas

E endpoints protegidos (admin) para:
- CRUD de configurações
- CRUD de áreas de diagnóstico
- CRUD de agentes
"""

import logging
import sqlite3
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field

from core.tenant_service import get_tenant_service, TenantService
from core.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/config", tags=["config"])


# =============================================================================
# Models
# =============================================================================

class BrandConfigResponse(BaseModel):
    """Configuração de marca para o frontend."""
    name: str
    tagline: str
    description: str
    primaryColor: str
    primaryLight: str
    primaryDark: str
    secondaryColor: str
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None
    apiDomain: str
    webDomain: str


class DiagnosisAreaResponse(BaseModel):
    """Área de diagnóstico."""
    id: int
    key: str
    name: str
    description: Optional[str] = None
    icon: str = "📊"
    order: int = 0
    isActive: bool = True


class FeaturesResponse(BaseModel):
    """Features habilitadas."""
    crm: bool = True
    diagnosis: bool = True
    chat: bool = True


class FullConfigResponse(BaseModel):
    """Configuração completa."""
    brand: BrandConfigResponse
    features: FeaturesResponse
    diagnosisAreas: List[DiagnosisAreaResponse]


class BrandConfigUpdate(BaseModel):
    """Atualização de configuração de marca."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    primaryColor: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    primaryLight: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    primaryDark: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    secondaryColor: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None


class DiagnosisAreaCreate(BaseModel):
    """Criar área de diagnóstico."""
    key: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: str = Field("📊", max_length=10)
    order: int = Field(0, ge=0)


class DiagnosisAreaUpdate(BaseModel):
    """Atualizar área de diagnóstico."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=10)
    order: Optional[int] = Field(None, ge=0)
    isActive: Optional[bool] = None


class BusinessContextUpdate(BaseModel):
    """Atualizar contexto agnóstico do negócio."""
    targetAudience: Optional[str] = Field(None, min_length=1, max_length=200)
    businessContext: Optional[str] = Field(None, min_length=1, max_length=500)
    clientTerm: Optional[str] = Field(None, min_length=1, max_length=50)
    clientTermPlural: Optional[str] = Field(None, min_length=1, max_length=50)
    serviceTerm: Optional[str] = Field(None, min_length=1, max_length=50)
    teamTerm: Optional[str] = Field(None, min_length=1, max_length=50)
    audienceGoals: Optional[List[str]] = None


class BusinessContextResponse(BaseModel):
    """Resposta do contexto agnóstico."""
    targetAudience: str
    businessContext: str
    clientTerm: str
    clientTermPlural: str
    serviceTerm: str
    teamTerm: str
    audienceGoals: List[str]


# =============================================================================
# Dependencies
# =============================================================================

def get_service() -> TenantService:
    """Obtém o TenantService."""
    return get_tenant_service()


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Extrai informações do usuário do token JWT.

    Retorna dict com user_id e role efetivo (considerando hierarquia).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido"
        )

    token = auth_header.replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado"
        )

    # Buscar role efetivo do usuário (considera hierarquia/admin_level)
    from core.auth import get_effective_role
    role = get_effective_role(user_id)

    return {"user_id": user_id, "role": role}


# =============================================================================
# Public Endpoints (sem auth)
# =============================================================================

@router.get("/brand", response_model=BrandConfigResponse)
async def get_brand_config(
    tenant_id: str = "default",
    service: TenantService = Depends(get_service)
):
    """
    Obtém configuração de marca (público).

    Usado pelo frontend para carregar nome, cores e logo.
    """
    brand = service.get_brand(tenant_id)
    return brand.to_dict()


@router.get("/features", response_model=FeaturesResponse)
async def get_features(
    tenant_id: str = "default",
    service: TenantService = Depends(get_service)
):
    """
    Obtém features habilitadas (público).

    Usado pelo frontend para mostrar/esconder módulos.
    """
    return FeaturesResponse(
        crm=service.is_feature_enabled("crm", tenant_id),
        diagnosis=service.is_feature_enabled("diagnosis", tenant_id),
        chat=service.is_feature_enabled("chat", tenant_id),
    )


@router.get("/diagnosis-areas", response_model=List[DiagnosisAreaResponse])
async def get_diagnosis_areas(
    tenant_id: str = "default",
    active_only: bool = True,
    service: TenantService = Depends(get_service)
):
    """
    Obtém áreas de diagnóstico (público).

    Usado pelo frontend para exibir as áreas disponíveis.
    """
    areas = service.get_diagnosis_areas(tenant_id, active_only)
    return [area.to_dict() for area in areas]


@router.get("/full", response_model=FullConfigResponse)
async def get_full_config(
    tenant_id: str = "default",
    service: TenantService = Depends(get_service)
):
    """
    Obtém configuração completa (público).

    Retorna brand, features e diagnosis areas em uma única chamada.
    """
    brand = service.get_brand(tenant_id)
    areas = service.get_diagnosis_areas(tenant_id)

    return FullConfigResponse(
        brand=BrandConfigResponse(**brand.to_dict()),
        features=FeaturesResponse(
            crm=service.is_feature_enabled("crm", tenant_id),
            diagnosis=service.is_feature_enabled("diagnosis", tenant_id),
            chat=service.is_feature_enabled("chat", tenant_id),
        ),
        diagnosisAreas=[DiagnosisAreaResponse(**area.to_dict()) for area in areas],
    )


# =============================================================================
# Protected Endpoints (admin only)
# =============================================================================

@router.put("/brand", response_model=BrandConfigResponse)
async def update_brand_config(
    update: BrandConfigUpdate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Atualiza configuração de marca (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    import sqlite3
    conn = sqlite3.connect(service._db_path)

    try:
        # Construir query de update dinamicamente
        updates = []
        values = []

        if update.name is not None:
            updates.append("brand_name = ?")
            values.append(update.name)
        if update.tagline is not None:
            updates.append("brand_tagline = ?")
            values.append(update.tagline)
        if update.description is not None:
            updates.append("brand_description = ?")
            values.append(update.description)
        if update.primaryColor is not None:
            updates.append("primary_color = ?")
            values.append(update.primaryColor)
        if update.primaryLight is not None:
            updates.append("primary_light = ?")
            values.append(update.primaryLight)
        if update.primaryDark is not None:
            updates.append("primary_dark = ?")
            values.append(update.primaryDark)
        if update.secondaryColor is not None:
            updates.append("secondary_color = ?")
            values.append(update.secondaryColor)
        if update.logoUrl is not None:
            updates.append("logo_url = ?")
            values.append(update.logoUrl)
        if update.faviconUrl is not None:
            updates.append("favicon_url = ?")
            values.append(update.faviconUrl)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = datetime('now')")
        values.append(tenant_id)

        query = f"UPDATE tenant_config SET {', '.join(updates)} WHERE tenant_id = ?"
        conn.execute(query, values)
        conn.commit()

        # Limpar cache
        service.clear_cache(tenant_id)
        logger.info(f"Brand config updated for tenant {tenant_id} by user {current_user.get('user_id')}")

        # Retornar config atualizada
        return service.get_brand(tenant_id).to_dict()

    finally:
        conn.close()


@router.get("/context", response_model=BusinessContextResponse)
async def get_business_context(
    tenant_id: str = "default",
    service: TenantService = Depends(get_service)
):
    """
    Obtém contexto agnóstico do negócio (público).

    Usado pelo frontend para exibir configurações de contexto.
    """
    brand = service.get_brand(tenant_id)
    return BusinessContextResponse(
        targetAudience=brand.target_audience,
        businessContext=brand.business_context,
        clientTerm=brand.client_term,
        clientTermPlural=brand.client_term_plural,
        serviceTerm=brand.service_term,
        teamTerm=brand.team_term,
        audienceGoals=brand.audience_goals,
    )


@router.put("/context", response_model=BusinessContextResponse)
async def update_business_context(
    update: BusinessContextUpdate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Atualiza contexto agnóstico do negócio (admin only).

    Permite configurar o sistema para diferentes nichos de mercado.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    import sqlite3
    import json
    conn = sqlite3.connect(service._db_path)

    try:
        updates = []
        values = []

        if update.targetAudience is not None:
            updates.append("target_audience = ?")
            values.append(update.targetAudience)
        if update.businessContext is not None:
            updates.append("business_context = ?")
            values.append(update.businessContext)
        if update.clientTerm is not None:
            updates.append("client_term = ?")
            values.append(update.clientTerm)
        if update.clientTermPlural is not None:
            updates.append("client_term_plural = ?")
            values.append(update.clientTermPlural)
        if update.serviceTerm is not None:
            updates.append("service_term = ?")
            values.append(update.serviceTerm)
        if update.teamTerm is not None:
            updates.append("team_term = ?")
            values.append(update.teamTerm)
        if update.audienceGoals is not None:
            updates.append("audience_goals = ?")
            values.append(json.dumps(update.audienceGoals, ensure_ascii=False))

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = datetime('now')")
        values.append(tenant_id)

        query = f"UPDATE tenant_config SET {', '.join(updates)} WHERE tenant_id = ?"
        conn.execute(query, values)
        conn.commit()

        service.clear_cache(tenant_id)
        logger.info(f"Business context updated for tenant {tenant_id} by user {current_user.get('user_id')}")

        brand = service.get_brand(tenant_id)
        return BusinessContextResponse(
            targetAudience=brand.target_audience,
            businessContext=brand.business_context,
            clientTerm=brand.client_term,
            clientTermPlural=brand.client_term_plural,
            serviceTerm=brand.service_term,
            teamTerm=brand.team_term,
            audienceGoals=brand.audience_goals,
        )

    finally:
        conn.close()


@router.post("/diagnosis-areas", response_model=DiagnosisAreaResponse, status_code=201)
async def create_diagnosis_area(
    area: DiagnosisAreaCreate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Cria nova área de diagnóstico (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    import sqlite3
    conn = sqlite3.connect(service._db_path)

    try:
        cursor = conn.execute("""
            INSERT INTO diagnosis_areas (tenant_id, area_key, area_name, description, area_icon, order_index)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (tenant_id, area.key, area.name, area.description, area.icon, area.order))
        conn.commit()

        area_id = cursor.lastrowid
        service.clear_cache(tenant_id)
        logger.info(f"Diagnosis area {area.key} created for tenant {tenant_id}")

        return DiagnosisAreaResponse(
            id=area_id,
            key=area.key,
            name=area.name,
            description=area.description,
            icon=area.icon,
            order=area.order,
            isActive=True,
        )

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail=f"Area key '{area.key}' already exists")
    finally:
        conn.close()


@router.put("/diagnosis-areas/{area_id}", response_model=DiagnosisAreaResponse)
async def update_diagnosis_area(
    area_id: int,
    update: DiagnosisAreaUpdate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Atualiza área de diagnóstico (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    import sqlite3
    conn = sqlite3.connect(service._db_path)
    conn.row_factory = sqlite3.Row

    try:
        # Verificar se existe
        cursor = conn.execute(
            "SELECT * FROM diagnosis_areas WHERE area_id = ? AND tenant_id = ?",
            (area_id, tenant_id)
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Diagnosis area not found")

        # Construir update
        updates = []
        values = []

        if update.name is not None:
            updates.append("area_name = ?")
            values.append(update.name)
        if update.description is not None:
            updates.append("description = ?")
            values.append(update.description)
        if update.icon is not None:
            updates.append("area_icon = ?")
            values.append(update.icon)
        if update.order is not None:
            updates.append("order_index = ?")
            values.append(update.order)
        if update.isActive is not None:
            updates.append("is_active = ?")
            values.append(1 if update.isActive else 0)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.extend([area_id, tenant_id])
        query = f"UPDATE diagnosis_areas SET {', '.join(updates)} WHERE area_id = ? AND tenant_id = ?"
        conn.execute(query, values)
        conn.commit()

        service.clear_cache(tenant_id)

        # Retornar atualizado
        cursor = conn.execute(
            "SELECT * FROM diagnosis_areas WHERE area_id = ?", (area_id,)
        )
        row = cursor.fetchone()

        return DiagnosisAreaResponse(
            id=row["area_id"],
            key=row["area_key"],
            name=row["area_name"],
            description=row["description"],
            icon=row["area_icon"] or "📊",
            order=row["order_index"] or 0,
            isActive=bool(row["is_active"]) if row["is_active"] is not None else True,
        )

    finally:
        conn.close()


@router.delete("/diagnosis-areas/{area_id}", status_code=204)
async def delete_diagnosis_area(
    area_id: int,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Deleta área de diagnóstico (admin only).

    Na verdade faz soft delete (is_active = 0).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    import sqlite3
    conn = sqlite3.connect(service._db_path)

    try:
        cursor = conn.execute(
            "UPDATE diagnosis_areas SET is_active = 0 WHERE area_id = ? AND tenant_id = ?",
            (area_id, tenant_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Diagnosis area not found")

        service.clear_cache(tenant_id)
        logger.info(f"Diagnosis area {area_id} deleted for tenant {tenant_id}")

    finally:
        conn.close()


@router.post("/cache/clear", status_code=204)
async def clear_cache(
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Limpa cache de configurações (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    service.clear_cache(tenant_id)
    logger.info(f"Cache cleared for tenant {tenant_id} by user {current_user.get('user_id')}")


# =============================================================================
# Evolution Stages - Estágios de Evolução (Flywheel)
# =============================================================================

from core.evolution_service import get_evolution_service, EvolutionService


class EvolutionStageResponse(BaseModel):
    """Estágio de evolução."""
    id: int
    key: str
    name: str
    level: int
    type: str
    description: Optional[str] = None
    createsTenant: bool = False
    permissions: List[str] = []
    isActive: bool = True


class EvolutionStageUpdate(BaseModel):
    """Atualizar estágio de evolução."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    permissions: Optional[List[str]] = None
    createsTenant: Optional[bool] = None


class EvolutionStageCreate(BaseModel):
    """Criar estágio de evolução."""
    key: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    level: int = Field(..., ge=0)
    type: str = Field(..., pattern=r'^(lead|receives_value|trades_value|generates_value)$')
    description: Optional[str] = Field(None, max_length=500)
    createsTenant: bool = False
    permissions: List[str] = []


class PromoteUserRequest(BaseModel):
    """Request para promover usuário."""
    toStage: str = Field(..., min_length=1, max_length=50)


class PromotionResponse(BaseModel):
    """Resposta de promoção."""
    success: bool
    userId: int
    fromStage: str
    toStage: str
    newTenantId: Optional[str] = None
    message: str


class UserStageResponse(BaseModel):
    """Informações do estágio do usuário."""
    userId: int
    username: str
    email: str
    role: str
    tenantId: str
    currentStageKey: str
    stageName: str
    stageLevel: int
    stageType: str
    stageHistory: List[Dict[str, Any]] = []
    promotedToTenantId: Optional[str] = None


class FunnelStageResponse(BaseModel):
    """Estágio do funil com contagem."""
    stageKey: str
    stageName: str
    stageLevel: int
    stageType: str
    userCount: int


class TenantHierarchyResponse(BaseModel):
    """Hierarquia de tenant."""
    tenantId: str
    brandName: str
    parentTenantId: Optional[str] = None
    ownerUserId: Optional[int] = None
    tenantType: str
    childTenants: List[Dict[str, Any]] = []


def get_evolution() -> EvolutionService:
    """Obtém o EvolutionService."""
    return get_evolution_service()


@router.get("/stages", response_model=List[EvolutionStageResponse])
async def get_evolution_stages(
    tenant_id: str = "default",
    active_only: bool = True,
    evolution: EvolutionService = Depends(get_evolution)
):
    """
    Obtém estágios de evolução do tenant (público).

    Usado pelo frontend para exibir o flywheel de evolução.
    """
    stages = evolution.get_stages(tenant_id, active_only)
    return [stage.to_dict() for stage in stages]


@router.get("/stages/{stage_key}", response_model=EvolutionStageResponse)
async def get_evolution_stage(
    stage_key: str,
    tenant_id: str = "default",
    evolution: EvolutionService = Depends(get_evolution)
):
    """
    Obtém um estágio específico.
    """
    stage = evolution.get_stage(stage_key, tenant_id)
    if not stage:
        raise HTTPException(status_code=404, detail=f"Stage '{stage_key}' not found")
    return stage.to_dict()


@router.put("/stages/{stage_key}", response_model=EvolutionStageResponse)
async def update_evolution_stage(
    stage_key: str,
    update: EvolutionStageUpdate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    evolution: EvolutionService = Depends(get_evolution)
):
    """
    Atualiza um estágio de evolução (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    success = evolution.update_stage(
        stage_key=stage_key,
        tenant_id=tenant_id,
        stage_name=update.name,
        description=update.description,
        permissions=update.permissions,
        creates_tenant=update.createsTenant,
    )

    if not success:
        raise HTTPException(status_code=400, detail="No fields to update")

    stage = evolution.get_stage(stage_key, tenant_id)
    logger.info(f"Stage {stage_key} updated by user {current_user.get('user_id')}")
    return stage.to_dict()


@router.post("/stages", response_model=EvolutionStageResponse, status_code=201)
async def create_evolution_stage(
    stage: EvolutionStageCreate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    evolution: EvolutionService = Depends(get_evolution)
):
    """
    Cria novo estágio de evolução (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    success = evolution.add_stage(
        tenant_id=tenant_id,
        stage_key=stage.key,
        stage_name=stage.name,
        stage_level=stage.level,
        stage_type=stage.type,
        description=stage.description,
        creates_tenant=stage.createsTenant,
        permissions=stage.permissions,
    )

    if not success:
        raise HTTPException(status_code=400, detail=f"Stage '{stage.key}' already exists")

    new_stage = evolution.get_stage(stage.key, tenant_id)
    logger.info(f"Stage {stage.key} created by user {current_user.get('user_id')}")
    return new_stage.to_dict()


@router.delete("/stages/{stage_key}", status_code=204)
async def delete_evolution_stage(
    stage_key: str,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    evolution: EvolutionService = Depends(get_evolution)
):
    """
    Remove um estágio de evolução (admin only).

    Não permite remover se houver usuários no estágio.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Verificar se existe
    stage = evolution.get_stage(stage_key, tenant_id)
    if not stage:
        raise HTTPException(status_code=404, detail=f"Stage '{stage_key}' not found")

    # Verificar se tem usuários
    users = evolution.get_users_by_stage(stage_key, tenant_id, limit=1)
    if users:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete stage '{stage_key}' - has users assigned"
        )

    success = evolution.delete_stage(stage_key, tenant_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete stage")

    logger.info(f"Stage {stage_key} deleted by user {current_user.get('user_id')}")


@router.get("/funnel", response_model=List[FunnelStageResponse])
async def get_evolution_funnel(
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    evolution: EvolutionService = Depends(get_evolution)
):
    """
    Obtém funil de evolução com contagens (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return evolution.get_evolution_funnel(tenant_id)


@router.get("/tenant-hierarchy", response_model=TenantHierarchyResponse)
async def get_tenant_hierarchy(
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    service: TenantService = Depends(get_service)
):
    """
    Obtém hierarquia do tenant (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return service.get_tenant_hierarchy(tenant_id)


# =============================================================================
# Admin Levels - Níveis Hierárquicos de Gestão
# =============================================================================

from core.admin_level_service import get_admin_level_service, AdminLevelService


class AdminLevelResponse(BaseModel):
    """Nível hierárquico de gestão."""
    id: int
    level: int
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    canManageLevels: List[int] = []
    isActive: bool = True


class AdminLevelCreate(BaseModel):
    """Criar nível hierárquico."""
    level: int = Field(..., ge=0)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    permissions: List[str] = []
    canManageLevels: List[int] = []


class AdminLevelUpdate(BaseModel):
    """Atualizar nível hierárquico."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    permissions: Optional[List[str]] = None
    canManageLevels: Optional[List[int]] = None


class SetUserLevelRequest(BaseModel):
    """Request para definir nível admin de usuário."""
    adminLevel: Optional[int] = Field(None, ge=0)


class SetUserLevelResponse(BaseModel):
    """Resposta de alteração de nível."""
    success: bool
    message: str
    userId: int
    adminLevel: Optional[int] = None
    levelName: Optional[str] = None


class HierarchySummaryResponse(BaseModel):
    """Resumo da hierarquia."""
    level: int
    name: str
    description: Optional[str] = None
    userCount: int


class RenumberLevelRequest(BaseModel):
    """Request para renumerar nível."""
    newLevel: int


class RenumberLevelResponse(BaseModel):
    """Resposta de renumeração de nível."""
    success: bool
    message: str
    oldLevel: Optional[int] = None
    newLevel: Optional[int] = None
    usersMigrated: Optional[int] = None


def get_admin_levels() -> AdminLevelService:
    """Obtém o AdminLevelService."""
    return get_admin_level_service()


@router.get("/admin-levels", response_model=List[AdminLevelResponse])
async def get_admin_levels_list(
    tenant_id: str = "default",
    active_only: bool = True,
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Obtém níveis hierárquicos do tenant (público).

    Retorna a lista de níveis de gestão configurados.
    """
    levels = admin_service.get_levels(tenant_id, active_only)
    return [level.to_dict() for level in levels]


@router.get("/admin-levels/{level}", response_model=AdminLevelResponse)
async def get_admin_level(
    level: int,
    tenant_id: str = "default",
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Obtém um nível específico.
    """
    admin_level = admin_service.get_level(level, tenant_id)
    if not admin_level:
        raise HTTPException(status_code=404, detail=f"Level {level} not found")
    return admin_level.to_dict()


@router.post("/admin-levels", response_model=AdminLevelResponse, status_code=201)
async def create_admin_level(
    level_data: AdminLevelCreate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Cria novo nível hierárquico (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    success = admin_service.add_level(
        tenant_id=tenant_id,
        level=level_data.level,
        name=level_data.name,
        description=level_data.description,
        permissions=level_data.permissions,
        can_manage_levels=level_data.canManageLevels,
    )

    if not success:
        raise HTTPException(status_code=400, detail=f"Level {level_data.level} already exists")

    new_level = admin_service.get_level(level_data.level, tenant_id)
    logger.info(f"Admin level {level_data.level} created by user {current_user.get('user_id')}")
    return new_level.to_dict()


@router.put("/admin-levels/{level}", response_model=AdminLevelResponse)
async def update_admin_level(
    level: int,
    update: AdminLevelUpdate,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Atualiza um nível hierárquico (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    success = admin_service.update_level(
        level=level,
        tenant_id=tenant_id,
        name=update.name,
        description=update.description,
        permissions=update.permissions,
        can_manage_levels=update.canManageLevels,
    )

    if not success:
        raise HTTPException(status_code=400, detail="No fields to update or level not found")

    updated_level = admin_service.get_level(level, tenant_id)
    logger.info(f"Admin level {level} updated by user {current_user.get('user_id')}")
    return updated_level.to_dict()


@router.delete("/admin-levels/{level}", status_code=204)
async def delete_admin_level(
    level: int,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Remove um nível hierárquico (admin only).

    Não permite remover nível 0 (Dono) ou níveis com usuários.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if level == 0:
        raise HTTPException(status_code=400, detail="Cannot delete level 0 (Owner)")

    # Verificar se existe
    existing = admin_service.get_level(level, tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Level {level} not found")

    # Verificar se tem usuários
    users = admin_service.get_users_by_level(level, tenant_id, limit=1)
    if users:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete level {level} - has users assigned"
        )

    success = admin_service.delete_level(level, tenant_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete level")

    logger.info(f"Admin level {level} deleted by user {current_user.get('user_id')}")


@router.post("/admin-levels/{level}/renumber", response_model=RenumberLevelResponse)
async def renumber_admin_level(
    level: int,
    request: RenumberLevelRequest,
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Renumera um nível hierárquico, migrando todos os usuários (admin only).

    - Não permite renumerar nível 0 (Dono)
    - Migra automaticamente os usuários para o novo número
    - Atualiza referências em canManageLevels de outros níveis
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if level == 0:
        raise HTTPException(status_code=400, detail="Cannot renumber level 0 (Owner)")

    result = admin_service.renumber_level(level, request.newLevel, tenant_id)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    logger.info(f"Admin level {level} renumbered to {request.newLevel} by user {current_user.get('user_id')}")

    return result


@router.get("/admin-levels-summary", response_model=List[HierarchySummaryResponse])
async def get_hierarchy_summary(
    tenant_id: str = "default",
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Obtém resumo da hierarquia com contagens (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return admin_service.get_hierarchy_summary(tenant_id)


@router.put("/users/{user_id}/admin-level", response_model=SetUserLevelResponse)
async def set_user_admin_level(
    user_id: int,
    request: SetUserLevelRequest,
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Define nível admin de um usuário (admin only).

    Validações:
    - Quem define deve ter nível menor que o nível sendo atribuído
    - Nível 1 só pode ser atribuído por outro nível 1
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = admin_service.set_user_level(
        user_id=user_id,
        admin_level=request.adminLevel,
        set_by_user_id=current_user.get("user_id"),
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))

    logger.info(f"User {user_id} admin level set to {request.adminLevel} by user {current_user.get('user_id')}")
    return result


@router.get("/users/{user_id}/admin-level")
async def get_user_admin_level(
    user_id: int,
    current_user: dict = Depends(get_current_user),
    admin_service: AdminLevelService = Depends(get_admin_levels)
):
    """
    Obtém nível admin de um usuário (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user_info = admin_service.get_user_level(user_id)
    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")

    return user_info
