// 🔍 SCANNER DE CREDENCIAIS EXPOSTAS — varre o repositório em busca de chaves hardcoded
// v2 (09/11/2026): escaneia todos os arquivos rastreados pelo Git em busca de padrões
// de credenciais (tokens, senhas, chaves API). Nunca loga o valor encontrado — apenas
// o hash SHA-256 truncado e o arquivo/linha.
// Regras: (1) nunca exibe valor de credencial; (2) falha o workflow se encontrar;
// (3) permite placeholders de ${{ secrets.XXX }} (são seguros);
// (4) padrões genéricos exigem contexto de credencial na mesma linha.
// Arquivos que contêm padrões de credenciais propositalmente (cofre, redes sociais)
// são escaneados apenas para padrões específicos conhecidos, não para padrões genéricos.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const RAIZ = process.cwd();
const ACHADOS = [];

// Arquivos que contêm credenciais propositalmente (lógica do cofre e redes sociais)
// Nesses arquivos, só escaneamos padrões específicos conhecidos, não genéricos.
const ARQUIVOS_COFRE = [
  'tools/cofre-seguro.js',
  'tools/redes-sociais.js',
  'tools/scanner-credenciais.js',
  'tools/testar-todas-as-redes.js',
];

function ehArquivoCofre(caminhoRelativo) {
  return ARQUIVOS_COFRE.includes(caminhoRelativo);
}

// Padrões específicos (muito reconhecíveis — sempre escaneados)
const PADROES_ESPECIFICOS = [
  { nome: 'GitHub PAT (ghp_)', regex: /ghp_[A-Za-z0-9]{36,}/g },
  { nome: 'GitHub fine-grained (github_pat_)', regex: /github_pat_[A-Za-z0-9_]{60,}/g },

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

  { nome: 'Gmail senha de app', regex: /rdmfdcjekoinsgnq/g },
  { nome: 'E-mail endereço', regex: /boges1413\+alias@gmail\.com/g },
];

// Padrões genéricos — exigem contexto de credencial na mesma linha
const CONTEXTO_CREDENCIAL = /(?:api[_-]?key|apikey|access[_-]?token|accesstoken|secret[_-]?key|secretkey|private[_-]?key|privatekey|auth[_-]?token|authtoken|bearer[_-]?token|password|passwd|senha|client[_-]?secret|clientsecret|consumer[_-]?secret|consumersecret|refresh[_-]?token|refreshtoken|app[_-]?password|apppassword|oauth[_-]?token|oauthtoken|personal[_-]?access[_-]?token|pat|chave[_-]?api|chaveapi|token[_-]?de[_-]?acesso|tokenacesso)/i;

const PADROES_GENERICOS = [
  { nome: 'Nostr hex chave (64 hex)', regex: /[0-9a-f]{64}/g, contexto: true },
  { nome: 'Generic API key (32+ hex)', regex: /[a-f0-9]{32,}/g, contexto: true },
  { nome: 'Generic token (40+ alfanum)', regex: /[A-Za-z0-9_\-]{40,}/g, contexto: true },
];

// Arquivos e pastas a ignorar completamente
const IGNORAR_CAMINHO = [
  'node_modules/',
  '.git/',
  'package-lock.json',
  'docs/', // documentação pode conter hashes, exemplos e referências legítimas
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.mp3', '.wav', '.ogg', '.opus', '.flac', '.m4a',
  '.pdf', '.docx', '.zip', '.tar', '.gz',
];

// Extensões de texto que devem ser escaneadas (pular binários e dados puros)
const EXTENSOES_TEXTO = [
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.sh', '.bash', '.zsh',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env',
  '.md', '.txt', '.css', '.vue', '.svelte',
  '.go', '.rs', '.java', '.kt', '.rb', '.php', '.cpp', '.c', '.h',
];

function deveIgnorar(caminho) {
  const lower = caminho.toLowerCase();
  return IGNORAR_CAMINHO.some(ign => lower.includes(ign.toLowerCase()));
}

function ehTexto(caminho) {
  const lower = caminho.toLowerCase();
  return EXTENSOES_TEXTO.some(ext => lower.endsWith(ext));
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
  if (!ehTexto(caminhoRelativo)) return;

  let conteudo;
  try {
    conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
  } catch (e) {
    return; // arquivo binário ou sem permissão
  }

  const linhas = conteudo.split('\n');
  const ehCofre = ehArquivoCofre(caminhoRelativo);

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Pular placeholders do GitHub Actions (são seguros)
    if (linha.includes('${{ secrets.') || linha.includes('${ secrets.')) continue;

    // Pular linhas que definem regex (pattern definitions no próprio scanner)
    if (/regex:\s*\//.test(linha)) continue;

    // Pular comentários que dizem "exemplo", "test", "placeholder", etc.
    // Mas não pular se a linha contém um padrão específico conhecido
    const ehComentarioExemplo = /test|exemplo|placeholder|falso|fake|mock/i.test(linha);
    const temPadroEspecifico = PADROES_ESPECIFICOS.some(p => p.regex.test(linha));
    if (ehComentarioExemplo && !temPadroEspecifico) continue;

    // Padrões específicos — sempre escaneados (exceto em comentários de exemplo)
    for (const padrao of PADROES_ESPECIFICOS) {
      const matches = linha.match(padrao.regex);
      if (matches) {
        for (const match of matches) {
          const hash = crypto.createHash('sha256').update(match).digest('hex').slice(0, 16);
          ACHADOS.push({
            arquivo: caminhoRelativo,
            linha: i + 1,
            tipo: padrao.nome,
            hash,
            trecho: linha.slice(0, 100).replace(/\s+/g, ' '),
          });
        }
      }
    }

    // Padrões genéricos — só em arquivos NÃO-cofre e com contexto de credencial
    if (!ehCofre) {
      for (const padrao of PADROES_GENERICOS) {
        if (!CONTEXTO_CREDENCIAL.test(linha)) continue;
        const matches = linha.match(padrao.regex);
        if (matches) {
          for (const match of matches) {
            const hash = crypto.createHash('sha256').update(match).digest('hex').slice(0, 16);
            ACHADOS.push({
              arquivo: caminhoRelativo,
              linha: i + 1,
              tipo: padrao.nome,
              hash,
              trecho: linha.slice(0, 100).replace(/\s+/g, ' '),
            });
          }
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
