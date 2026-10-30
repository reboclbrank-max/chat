# -*- coding: utf-8 -*-
"""Rodada 93: tabela local de capitais + conserta a rota 'capital d(a|o|e|os|as)'.
Antes, país/estado feminino ('a França', 'a Argentina', 'a Paraíba') não casava e a
pergunta ia para o modelo — onde tomava 429 e virava 'sem resposta'."""
import re, io

paises = {
 'brasil': 'Brasília', 'argentina': 'Buenos Aires', 'frança': 'Paris', 'japão': 'Tóquio',
 'estados unidos': 'Washington, D.C.', 'eua': 'Washington, D.C.', 'china': 'Pequim',
 'índia': 'Nova Délhi', 'itália': 'Roma', 'espanha': 'Madri', 'portugal': 'Lisboa',
 'alemanha': 'Berlim', 'reino unido': 'Londres', 'inglaterra': 'Londres', 'canadá': 'Ottawa',
 'méxico': 'Cidade do México', 'rússia': 'Moscou', 'austrália': 'Camberra', 'egito': 'Cairo',
 'áfrica do sul': 'Pretória', 'nigéria': 'Abuja', 'quênia': 'Nairóbi', 'marrocos': 'Rabat',
 'argélia': 'Argel', 'angola': 'Luanda', 'moçambique': 'Maputo', 'cabo verde': 'Praia',
 'guiné-bissau': 'Bissau', 'timor-leste': 'Díli', 'uruguai': 'Montevidéu', 'paraguai': 'Assunção',
 'chile': 'Santiago', 'colômbia': 'Bogotá', 'peru': 'Lima', 'venezuela': 'Caracas', 'equador': 'Quito',
 'bolívia': 'Sucre', 'cuba': 'Havana', 'haiti': 'Porto Príncipe', 'república dominicana': 'Santo Domingo',
 'guatemala': 'Cidade da Guatemala', 'honduras': 'Tegucigalpa', 'nicarágua': 'Manágua',
 'costa rica': 'San José', 'panamá': 'Cidade do Panamá', 'suécia': 'Estocolmo', 'noruega': 'Oslo',
 'dinamarca': 'Copenhague', 'finlândia': 'Helsinque', 'holanda': 'Amsterdã', 'países baixos': 'Amsterdã',
 'bélgica': 'Bruxelas', 'suíça': 'Berna', 'áustria': 'Viena', 'polônia': 'Varsóvia',
 'república tcheca': 'Praga', 'hungria': 'Budapeste', 'grécia': 'Atenas', 'turquia': 'Ancara',
 'irlanda': 'Dublin', 'islândia': 'Reiquiavique', 'ucrânia': 'Kiev', 'romênia': 'Bucareste',
 'bulgária': 'Sófia', 'sérvia': 'Belgrado', 'croácia': 'Zagreb', 'eslovênia': 'Liubliana',
 'eslováquia': 'Bratislava', 'letônia': 'Riga', 'lituânia': 'Vilnius', 'estônia': 'Tallinn',
 'albânia': 'Tirana', 'macedônia do norte': 'Skopje', 'bósnia e herzegovina': 'Sarajevo',
 'montenegro': 'Podgorica', 'malta': 'Valeta', 'chipre': 'Nicósia', 'luxemburgo': 'Luxemburgo',
 'mônaco': 'Mônaco', 'vaticano': 'Cidade do Vaticano', 'andorra': 'Andorra-a-Velha',
 'san marino': 'San Marino', 'liechtenstein': 'Vaduz', 'armênia': 'Erevan', 'geórgia': 'Tbilisi',
 'azerbaijão': 'Baku', 'cazaquistão': 'Astana', 'uzbequistão': 'Tashkent', 'afeganistão': 'Cabul',
 'paquistão': 'Islamabad', 'bangladesh': 'Dacca', 'sri lanka': 'Colombo', 'nepal': 'Katmandu',
 'butão': 'Timbu', 'mianmar': 'Naypyidaw', 'tailândia': 'Bangkok', 'vietnã': 'Hanói',
 'camboja': 'Phnom Penh', 'laos': 'Vientiane', 'malásia': 'Kuala Lumpur', 'indonésia': 'Jacarta',
 'filipinas': 'Manila', 'singapura': 'Singapura', 'brunei': 'Bandar Seri Begawan',
 'coreia do sul': 'Seul', 'coreia do norte': 'Pyongyang', 'mongólia': 'Ulã Bator', 'iraque': 'Bagdá',
 'irã': 'Teerã', 'síria': 'Damasco', 'líbano': 'Beirute', 'israel': 'Jerusalém', 'jordânia': 'Amã',
 'arábia saudita': 'Riad', 'emirados árabes unidos': 'Abu Dhabi', 'catar': 'Doha',
 'kuwait': 'Cidade do Kuwait', 'omã': 'Mascate', 'iêmen': 'Sana', 'barein': 'Manama',
 'turcomenistão': 'Asgabate', 'tajiquistão': 'Duchambe', 'quirguistão': 'Bisqueque',
 'etiópia': 'Addis Abeba', 'somália': 'Mogadíscio', 'sudão': 'Cartum', 'sudão do sul': 'Juba',
 'tunísia': 'Túnis', 'líbia': 'Trípoli', 'gana': 'Acra', 'senegal': 'Dacar', 'camarões': 'Yaoundé',
 'costa do marfim': 'Yamoussoukro', 'mali': 'Bamako', 'niger': 'Niamey', 'chade': 'N\u2019Djamena',
 'uganda': 'Kampala', 'tanzânia': 'Dodoma', 'zâmbia': 'Lusaka', 'zimbábue': 'Harare',
 'botswana': 'Gaborone', 'namíbia': 'Windhoek', 'ruanda': 'Kigali', 'burundi': 'Gitega',
 'madagascar': 'Antananarivo', 'maurício': 'Port Louis', 'malauí': 'Lilongwe', 'lesoto': 'Maseru',
 'essuatíni': 'Mbabane', 'gabão': 'Libreville', 'congo': 'Brazzaville',
 'república democrática do congo': 'Kinshasa', 'nova zelândia': 'Wellington', 'fiji': 'Suva',
 'papua-nova guiné': 'Port Moresby', 'guiné': 'Conacri', 'serra leoa': 'Freetown',
 'libéria': 'Monróvia', 'togo': 'Lomé', 'benim': 'Porto-Novo', 'burquina fasso': 'Uagadugu',
 'mauritânia': 'Nouakchott', 'gâmbia': 'Banjul', 'eritreia': 'Asmara', 'djibuti': 'Djibuti',
 'guiné equatorial': 'Malabo', 'comores': 'Moroni', 'seicheles': 'Victoria', 'maldivas': 'Malé',
 'bahamas': 'Nassau', 'jamaica': 'Kingston', 'trinidad e tobago': 'Porto de Espanha',
 'barbados': 'Bridgetown', 'belize': 'Belmopan', 'el salvador': 'San Salvador',
 'groenlândia': 'Nuuk', 'porto rico': 'San Juan', 'eslováquia ': 'Bratislava',
}
estados = {
 'acre': 'Rio Branco', 'alagoas': 'Maceió', 'amapá': 'Macapá', 'amazonas': 'Manaus',
 'bahia': 'Salvador', 'ceará': 'Fortaleza', 'distrito federal': 'Brasília',
 'espírito santo': 'Vitória', 'goiás': 'Goiânia', 'maranhão': 'São Luís', 'mato grosso': 'Cuiabá',
 'mato grosso do sul': 'Campo Grande', 'minas gerais': 'Belo Horizonte', 'pará': 'Belém',
 'paraíba': 'João Pessoa', 'paraná': 'Curitiba', 'pernambuco': 'Recife', 'piauí': 'Teresina',
 'rio de janeiro': 'Rio de Janeiro', 'rio grande do norte': 'Natal', 'rio grande do sul': 'Porto Alegre',
 'rondônia': 'Porto Velho', 'roraima': 'Boa Vista', 'santa catarina': 'Florianópolis',
 'são paulo': 'São Paulo', 'sergipe': 'Aracaju', 'tocantins': 'Palmas',
}
tab = {}
tab.update(paises)
tab.update(estados)

linhas = ',\n'.join("    '%s': '%s'" % (k, v) for k, v in sorted(tab.items()))

caminho = '/home/user/chat-v2/roteador-ia.js'
s = io.open(caminho, encoding='utf-8').read()

bloco = ("  /* capitais: países mais perguntados + as 27 unidades do Brasil.\n"
         "     Wikidata continua como segunda opção para a cauda longa; esta tabela não tem rede nem limite. */\n"
         "  var CAPITAIS = {\n%s\n  };\n\n  var FATOS = [" % linhas)
assert 'var CAPITAIS' not in s
s = s.replace('  var FATOS = [', bloco, 1)

antigo = """    if ((m = q.match(/qual\\s+(?:é\\s+)?a\\s+capital\\s+d[eo]\\s+(.+?)\\?*$/i))) {
      var cap = await this._wikidata(m[1].trim(), 'P36', 'capital');
      if (cap) return { texto: cap.valor, ferramenta: 'capital', fonte: cap.fonte };"""
novo = """    if ((m = q.match(/qual\\s+(?:é\\s+)?a\\s+capital\\s+d(?:a|o|e|os|as)?\\s+(.+?)\\?*$/i))) {
      var alvoCap = m[1].trim();
      var local = CAPITAIS[semAcento(alvoCap)];
      if (local) return { texto: local, ferramenta: 'capital', fonte: 'tabela local de capitais' };
      var cap = await this._wikidata(alvoCap, 'P36', 'capital');
      if (cap) return { texto: cap.valor, ferramenta: 'capital', fonte: cap.fonte };"""
assert antigo in s, 'rota de capital não encontrada'
s = s.replace(antigo, novo, 1)

io.open(caminho, 'w', encoding='utf-8').write(s)
print('tabela de capitais:', len(tab), 'entradas; rota d(a|o|e|os|as) corrigida')
