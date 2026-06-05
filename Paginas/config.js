// ==================== CONFIGURAÇÃO GLOBAL DE API ====================
// Usa o mesmo protocolo/host/porta da página atual para evitar mixed-content
const protocol = window.location.protocol; // 'http:' ou 'https:'
const host = window.location.hostname;
const port = window.location.port ? `:${window.location.port}` : '';

const API_BASE_URL = `${protocol}//${host}${port}`;

console.log(`🌐 Conectando API em: ${API_BASE_URL}`);
