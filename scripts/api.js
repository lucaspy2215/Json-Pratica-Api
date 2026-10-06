// Cuida só das APIs: cada função busca um endpoint e devolve o JSON já convertido.

let ouvinte = () => {};


export function aoReceberResposta(funcao) {
  ouvinte = funcao;
}

async function buscar(destino, url) {
  const resposta = await fetch(url);

  if (!resposta.ok) throw new Error("A API respondeu com status " + resposta.status);
  const dados = await resposta.json(); // texto JSON -> objeto/array
  ouvinte(destino, url, dados);
  return dados;
}

// Configuração local: quais moedas mostrar (arquivo json/moedas.json)
export async function carregarMoedas() {
  const resposta = await fetch("json/moedas.json");
  if (!resposta.ok) throw new Error("Não achei json/moedas.json");
  return resposta.json();
}

// AwesomeAPI: cotação atual. Ex.: USD-BRL,EUR-BRL
export function cotacoes(pares) {
  return buscar("cotacoes", "https://economia.awesomeapi.com.br/json/last/" + pares.join(","));
}

// AwesomeAPI: histórico diário. Ex.: USD-BRL, 30 dias
export function historico(par, dias = 30) {
  return buscar("historico", `https://economia.awesomeapi.com.br/json/daily/${par}/${dias}`);
}

// ViaCEP: endereço a partir do CEP
export async function consultarCep(cep) {
  const dados = await buscar("cep", `https://viacep.com.br/ws/${cep}/json/`);
  if (dados.erro) throw new Error("CEP não encontrado.");
  return dados;
}

// IBGE: detalhes do município a partir do código que o ViaCEP devolveu.
// É aqui que uma API "conversa" com a outra: o JSON de uma vira a entrada da próxima.
export function municipioPorCodigo(codigo) {
  return buscar("ibge", `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${codigo}`);
}