#!/usr/bin/env node
// Atualização manual, sem segredos nem perguntas de usuários. Não é workflow agendado.
// Os extratos são dados públicos, não instruções e não certificam as respostas.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const titulos = [
  'Água','Abastecimento público de água','Ciclo hidrológico','Estação de tratamento de água',
  'Biblioteca','Biblioteconomia','Energia solar fotovoltaica','Energia eólica','Energia hidrelétrica',
  'Fotossíntese','Célula','Vírus','Bactéria','Vacina','Sistema imunológico','Antibiótico',
  'Revolução Industrial','Segunda Guerra Mundial','História do Brasil','Escravidão no Brasil',
  'Evolução','Seleção natural','Ecossistema','Biodiversidade','Desmatamento','Reciclagem','Compostagem',
  'Inflação','Juro','Juro composto','Produto interno bruto','Imposto','Educação financeira',
  'Função (programação)','Inteligência artificial','Internet','Lei Geral de Proteção de Dados Pessoais',
  'Clima','Tempo (meteorologia)','Atmosfera terrestre','Oceano','Mudança do clima','Céu',
  'Refrigeração','Sono','Alimentação','Segurança alimentar','Agricultura','Impermeabilização do solo',
  'Democracia','Direitos humanos','Constituição','Saneamento','Sistema Solar','Lua','Gravidade',
  'Poema','Teatro','Música','Pintura','Astronomia','Geologia','Fração (matemática)',
  'Eletricidade','Magnetismo','Átomo','Tabela periódica','Substância química','Sustentabilidade',
  'Erosão','Solo','Amazônia','Nordeste do Brasil','Cidadania','Saúde pública','Transporte público',
  'Acessibilidade','Média aritmética','Probabilidade','Algoritmo','Computador','Linguagem de programação'
];
// Trechos curtos, literais, com reticências separando partes não contíguas.
// Exemplos locais não são regras universais; URLs e contexto ficam visíveis no resultado.
const oficiais = [
  { id: 'educacao-industrial', titulo: 'Secretaria de Educação de Goiânia: cidades e industrialização', url: 'https://sme.goiania.go.gov.br/conexaoescola/ensino_fundamental/historia-as-cidades-e-a-industrializacao/', licenca: 'trechos citados para referência com atribuição', revisao: null,
    termos: 'revolução industrial industrialização máquinas vapor cidade campo história trabalho',
    trecho: '“A Revolução Industrial, iniciada na Inglaterra no século XVIII, é um exemplo de processo que alterou o modo como as atividades produtivas humanas são realizadas e contribuiu para o aumento da população nas cidades.” … “Várias famílias migraram do campo para a cidade em busca de novas oportunidades de emprego.”',
    escopo: 'Material didático: uma síntese, não um estudo exaustivo.' },
  { id: 'bndes-fotovoltaica', titulo: 'BNDES: energia solar fotovoltaica', url: 'https://blogdodesenvolvimento.bndes.gov.br/categoria/infraestrutura/A-energia-solar-no-Brasil/', licenca: 'trechos citados para referência com atribuição', revisao: null,
    termos: 'energia solar fotovoltaica luz sol paineis painel placas modulos celulas corrente eletricidade',
    trecho: '“No efeito fotovoltaico (FV), a obtenção da energia elétrica ocorre pela incidência de fótons da radiação solar sobre um material semicondutor” … “células solares, que interligadas constituem o núcleo dos chamados painéis solares.”',
    escopo: 'Descrição dos componentes; não afirma que toda instalação tenha bateria.' },
  { id: 'caesb-agua', titulo: 'CAESB: tratamento convencional de água', url: 'https://www.caesb.df.gov.br/como-a-agua-e-tratada/', licenca: 'trechos citados para referência com atribuição', revisao: null,
    termos: 'agua chuva manancial rio represa torneira residencias abastecimento tratamento eta filtração floculação distribuição',
    trecho: '“A água bruta é retirada do manancial (rios, lagos ou represas) e encaminhada para o início do processo de tratamento” … “Dependendo da qualidade da água a ser tratada, algumas destas etapas poderão não ser necessárias” … “Coagulação e Floculação” … “Decantação” … “Filtração” … “Desinfecção & Fluoretação”.',
    escopo: 'Exemplo de tratamento convencional; etapas podem variar.' },
  { id: 'itajai-biblioteca', titulo: 'Biblioteca Municipal de Itajaí: acervo, empréstimos e reservas', url: 'https://servicos.itajai.sc.gov.br/servico/25-biblioteca_municipal.html', licenca: 'trechos citados para referência com atribuição', revisao: null,
    termos: 'biblioteca catalogo acervo livro livros emprestimo emprestar emprestado reserva consulta organizar',
    trecho: '“Quando o título desejado estiver emprestado, é possível realizar a reserva on-line e, quando o exemplar for devolvido, automaticamente fica disponível por até 48 horas para o próximo leitor retirar.” … “A pesquisa é feita pelo site … digitando no campo ‘Expressão’ o título do livro, ou um autor ou assunto a ser procurado.”',
    escopo: 'Regras de uma biblioteca específica; outras bibliotecas podem ter regras diferentes.' }
];
function recortar(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= 900) return s;
  const bruto = s.slice(0, 900);
  const ultimo = Math.max(bruto.lastIndexOf('. '), bruto.lastIndexOf('? '), bruto.lastIndexOf('! '));
  return ultimo > 180 ? bruto.slice(0, ultimo + 1).trim() : '';
}
async function main() {
  const fontes = oficiais.slice(), ausentes = [];
  for (let i = 0; i < titulos.length; i += 15) {
    const lote = titulos.slice(i, i + 15);
    const q = new URLSearchParams({action:'query',titles:lote.join('|'),prop:'extracts|revisions',explaintext:'1',exintro:'1',exlimit:'15',rvprop:'ids|timestamp',redirects:'1',format:'json',origin:'*'});
    const resposta = await fetch('https://pt.wikipedia.org/w/api.php?' + q, {
      headers: { 'User-Agent': 'ReboclChat/1.0 (https://github.com/reboclbrank-max/chat)', Accept:'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    if (!resposta.ok) throw new Error('Wikipédia: HTTP ' + resposta.status);
    const corpo = await resposta.json();
    if (corpo.error || !corpo.query || !corpo.query.pages) throw new Error('Wikipédia: resposta sem páginas');
    for (const p of Object.values(corpo.query.pages)) {
      const r = p.revisions && p.revisions[0], trecho = recortar(p.extract);
      if (!r || !r.revid || !trecho || p.missing !== undefined) { ausentes.push(p.title); continue; }
      fontes.push({ id:'wiki-' + p.pageid, titulo:'Wikipédia: ' + p.title,
        url:'https://pt.wikipedia.org/w/index.php?oldid=' + r.revid, licenca:'CC BY-SA 4.0 e GFDL; veja o histórico e a licença na página',
        revisao:r.timestamp, termos:p.title, trecho, escopo:'Extrato enciclopédico; não substitui fonte especializada ou atualizada.' });
    }
    // Etiqueta de leitura: uma chamada por vez, com intervalo, sem tentativas agressivas.
    if (i + 15 < titulos.length) await new Promise(r => setTimeout(r, 1200));
  }
  const saida = { versao:1, coletadoEm:new Date().toISOString(), nota:'Trechos públicos para orientação, não respostas prontas. Conjunto limitado e potencialmente desatualizado; a seleção não comprova que as afirmações geradas são verdadeiras.', fontes, ausentes };
  fs.writeFileSync(path.join(ROOT, 'fontes-publicas.json'), JSON.stringify(saida, null, 2) + '\n');
  console.log('Fontes registradas:', fontes.length, '; sem extrato:', ausentes.join(', ') || 'nenhuma');
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { titulos, oficiais, recortar };
