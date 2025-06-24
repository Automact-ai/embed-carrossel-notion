#!/bin/bash

# Script de teste local do Docker antes do deploy no Easypanel
echo "🐳 =============================================="
echo "🐳 TESTE LOCAL DOCKER - PRÉ-DEPLOY EASYPANEL"
echo "🐳 $(date)"
echo "🐳 =============================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warning() { echo -e "${YELLOW}[!]${NC} $1"; }
step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# Verificar Docker
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando! Inicie o Docker Desktop primeiro."
    exit 1
fi

success "Docker está rodando"

# Limpar containers e imagens antigas
step "Limpando ambiente Docker..."
docker rm -f embed-test 2>/dev/null || true
docker rmi embed-carousel-easypanel 2>/dev/null || true

# Build
step "Iniciando Docker build (pode demorar alguns minutos)..."
echo ""
START_TIME=$(date +%s)

# Build com as mesmas flags do Easypanel
docker build \
    -t embed-carousel-easypanel \
    --build-arg NODE_ENV=production \
    --build-arg PORT=3001 \
    --build-arg DATABASE_URL="file:./prisma/dev.db" \
    . 2>&1 | tee docker-build-local.log

BUILD_EXIT_CODE=${PIPESTATUS[0]}
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    success "Build concluído em ${DURATION}s! ✨"
    
    # Verificar imagem
    if docker images | grep -q embed-carousel-easypanel; then
        success "Imagem criada com sucesso"
        docker images embed-carousel-easypanel
        
        # Criar rede
        step "Criando rede Docker..."
        docker network create embed-net 2>/dev/null || true
        
        # Criar volumes
        step "Criando volumes..."
        docker volume create embed-db 2>/dev/null || true
        docker volume create embed-uploads 2>/dev/null || true
        
        # Iniciar container
        step "Iniciando container de teste..."
        docker run -d \
            --name embed-test \
            --network embed-net \
            -p 3001:3001 \
            -v embed-db:/app/server/prisma \
            -v embed-uploads:/app/server/uploads \
            -e NODE_ENV=production \
            -e PORT=3001 \
            -e DATABASE_URL="file:./prisma/dev.db" \
            embed-carousel-easypanel
        
        if [ $? -eq 0 ]; then
            success "Container iniciado!"
            
            # Aguardar inicialização
            step "Aguardando inicialização (30s)..."
            for i in {1..30}; do
                echo -ne "\r⏳ Aguardando: $i/30s"
                sleep 1
            done
            echo ""
            
            # Testar health check
            step "Testando health check..."
            HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "0")
            
            if [ "$HEALTH_RESPONSE" = "200" ]; then
                success "Health check OK! (HTTP $HEALTH_RESPONSE)"
                
                # Mostrar resposta
                echo ""
                log "Resposta do health check:"
                curl -s http://localhost:3001/health | json_pp 2>/dev/null || curl -s http://localhost:3001/health
                echo ""
                
                # Logs do container
                step "Últimas linhas dos logs:"
                docker logs embed-test --tail 15
                
                echo ""
                echo "🎉 =============================================="
                echo "🎉 TESTE COMPLETO - PRONTO PARA EASYPANEL!"
                echo "🎉 =============================================="
                echo ""
                success "Docker Build: OK ✅"
                success "Container Start: OK ✅"  
                success "Health Check: OK ✅"
                success "API Respondendo: OK ✅"
                echo ""
                echo "📊 Estatísticas:"
                echo "  - Tempo de build: ${DURATION}s"
                echo "  - Porta: 3001"
                echo "  - Health: http://localhost:3001/health"
                echo ""
                echo "🚀 Próximos passos:"
                echo "  1. git add . && git commit -m 'fix: corrigir ordem prisma generate'"
                echo "  2. git push"
                echo "  3. Deploy no Easypanel"
                
            else
                error "Health check falhou! (HTTP $HEALTH_RESPONSE)"
                warning "Verificando logs completos..."
                docker logs embed-test
            fi
        else
            error "Falha ao iniciar container"
        fi
    else
        error "Imagem não foi criada"
    fi
else
    error "Build falhou após ${DURATION}s! ❌"
    echo ""
    error "Últimas 30 linhas do erro:"
    tail -30 docker-build-local.log
fi

# Cleanup função
cleanup() {
    echo ""
    step "Limpando ambiente..."
    docker stop embed-test 2>/dev/null || true
    docker rm embed-test 2>/dev/null || true
    docker volume rm embed-db embed-uploads 2>/dev/null || true
    docker network rm embed-net 2>/dev/null || true
}

# Perguntar se quer manter rodando
echo ""
read -p "$(echo -e "${YELLOW}Manter container rodando para testes? (s/N):${NC} ")" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    cleanup
    log "Container removido. Imagem mantida para próximo teste."
else
    echo ""
    success "Container mantido rodando em http://localhost:3001"
    log "Para parar: docker stop embed-test && docker rm embed-test"
fi 