#!/bin/bash

# Script de validação específico para problemas do Prisma
echo "🔍 =============================================="
echo "🔍 VALIDAÇÃO PRISMA + DOCKER"
echo "🔍 $(date)"
echo "🔍 =============================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERRO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }

ERRORS=0
add_error() { ERRORS=$((ERRORS + 1)); error "$1"; }

log "Verificando problemas específicos do Prisma..."

# Verificar imagem base do Docker
log "Verificando imagem base do Dockerfile..."
if grep -q "FROM node:.*-alpine" Dockerfile; then
    warning "Usando Alpine Linux - pode ter problemas de compatibilidade com Prisma"
    echo "  Alpine usa OpenSSL 3.x, mas Prisma precisa de OpenSSL 1.1.x"
    echo "  Recomendação: usar node:18-slim (Debian) para melhor compatibilidade"
elif grep -q "FROM node:.*-slim" Dockerfile; then
    success "✓ Usando Debian (node:18-slim) - boa compatibilidade com Prisma"
else
    warning "Imagem base não identificada claramente"
fi

# Verificar se OpenSSL está sendo instalado
log "Verificando instalação do OpenSSL..."
if grep -q "openssl" Dockerfile; then
    success "✓ OpenSSL sendo instalado no Dockerfile"
else
    add_error "OpenSSL não encontrado no Dockerfile - necessário para Prisma"
fi

# Verificar ordem das operações no Dockerfile
log "Verificando ordem das operações do Prisma..."
if grep -q "prisma generate" Dockerfile; then
    success "✓ prisma generate encontrado"
    
    # Verificar se prisma generate vem antes de USER
    dockerfile_content=$(cat Dockerfile)
    generate_line=$(echo "$dockerfile_content" | grep -n "prisma generate" | cut -d: -f1)
    user_line=$(echo "$dockerfile_content" | grep -n "USER nodejs" | cut -d: -f1)
    
    if [[ -n "$generate_line" && -n "$user_line" && "$generate_line" -lt "$user_line" ]]; then
        success "✓ prisma generate executado antes de mudar para usuário não-root"
    else
        add_error "prisma generate deve ser executado ANTES de 'USER nodejs'"
    fi
else
    add_error "prisma generate não encontrado no Dockerfile"
fi

# Verificar permissões de node_modules
log "Verificando permissões do node_modules..."
if grep -q "chown.*nodejs.*node_modules" Dockerfile; then
    success "✓ Permissões do node_modules sendo ajustadas"
else
    add_error "Permissões do node_modules não estão sendo ajustadas para o usuário nodejs"
fi

# Verificar schema do Prisma
log "Verificando configurações do schema Prisma..."
if [[ -f "server/prisma/schema.prisma" ]]; then
    if grep -q 'provider.*sqlite' server/prisma/schema.prisma; then
        success "✓ SQLite configurado no schema"
    else
        warning "Provider do banco não é SQLite - pode necessitar configurações adicionais"
    fi
    
    if grep -q 'binaryTargets' server/prisma/schema.prisma; then
        success "✓ binaryTargets configurado no schema"
    else
        warning "binaryTargets não configurado - pode ajudar com compatibilidade"
        echo "  Considere adicionar: binaryTargets = [\"native\", \"linux-musl\"]"
    fi
else
    add_error "schema.prisma não encontrado"
fi

# Verificar package.json do servidor
log "Verificando versão do Prisma..."
if [[ -f "server/package.json" ]]; then
    prisma_version=$(grep -o '"@prisma/client": *"[^"]*"' server/package.json | cut -d'"' -f4)
    if [[ -n "$prisma_version" ]]; then
        success "✓ Prisma Client versão: $prisma_version"
        
        # Verificar se é uma versão recente
        if [[ "$prisma_version" =~ ^5\. ]]; then
            success "✓ Usando Prisma 5.x (versão recente)"
        else
            warning "Usando Prisma versão antiga - considere atualizar"
        fi
    else
        add_error "Versão do Prisma Client não encontrada"
    fi
else
    add_error "server/package.json não encontrado"
fi

# Sugestões de melhoria
echo ""
log "Sugestões de melhoria:"

echo "1. 🐳 Para melhor compatibilidade, use:"
echo "   FROM node:18-slim  (ao invés de Alpine)"

echo ""
echo "2. 📝 Adicione ao schema.prisma:"
echo "   generator client {"
echo "     provider = \"prisma-client-js\""
echo "     binaryTargets = [\"native\", \"debian-openssl-3.0.x\"]"
echo "   }"

echo ""
echo "3. 🔧 Instale OpenSSL no Dockerfile:"
echo "   Para Alpine: apk add openssl1.1-compat"
echo "   Para Debian: apt-get install libssl3"

# Resultado final
echo ""
echo "🔍 =============================================="
echo "🔍 RESULTADO DA VALIDAÇÃO PRISMA"
echo "🔍 =============================================="

if [[ $ERRORS -eq 0 ]]; then
    success "🎉 VALIDAÇÃO PRISMA PASSOU!"
    echo ""
    echo "🚀 Recomendações implementadas:"
    echo "✅ Dockerfile configurado para Prisma"
    echo "✅ Ordem de operações correta"
    echo "✅ Permissões adequadas"
    echo ""
    echo "📦 Para aplicar as correções:"
    echo "1. Escolha uma versão do Dockerfile:"
    echo "   - Dockerfile.debian (RECOMENDADO - mais estável)"
    echo "   - Dockerfile.fixed (Alpine com correções)"
    echo "2. cp Dockerfile.debian Dockerfile"
    echo "3. git add . && git commit && git push"
else
    error "❌ $ERRORS problema(s) encontrado(s)"
    echo ""
    echo "🔧 Use os Dockerfiles corrigidos:"
    echo "   - Dockerfile.debian (RECOMENDADO)"
    echo "   - Dockerfile.fixed (Alpine corrigido)"
fi 