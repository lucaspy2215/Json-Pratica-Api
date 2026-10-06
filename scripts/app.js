// Cuida da TELA: pede os dados ao api.js e mostra no HTML.
import {
  aoReceberResposta, carregarMoedas, cotacoes, historico,
  consultarCep, municipioPorCodigo,
} from "./api.js";
import { classes } from "../design/classes.js";

const $ = (id) => document.getElementById(id);

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

const reais = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (segundos) => new Date(Number(segundos) * 1000).toLocaleDateString("pt-BR");

function mostrarErro(area, erro) {
  area.innerHTML = "";
  area.append(el("p", classes.erro, "Não foi possível carregar: " + erro.message));
}

// JSON cru: mostra a resposta de cada API dentro do <details>

aoReceberResposta((destino, url, dados) => {
  const resumo = Array.isArray(dados) && dados.length > 2 ? dados.slice(0, 2) : dados;
  const aviso = resumo !== dados ? `  (mostrando 2 de ${dados.length} itens)` : "";
  $("url-" + destino).textContent = url + aviso;
  $("json-" + destino).textContent = JSON.stringify(resumo, null, 2);
});


// MÓDULO 1: CÂMBIO

let moedas = [];
let cotacaoAtual = null; // o JSON das cotações: usado por cards, gráfico e conversor
let selecionada = "USD-BRL";
let periodo = 30;

// Favoritos: lista de pares salva no navegador (JSON.stringify / JSON.parse)
const CHAVE_FAV = "painel-brasil-favoritos";
let favoritos = [];
try { favoritos = JSON.parse(localStorage.getItem(CHAVE_FAV)) || []; } catch (e) {}

function alternarFavorito(par) {
  favoritos = favoritos.includes(par) ? favoritos.filter((p) => p !== par) : [...favoritos, par];
  try { localStorage.setItem(CHAVE_FAV, JSON.stringify(favoritos)); } catch (e) {}
  mostrarCards();
}

const chave = (par) => par.replace("-", ""); // a API devolve USDBRL, sem hífen

function mostrarCards() {
  const area = $("cotacoes");
  area.innerHTML = "";

  // Favoritas primeiro
  const ordenadas = [...moedas].sort(
    (a, b) => favoritos.includes(b.par) - favoritos.includes(a.par)
  );

  ordenadas.forEach((m) => {
    const c = cotacaoAtual[chave(m.par)];
    if (!c) return;
    const sobe = Number(c.pctChange) >= 0;
    const estado = m.par === selecionada ? classes.moedaAtiva : classes.moedaNormal;

    const card = el("div", `${classes.moeda} ${estado}`);

    const estrela = el("button", classes.estrela, favoritos.includes(m.par) ? "★" : "☆");
    estrela.setAttribute("aria-label", "Favoritar " + m.nome);
    estrela.onclick = () => alternarFavorito(m.par);

    const corpo = el("button", classes.corpo);
    corpo.append(
      el("p", classes.nome, `${m.nome} (${c.code})`),
      el("p", classes.valor, reais(c.bid)),
      el("p", sobe ? classes.sobe : classes.desce, `${sobe ? "▲" : "▼"} ${c.pctChange}% hoje`),
      el("p", classes.detalhe, `Máx ${reais(c.high)} · Mín ${reais(c.low)}`)
    );
    corpo.onclick = () => {
      selecionada = m.par;
      mostrarCards();
      desenharHistorico();
    };

    card.append(estrela, corpo);
    area.append(card);
  });
}

async function atualizarCotacoes() {
  const area = $("cotacoes");
  area.textContent = "Carregando cotações...";
  try {
    cotacaoAtual = await cotacoes(moedas.map((m) => m.par));
    mostrarCards();
    const primeira = cotacaoAtual[chave(moedas[0].par)];
    $("atualizado").textContent =
      "Atualizado em " + new Date(Number(primeira.timestamp) * 1000).toLocaleString("pt-BR");
    atualizarConversao(); // o mesmo JSON alimenta o conversor
    desenharHistorico();
  } catch (erro) {
    mostrarErro(area, erro);
  }
}

// Gráfico de linha em SVG, feito à mão com os dados do JSON
async function desenharHistorico() {
  const caixa = $("grafico");
  const nome = moedas.find((m) => m.par === selecionada).nome;
  $("titulo-grafico").textContent = `${nome}: últimos ${periodo} dias`;
  caixa.textContent = "Carregando histórico...";

  try {
    const dias = (await historico(selecionada, periodo)).reverse(); // do mais antigo ao mais novo
    const valores = dias.map((d) => Number(d.bid));
    const min = Math.min(...valores);
    const max = Math.max(...valores);

    const L = 600, A = 180, P = 10;
    const x = (i) => P + (i * (L - 2 * P)) / (valores.length - 1 || 1);
    const y = (v) => A - P - ((v - min) / (max - min || 1)) * (A - 2 * P);
    const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(" ");

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${L} ${A}`);
    svg.setAttribute("class", "w-full");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Gráfico da cotação nos últimos ${periodo} dias`);

    const area = document.createElementNS(NS, "polygon");
    area.setAttribute("points", `${x(0)},${A - P} ${pontos} ${x(valores.length - 1)},${A - P}`);
    area.setAttribute("class", "fill-destaque/10");

    const linha = document.createElementNS(NS, "polyline");
    linha.setAttribute("points", pontos);
    linha.setAttribute("class", "fill-none stroke-destaque");
    linha.setAttribute("stroke-width", "2.5");
    linha.setAttribute("stroke-linejoin", "round");

    svg.append(area, linha);
    caixa.innerHTML = "";
    caixa.append(
      svg,
      el("p", classes.legenda,
        `${dataBr(dias[0].timestamp)} a ${dataBr(dias[dias.length - 1].timestamp)} · ` +
        `mín ${reais(min)} · máx ${reais(max)}`)
    );
  } catch (erro) {
    mostrarErro(caixa, erro);
  }
}

// Botões 7 / 30 / 90 dias
document.querySelectorAll("[data-dias]").forEach((botao) => {
  botao.onclick = () => {
    periodo = Number(botao.dataset.dias);
    document.querySelectorAll("[data-dias]").forEach((b) => {
      const ativo = b === botao;
      b.classList.toggle("bg-destaque", ativo);
      b.classList.toggle("text-fundo", ativo);
      b.classList.toggle("border-destaque", ativo);
    });
    desenharHistorico();
  };
});

// Conversor: usa o JSON que já está na memória, sem novo pedido à API
function atualizarConversao() {
  if (!cotacaoAtual) return;
  const par = $("moeda-conv").value;
  const c = cotacaoAtual[chave(par)];
  const valor = Number($("valor").value.replace(",", "."));
  const saida = $("resultado-conv");

  if (!c || !(valor >= 0)) {
    saida.textContent = "Digite um valor válido.";
    return;
  }
  const taxa = Number(c.bid);
  saida.textContent =
    $("direcao").value === "para-reais"
      ? `${valor.toLocaleString("pt-BR")} ${c.code} = ${reais(valor * taxa)}`
      : `${reais(valor)} = ${(valor / taxa).toLocaleString("pt-BR", { maximumFractionDigits: 6 })} ${c.code}`;
  $("taxa-conv").textContent = `Taxa usada: 1 ${c.code} = ${reais(taxa)}`;
}

["valor", "moeda-conv", "direcao"].forEach((id) =>
  $(id).addEventListener("input", atualizarConversao)
);
$("atualizar").onclick = atualizarCotacoes;

// =========================================================
// MÓDULO 2: TERRITÓRIO (ViaCEP -> código IBGE -> API do IBGE)
// =========================================================
function passo(texto, feito) {
  const linha = el("li", classes.passoOk);
  linha.append(
    el("span", feito ? classes.passoNum : classes.passoEspera, feito ? "✓" : "…"),
    el("span", "", texto)
  );
  $("cadeia").append(linha);
}

function cartoes(area, pares) {
  area.innerHTML = "";
  pares.forEach(([rotulo, valor]) => {
    const caixa = el("div", classes.campo);
    caixa.append(el("p", classes.rotulo, rotulo), el("p", classes.dado, valor || "—"));
    area.append(caixa);
  });
}

$("form-cep").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const cep = $("cep").value.replace(/\D/g, ""); // só números
  $("cadeia").innerHTML = "";
  $("resultado-cep").innerHTML = "";
  $("resultado-ibge").innerHTML = "";

  if (cep.length !== 8) {
    mostrarErro($("resultado-cep"), new Error("digite um CEP com 8 números."));
    return;
  }

  try {
    // Chamada 1: ViaCEP
    passo("Consultando o ViaCEP com o CEP " + cep + "...", false);
    const d = await consultarCep(cep);
    $("cadeia").innerHTML = "";
    passo(`ViaCEP respondeu: ${d.localidade} - ${d.uf}`, true);
    cartoes($("resultado-cep"), [
      ["Rua", d.logradouro], ["Bairro", d.bairro],
      ["Cidade", `${d.localidade} - ${d.uf}`], ["DDD", d.ddd],
    ]);

    // O JSON do ViaCEP traz o campo "ibge": é a ponte para a próxima API
    if (!d.ibge) throw new Error("o ViaCEP não informou o código do IBGE.");
    passo(`Pegamos o campo "ibge" do JSON: ${d.ibge}`, true);

    // Chamada 2: IBGE, usando o código da chamada 1
    passo("Consultando o IBGE com esse código...", false);
    const m = await municipioPorCodigo(d.ibge);
    $("cadeia").lastChild.remove();
    passo(`IBGE respondeu: dados do município de ${m.nome}`, true);

    const uf = m.microrregiao?.mesorregiao?.UF;
    cartoes($("resultado-ibge"), [
      ["Município (IBGE)", m.nome],
      ["Código IBGE", String(m.id)],
      ["Microrregião", m.microrregiao?.nome],
      ["Mesorregião", m.microrregiao?.mesorregiao?.nome],
      ["Estado", uf ? `${uf.nome} (${uf.sigla})` : ""],
      ["Região do país", uf?.regiao?.nome],
    ]);
  } catch (erro) {
    mostrarErro($("resultado-cep"), erro);
  }
});

// =========================================================
// Início
// =========================================================
try {
  moedas = await carregarMoedas();
  moedas.forEach((m) => {
    const opcao = el("option", "", `${m.nome} (${m.par.split("-")[0]})`);
    opcao.value = m.par;
    $("moeda-conv").append(opcao);
  });
  atualizarCotacoes();
} catch (erro) {
  mostrarErro($("cotacoes"), new Error(erro.message + ". Abra o projeto com o Live Server ou publicado no GitHub Pages."));
}