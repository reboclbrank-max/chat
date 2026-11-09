// 🔐 COFRE SEGURO — gerenciamento de credenciais da casa
// v1 (09/11/2026): credenciais nunca entram em texto claro no código.
// O cofre lê de variáveis de ambiente (segredos do GitHub Actions) e
// as expõe apenas para as funções que precisam, com auditoria de uso.
// Regras: (1) nunca logar o valor; (2) nunca gravar em arquivo;
// (3) toda leitura registra quem pediu e quando; (4) valida se a
// credencial existe antes de usar.

const crypto = require('crypto');

const USO_AUDIT = []; // { servico, quando, origem }

// Lista de serviços conhecidos e seus nomes de segredo no GitHub Actions
const SECRET_NAMES = {
  github: 'GITHUB_TOKEN',
  youtube: 'YT_API_KEY',
  itch: 'ITCH_API_KEYS',
  bluesky_handle: 'BLUESKY_HANDLE',
  bluesky_pass: 'BLUESKY_APPPASS',
  bluesky_pass_alt: 'BSKY_APP_PASSWORD',
  mastodon: 'MASTODON_TOKEN',
  instagram: 'IG_TOKEN',
  threads: 'THREADS_TOKEN',
  threads_alt: 'THREADS_ACCESS_TOKEN',
  discord: 'DISCORD_BOT_TOKEN',
  devto: 'DEVTO_API_KEY',
  tumblr_key: 'TUMBLR_CONSUMER_KEY',
  tumblr_secret: 'TUMBLR_CONSUMER_SECRET',
  tumblr_refresh: 'TUMBLR_REFRESH_TOKEN',
  nostr: 'NOSTR_KEY',
  x_api_key: 'X_API_KEY',
  x_api_secret: 'X_API_SECRET',
  x_access_token: 'X_ACCESS_TOKEN',
  x_access_token_secret: 'X_ACCESS_TOKEN_SECRET',
  gmail_addr: 'GMAIL_CHAT_ADDR',
  gmail_pass: 'GMAIL_CHAT_PASS',
  chat_dono: 'CHAT_DONO',
  telegram_token: 'TELEGRAM_BOT_TOKEN',
  telegram_parear: 'TELEGRAM_PAREAR',
};

// Máscara para exibição em logs (mostra só 4 primeiros + 4 últimos chars)
function mascarar(valor) {
  if (!valor || typeof valor !== 'string') return '(não configurado)';
  if (valor.length <= 8) return '•'.repeat(valor.length);
  return valor.slice(0, 4) + '•'.repeat(valor.length - 8) + valor.slice(-4);
}

// Ler uma credencial de variável de ambiente com auditoria
function ler(servico, origem = 'desconhecida') {
  const nome = SECRET_NAMES[servico];
  if (!nome) {
    throw new Error(`Serviço desconhecido no cofre: ${servico}`);
  }
  const valor = process.env[nome];
  if (!valor) {
    USO_AUDIT.push({ servico, quando: new Date().toISOString(), origem, resultado: 'NAO_CONFIGURADO' });
    return null;
  }
  USO_AUDIT.push({ servico, quando: new Date().toISOString(), origem, resultado: 'OK' });
  return valor;
}

// Verificar se uma credencial existe (sem retornar o valor)
function existe(servico) {
  const nome = SECRET_NAMES[servico];
  return Boolean(process.env[nome]);
}

// Listar quais serviços estão configurados (apenas nomes, sem valores)
function statusGeral() {
  const resultado = {};
  for (const [servico, nome] of Object.entries(SECRET_NAMES)) {
    resultado[servico] = Boolean(process.env[nome]);
  }
  return resultado;
}

// Obter auditoria de uso (últimas 50 entradas)
function auditoria() {
  return USO_AUDIT.slice(-50);
}

// Gerar um hash estável da credencial para detecção de vazamento (sem expor o valor)
function hashCredencial(servico) {
  const valor = process.env[SECRET_NAMES[servico]];
  if (!valor) return null;
  return crypto.createHash('sha256').update(valor).digest('hex').slice(0, 16);
}

module.exports = { ler, existe, statusGeral, auditoria, mascarar, hashCredencial, SECRET_NAMES };
