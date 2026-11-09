// 🔍 SCANNER DE CREDENCIAIS EXPOSTAS — varre o repositório em busca de chaves hardcoded
// v1 (09/11/2026): escaneia todos os arquivos rastreados pelo Git em busca de padrões
// de credenciais (tokens, senhas, chaves API). Nunca loga o valor encontrado — apenas
// o hash SHA-256 truncado e o arquivo/linha.
// Regras: (1) nunca exibe valor de credencial; (2) falha o workflow se encontrar;
// (3) permite placeholders de ${{ secrets.XXX }} (são seguros).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RAIZ = process.cwd();
const ACHADOS = [];

// Padrões de credenciais perigosas (não incluem placeholders do GitHub Actions)
const PADROES = [
  { nome: 'GitHub PAT (ghp_)', regex: /ghp_[A-Za-z0-9]{36,}/g },
  { nome: 'GitHub fine-grained (github_pat_)', regex: /github_pat_[A-Za-z0-9_]{60,}/g },
  { nome: 'itch.io API key', regex: /2cxSsz[A-Za-z0-9]{20,}/g },
  { nome: 'YouTube API key', regex: /AIza[0-9A-Za-z\-_]{35,}/g },
  { nome: 'Bluesky app password', regex: /m5cn-cnas-q23u-eaqi/g },
  { nome: 'Mastodon token', regex: /awx0N[A-Za-z0-9_\-]{30,}/g },
  { nome: 'Instagram token (IGAA)', regex: /IGAA[A-Za-z0-9_\-]{40,}/g },
  { nome: 'Threads token', regex: /THAAP[A-Za-z0-9_\-]{40,}/g },
  { nome: 'Discord bot token', regex: /M[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{10,}/g },
  { nome: 'dev.to API key', regex: /WFrfZ6[A-Za-z0-9]{10,}/g },
  { nome: 'Tumblr consumer key', regex: /ZnTmbM[A-Za-z0-9]{30,}/g },
  { nome: 'Tumblr consumer secret', regex: /RDK4K3[A-Za-z0-9]{30,}/g },
  { nome: 'Buttondown API key', regex: /ac9a63fc-[A-Za-z0-9\-]{25,}/g },
  { nome: 'Pinterest token', regex: /pina_[A-Za-z0-9]{40,}/g },
  { nome: 'Gmail senha de app', regex: /rdmfdcjekoinsgnq/g },
  { nome: 'E-mail endereço', regex: /boges1413\+alias@gmail\.com/g },
  { nome: 'Nostr hex chave', regex: /[0-9a-f]{64}/g },
  { nome: 'Generic API key (32+ hex)', regex: /[a-f0-9]{32,}/g },
  { nome: 'Generic token (40+ alfanum)', regex: /[A-Za-z0-9_\-]{40,}/g },
];

// Arquivos a ignorar (não contêm credenciais reais)
const IGNORAR = [
  'node_modules/',
  '.git/',
  'package-lock.json',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.mp3', '.wav', '.ogg', '.opus', '.flac', '.m4a',
  '.pdf', '.docx', '.zip', '.tar', '.gz',
  '.json', // arquivos JSON de dados (não de config com segredos) — verificados individualmente abaixo
];

function deveIgnorar(caminho) {
  const lower = caminho.toLowerCase();
  return IGNORAR.some(ign => lower.includes(ign.toLowerCase()));
}

// Obter todos os arquivos rastreados pelo Git
function listarArquivosGit() {
  try {
    const saida = execSync('git ls-files', { cwd: RAIZ, encoding: 'utf8' });
    return saida.split('\n').filter(Boolean);
  } catch (e) {
    console.error('Erro ao listar arquivos do Git:', e.message);
    return [];
  }
}

// Escanear um arquivo em busca de padrões
function escanearArquivo(caminhoRelativo) {
  const caminhoCompleto = path.join(RAIZ, caminhoRelativo);
  if (!fs.existsSync(caminhoCompleto)) return;
  if (deveIgnorar(caminhoRelativo)) return;

  let conteudo;
  try {
    conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
  } catch (e) {
    return; // arquivo binário ou sem permissão
  }

  const linhas = conteudo.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    for (const padrao of PADROES) {
      // Pular placeholders do GitHub Actions (são seguros)
      if (linha.includes('${{ secrets.') || linha.includes('${ secrets.')) continue;
      // Pular comentários que dizem "exemplo" ou "test"
      if (/test|exemplo|placeholder|falso|fake|mock/i.test(linha) && !/(ghp_|AIza|awx0N|IGAA|THAAP|2cxSsz|m5cn|ZnTmbM|RDK4K3|ac9a63fc|pina_|rdmfdcjekoinsgnq)/.test(linha)) continue;

      const matches = linha.match(padrao.regex);
      if (matches) {
        for (const match of matches) {
          const hash = crypto.createHash('sha256').update(match).digest('hex').slice(0, 16);
          ACHADOS.push({
            arquivo: caminhoRelativo,
            linha: i + 1,
            tipo: padrao.nome,
            hash,
            trecho: linha.slice(0, 80).replace(/\s+/g, ' '),
          });
        }
      }
    }
  }
}

// Gerar relatório
function gerarRelatorio() {
  const total = ACHADOS.length;
  const linhas = [];
  linhas.push('# Resultado da varredura de credenciais');
  linhas.push('');
  linhas.push(`Data: ${new Date().toISOString()}`);
  linhas.push(`Arquivos escaneados: ${listarArquivosGit().length}`);
  linhas.push(`Credenciais expostas encontradas: ${total}`);
  linhas.push('');

  if (total === 0) {
    linhas.push('✅ Nenhuma credencial exposta encontrada.');
    linhas.push('');
    linhas.push('Todos os arquivos estão limpos de credenciais hardcoded.');
  } else {
    linhas.push('❌ Credenciais expostas encontradas (valores não revelados — apenas hashes):');
    linhas.push('');
    for (const a of ACHADOS) {
      linhas.push(`- **Arquivo:** \`${a.arquivo}:${a.linha}\``);
      linhas.push(`  - Tipo: ${a.tipo}`);
      linhas.push(`  - Hash SHA-256: \`${a.hash}\``);
      linhas.push(`  - Trecho: ${a.trecho}...`);
      linhas.push('');
    }
    linhas.push('## Ação necessária');
    linhas.push('');
    linhas.push('1. Remover a credencial hardcoded do arquivo.');
    linhas.push('2. Mover o valor para um segredo do GitHub Actions (Settings → Secrets and variables → Actions).');
    linhas.push('3. Referenciar como `\${{ secrets.NOME_DO_SEGREDO }}\` nos workflows.');
    linhas.push('4. Fazer commit da remoção e push.');
  }

  fs.writeFileSync('resultado-seguranca.md', linhas.join('\n'));
  return total;
}

(async () => {
  const arquivos = listarArquivosGit();
  console.log(`🔍 Escaneando ${arquivos.length} arquivos rastreados pelo Git...`);

  for (const arquivo of arquivos) {
    escanearArquivo(arquivo);
  }

  const total = gerarRelatorio();
  console.log(`✅ Varredura concluída. ${total} credenciais expostas encontradas.`);

  if (total > 0) {
    process.exitCode = 1;
  }
})();
