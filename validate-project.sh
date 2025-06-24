#!/bin/bash

# Script de validação do projeto
# Verifica se tudo está correto antes do deployment

echo "🔍 =============================================="
echo "🔍 VALIDAÇÃO DO PROJETO"
echo "🔍 $(date)"
echo "🔍 =============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Contador de erros
ERRORS=0

# Função para incrementar erros
add_error() {
    ERRORS=$((ERRORS + 1))
    error "$1"
}

# Verificar arquivos essenciais
log "Verificando arquivos essenciais..."

essential_files=(
    "Dockerfile"
    ".dockerignore"
    "package.json"
    "apps/admin/package.json"
    "apps/admin/next.config.js"
    "server/package.json"
    "server/src/index.js"
    "server/prisma/schema.prisma"
)

for file in "${essential_files[@]}"; do
    if [[ -f "$file" ]]; then
        success "✓ $file"
    else
        add_error "✗ $file não encontrado"
    fi
done

# Verificar se não há diretórios problemáticos
log "Verificando estrutura de diretórios..."

if [[ -d "packages" ]]; then
    add_error "Diretório 'packages' ainda existe (deve ser removido)"
else
    success "✓ Diretório 'packages' não existe"
fi

if [[ -d "apps/widget" ]]; then
    warning "Diretório 'apps/widget' existe mas não é usado"
fi

# Verificar package.json
log "Verificando package.json..."

if grep -q '"packages/\*"' package.json; then
    add_error "package.json ainda referencia 'packages/*' nos workspaces"
else
    success "✓ package.json não referencia packages/*"
fi

if grep -q 'dev:widget' package.json; then
    add_error "package.json ainda referencia scripts do widget"
else
    success "✓ package.json não referencia scripts do widget"
fi

# Verificar next.config.js
log "Verificando next.config.js..."

if grep -q 'appDir.*true' apps/admin/next.config.js; then
    add_error "next.config.js usa configuração depreciada 'appDir: true'"
else
    success "✓ next.config.js não usa configuração depreciada"
fi

# Verificar Dockerfile
log "Verificando Dockerfile..."

if grep -q 'COPY packages/' Dockerfile; then
    add_error "Dockerfile ainda referencia diretório packages/"
else
    success "✓ Dockerfile não referencia packages/"
fi

if grep -q 'yarn install.*--frozen-lockfile' Dockerfile; then
    success "✓ Dockerfile usa --frozen-lockfile"
else
    warning "Dockerfile pode não usar --frozen-lockfile"
fi

# Verificar dependências críticas
log "Verificando dependências críticas..."

if grep -q '"express"' server/package.json; then
    success "✓ Express encontrado em server/package.json"
else
    add_error "Express não encontrado em server/package.json"
fi

if grep -q '"@prisma/client"' server/package.json; then
    success "✓ Prisma client encontrado"
else
    add_error "Prisma client não encontrado"
fi

if grep -q '"next"' apps/admin/package.json; then
    success "✓ Next.js encontrado em apps/admin/package.json"
else
    add_error "Next.js não encontrado em apps/admin/package.json"
fi

# Verificar scripts do servidor
log "Verificando scripts do servidor..."

if [[ -f "server/src/index.js" ]]; then
    if grep -q 'app.listen' server/src/index.js; then
        success "✓ Servidor configurado para listen"
    else
        add_error "Servidor não configurado para listen"
    fi
    
    if grep -q '/health' server/src/index.js; then
        success "✓ Health check endpoint encontrado"
    else
        add_error "Health check endpoint não encontrado"
    fi
else
    add_error "server/src/index.js não encontrado"
fi

# Verificar schema do Prisma
log "Verificando schema do Prisma..."

if grep -q 'provider.*=.*"sqlite"' server/prisma/schema.prisma; then
    success "✓ SQLite configurado no schema"
else
    warning "SQLite pode não estar configurado"
fi

# Verificar .dockerignore
log "Verificando .dockerignore..."

if [[ -f ".dockerignore" ]]; then
    if grep -q 'node_modules' .dockerignore; then
        success "✓ .dockerignore ignora node_modules"
    else
        warning ".dockerignore pode não ignorar node_modules"
    fi
    
    if grep -q '.env' .dockerignore; then
        success "✓ .dockerignore ignora .env"
    else
        warning ".dockerignore pode não ignorar .env"
    fi
else
    add_error ".dockerignore não encontrado"
fi

# Resultado final
echo ""
echo "🔍 =============================================="
echo "🔍 RESULTADO DA VALIDAÇÃO"
echo "🔍 =============================================="

if [[ $ERRORS -eq 0 ]]; then
    success "🎉 VALIDAÇÃO PASSOU! Nenhum erro encontrado."
    echo ""
    echo "✅ Arquivos essenciais: OK"
    echo "✅ Estrutura de diretórios: OK"
    echo "✅ Configurações: OK"
    echo "✅ Dependências: OK"
    echo ""
    echo "🚀 Projeto pronto para deploy no Easypanel!"
    echo ""
    echo "Para fazer o deploy:"
    echo "1. git add ."
    echo "2. git commit -m \"fix: corrigir configurações Docker e Next.js\""  
    echo "3. git push"
    echo "4. Deploy no Easypanel"
    exit 0
else
    error "❌ VALIDAÇÃO FALHOU! $ERRORS erro(s) encontrado(s)."
    echo ""
    echo "Por favor, corrija os erros acima antes de fazer o deploy."
    exit 1
fi 