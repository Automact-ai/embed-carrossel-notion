# Dockerfile usando Debian (melhor compatibilidade com Prisma)
FROM node:18-slim

# Instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    libssl3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar e instalar dependências do admin
COPY apps/admin/package.json ./apps/admin/
WORKDIR /app/apps/admin
RUN yarn install --frozen-lockfile

# Copiar código do admin e fazer build
COPY apps/admin ./
RUN yarn build

# Voltar para raiz e configurar servidor
WORKDIR /app
COPY server/package.json ./server/
WORKDIR /app/server

# Instalar dependências do servidor
RUN yarn install --frozen-lockfile --production

# Copiar código do servidor
COPY server/ ./

# Gerar cliente Prisma APÓS copiar schema.prisma
RUN npx prisma generate

# Criar usuário não-root
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nodejs

# Criar diretórios necessários e definir permissões
RUN mkdir -p ./uploads ./prisma && \
    chown -R nodejs:nodejs ./uploads ./prisma ./node_modules

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:./prisma/dev.db"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Comando de inicialização
CMD ["sh", "-c", "npx prisma db push --accept-data-loss || true && node src/index.js"] 