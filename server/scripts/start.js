const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando aplicação...');

// Primeiro, inicializar o banco de dados
try {
  require('./init-db');
} catch (error) {
  console.error('❌ Erro na inicialização do banco:', error.message);
  process.exit(1);
}

// Aguardar um pouco para garantir que o banco foi criado
setTimeout(() => {
  console.log('🔄 Iniciando servidor...');
  
  // Iniciar o servidor principal
  const server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // Lidar com sinais de encerramento
  process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando servidor...');
    server.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, encerrando servidor...');
    server.kill('SIGINT');
  });
  
  server.on('exit', (code) => {
    console.log(`🔚 Servidor encerrado com código: ${code}`);
    process.exit(code);
  });
  
}, 1000); 