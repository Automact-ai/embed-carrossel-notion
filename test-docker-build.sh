#!/bin/bash

# Script de teste para Docker build local
# Criado para testar antes de fazer push para o Easypanel

echo "🐳 =============================================="
echo "🐳 TESTE LOCAL DO DOCKER BUILD"
echo "🐳 $(date)"
echo "🐳 =============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Limpar builds anteriores
log "Limpando builds anteriores..."
docker rmi embed-carousel-local 2>/dev/null || true
docker system prune -f > /dev/null 2>&1

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando! Inicie o Docker Desktop primeiro."
    exit 1
fi

success "Docker está rodando ✅"

# Verificar arquivos necessários
log "Verificando arquivos necessários..."
files=(
    "Dockerfile"
    "package.json"
    "apps/admin/package.json"
    "server/package.json"
    "server/src/index.js"
    "server/prisma/schema.prisma"
)

for file in "${files[@]}"; do
    if [[ ! -f "$file" ]]; then
        error "Arquivo necessário não encontrado: $file"
        exit 1
    fi
done

success "Todos os arquivos necessários encontrados ✅"

# Verificar estrutura de diretórios
log "Verificando estrutura de diretórios..."
if [[ -d "packages" ]]; then
    warning "Diretório 'packages' ainda existe - pode causar problemas"
    ls -la packages/ || true
fi

# Iniciar build
log "Iniciando Docker build..."
echo "🏗️  Build command: docker build -t embed-carousel-local ."
echo ""

# Build com logs detalhados
if docker build -t embed-carousel-local . --progress=plain --no-cache > docker-build.log 2>&1; then
    success "Docker build concluído com sucesso! 🎉"
    
    # Verificar se a imagem foi criada
    if docker images | grep -q embed-carousel-local; then
        success "Imagem Docker criada com sucesso ✅"
        
        # Mostrar informações da imagem
        log "Informações da imagem:"
        docker images embed-carousel-local
        
        # Testar o container
        log "Testando container..."
        
        # Verificar se a porta 3001 está disponível
        if lsof -i :3001 > /dev/null 2>&1; then
            warning "Porta 3001 está em uso. Parando processos..."
            pkill -f "node.*3001" || true
            sleep 2
        fi
        
        # Iniciar container em background
        log "Iniciando container de teste..."
        if docker run -d --name embed-test -p 3001:3001 \
            -e NODE_ENV=production \
            -e PORT=3001 \
            -e DATABASE_URL="file:./prisma/dev.db" \
            embed-carousel-local > /dev/null 2>&1; then
            
            success "Container iniciado com sucesso ✅"
            
            # Aguardar inicialização
            log "Aguardando inicialização (30s)..."
            sleep 30
            
            # Testar health check
            log "Testando health check..."
            if curl -s http://localhost:3001/health > /dev/null 2>&1; then
                success "Health check funcionando! 🎉"
                
                # Testar resposta da API
                log "Testando resposta da API..."
                response=$(curl -s http://localhost:3001/health)
                echo "Response: $response"
                
                # Verificar logs do container
                log "Últimas 20 linhas dos logs do container:"
                docker logs embed-test --tail 20
                
                success "🎉 TESTE COMPLETO COM SUCESSO! 🎉"
                echo ""
                echo "✅ Build Docker: OK"
                echo "✅ Container Start: OK"
                echo "✅ Health Check: OK"
                echo "✅ API Response: OK"
                echo ""
                echo "🚀 Pronto para fazer push para o Git e deploy no Easypanel!"
                
            else
                error "Health check falhou ❌"
                log "Verificando logs do container..."
                docker logs embed-test
                exit 1
            fi
            
        else
            error "Falha ao iniciar container ❌"
            exit 1
        fi
        
    else
        error "Imagem Docker não foi criada ❌"
        exit 1
    fi
    
else
    error "Docker build falhou! ❌"
    echo ""
    echo "📋 Log completo do build salvo em: docker-build.log"
    echo "📋 Últimas 20 linhas do erro:"
    tail -20 docker-build.log
    exit 1
fi

# Cleanup
cleanup() {
    log "Fazendo cleanup..."
    docker stop embed-test > /dev/null 2>&1 || true
    docker rm embed-test > /dev/null 2>&1 || true
    docker rmi embed-carousel-local > /dev/null 2>&1 || true
}

# Executar cleanup ao sair
trap cleanup EXIT

log "Teste concluído! Pressione Enter para fazer cleanup e sair..."
read 