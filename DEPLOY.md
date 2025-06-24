# 🚀 Deploy no Easypanel - Sistema de Embed Carrossel

Este guia explica como fazer o deploy da sua aplicação no Easypanel.

## 📋 Pré-requisitos

- Conta no Easypanel configurada
- Código fonte em um repositório Git (GitHub, GitLab, etc.)
- Easypanel com pelo menos 2GB de RAM

## 🔧 Configuração no Easypanel

### 1. Criar Nova Aplicação

1. Acesse seu painel do Easypanel
2. Clique em "**New Service**"
3. Selecione "**App**"
4. Escolha "**From Source Code**"

### 2. Configurar Repositório

- **Repository URL**: URL do seu repositório Git
- **Branch**: `main` ou `master`
- **Build Method**: `Dockerfile` (o Easypanel detectará automaticamente)

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no Easypanel:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=file:./prisma/dev.db
```

**Variáveis opcionais:**
```env
# Para configurar CORS específico (se necessário)
ALLOWED_ORIGINS=https://seudominio.com

# Para configurar rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Configurar Volumes (Importante!)

Para persistir dados, configure estes volumes:

| Local no Container | Mount Path | Descrição |
|-------------------|------------|-----------|
| `/data/db` | `/app/server/prisma` | Banco de dados SQLite |
| `/data/uploads` | `/app/server/uploads` | Arquivos de upload |

### 5. Configurar Domínio

1. Na aba "**Domains**"
2. Adicione seu domínio personalizado
3. Configure SSL (certificado automático)

### 6. Configurar Porta

- **Container Port**: `3001`
- **Protocol**: `HTTP`

## 🏗️ Processo de Build

O Dockerfile configurado fará automaticamente:

1. ✅ Build da aplicação admin (Next.js)
2. ✅ Instalação das dependências do servidor
3. ✅ Geração do cliente Prisma
4. ✅ Criação dos diretórios necessários
5. ✅ Configuração de usuário não-root para segurança

## 🗄️ Banco de Dados

- **Tipo**: SQLite (arquivo local)
- **Localização**: `/app/server/prisma/dev.db`
- **Inicialização**: Automática no primeiro deploy
- **Migração**: Executada automaticamente via `prisma db push`

> ⚠️ **Importante**: Configure o volume para `/app/server/prisma` para não perder dados entre deployments!

## 📁 Uploads de Arquivos

- **Localização**: `/app/server/uploads/`
- **Acesso**: `https://seudominio.com/uploads/arquivo.jpg`

> ⚠️ **Importante**: Configure o volume para `/app/server/uploads` para não perder arquivos!

## 🔍 Endpoints Principais

Após o deploy, sua aplicação terá:

- **Health Check**: `/health`
- **API Carrosséis**: `/api/carousels`
- **Embeds**: `/embed/:id`
- **Arquivos Estáticos**: `/uploads/*`

## 🔧 Troubleshooting

### Problemas Comuns

**1. Erro de banco de dados**
```bash
# Verificar logs do container
# Se necessário, acessar terminal do container e executar:
cd /app/server && npx prisma db push
```

**2. Arquivos de upload não aparecem**
- Verificar se o volume `/app/server/uploads` está configurado
- Verificar permissões de escrita

**3. Build falha**
- Verificar se o repositório tem o `Dockerfile` na raiz
- Verificar se não há arquivos corrompidos no `.dockerignore`

### Comandos Úteis no Terminal do Container

```bash
# Verificar estrutura do banco
cd /app/server && npx prisma studio

# Verificar logs da aplicação
pm2 logs

# Reiniciar aplicação
pm2 restart all

# Verificar status
pm2 status
```

## 📊 Monitoramento

O Easypanel fornece:

- ✅ Métricas de CPU e RAM
- ✅ Logs em tempo real
- ✅ Health checks automáticos
- ✅ SSL automático
- ✅ Backup automático (se configurado)

## 🔒 Segurança

O setup inclui:

- ✅ Usuário não-root no container
- ✅ Helmet.js para headers de segurança
- ✅ CORS configurado
- ✅ Rate limiting
- ✅ SSL/TLS automático via Easypanel

## 🚀 Deploy

1. Faça push do código para seu repositório
2. No Easypanel, clique em "**Deploy**"
3. Aguarde o build (3-5 minutos)
4. Acesse sua aplicação no domínio configurado

## 📝 Notas Adicionais

- O build pode levar alguns minutos na primeira vez
- Volumes são essenciais para persistência de dados
- O health check está em `/health` para monitoramento
- Logs estão disponíveis no painel do Easypanel

## 🆘 Suporte

Se tiver problemas:
1. Verifique os logs no painel do Easypanel
2. Confirme se todos os volumes estão configurados
3. Verifique se as variáveis de ambiente estão corretas 