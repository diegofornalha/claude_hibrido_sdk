#!/bin/bash
# Script de Deploy Automatizado - Nanda Backend
# Execute no servidor de produção: bash deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do Nanda Backend..."

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -f "backend-ai/app.py" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto (diagnostico_nanda/)${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 1. Fazendo pull das mudanças...${NC}"
git pull origin main

echo -e "${YELLOW}📋 2. Verificando commits recentes...${NC}"
git log --oneline -3

echo -e "${YELLOW}🔍 3. Verificando processo do backend...${NC}"
BACKEND_PID=$(ps aux | grep "uvicorn app:app" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$BACKEND_PID" ]; then
    echo -e "${YELLOW}⚠️  Backend não está rodando. Vou iniciar...${NC}"
else
    echo -e "${GREEN}✅ Backend encontrado (PID: $BACKEND_PID)${NC}"
    echo -e "${YELLOW}🔄 Matando processo antigo...${NC}"
    kill -9 $BACKEND_PID
    sleep 2
fi

echo -e "${YELLOW}🚀 4. Iniciando backend...${NC}"
cd backend-ai

# Ativar virtualenv se existir
if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✅ Virtualenv ativado${NC}"
fi

# Verificar dependências (opcional, comentar se quiser deploy mais rápido)
# pip install -r requirements.txt --quiet

# Iniciar backend em background
nohup uvicorn app:app --host 0.0.0.0 --port 8234 --reload > /tmp/crm-backend-deploy.log 2>&1 &
NUEVO_PID=$!

echo -e "${GREEN}✅ Backend iniciado (novo PID: $NUEVO_PID)${NC}"

echo -e "${YELLOW}⏳ 5. Aguardando backend inicializar...${NC}"
sleep 5

echo -e "${YELLOW}🏥 6. Verificando saúde...${NC}"
HEALTH_CHECK=$(curl -s http://localhost:8234/health)

if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend está saudável!${NC}"
    echo "$HEALTH_CHECK" | python3 -m json.tool
else
    echo -e "${RED}❌ Erro: Backend não está respondendo corretamente${NC}"
    echo "Logs:"
    tail -50 /tmp/crm-backend-deploy.log
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
echo ""
echo "📊 Resumo:"
echo "  - Backend PID: $NUEVO_PID"
echo "  - Logs: tail -f /tmp/crm-backend-deploy.log"
echo "  - Health: curl http://localhost:8234/health"
echo ""
echo -e "${YELLOW}🧪 Agora teste em:${NC}"
echo "  https://mvp.nandamac.cloud/chat/chat_1765956835.813c7526"
echo ""
echo -e "${GREEN}✅ Correções aplicadas:${NC}"
echo "  1. Card 'Lead cadastrado' agora aparece no topo"
echo "  2. Ferramenta get_session_user_info habilitada"
echo "  3. Nanda agora consegue buscar nome do usuário"
