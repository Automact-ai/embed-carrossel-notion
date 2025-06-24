# Dockerfile simplificado para Easypanel
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

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
RUN yarn install --frozen-lockfile --production

# Copiar código do servidor
COPY server/ ./

# Gerar cliente Prisma
RUN npx prisma generate

# Criar diretórios necessários
RUN mkdir -p ./uploads ./prisma
RUN chown -R nodejs:nodejs ./uploads ./prisma

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