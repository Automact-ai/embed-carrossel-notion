const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Inicializando banco de dados...');

// Verificar se o banco já existe
const dbPath = path.join(__dirname, '../prisma/dev.db');
const dbExists = fs.existsSync(dbPath);

if (!dbExists) {
  console.log('📦 Banco de dados não encontrado. Criando estrutura...');
  
  try {
    // Executar prisma db push para criar o banco e tabelas
    execSync('npx prisma db push', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit' 
    });
    
    console.log('✅ Banco de dados criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar banco de dados:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Banco de dados já existe.');
}

console.log('🚀 Inicialização concluída!'); 