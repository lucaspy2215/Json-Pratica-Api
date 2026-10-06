

const sombra = "transition-shadow motion-reduce:transition-none hover:shadow-[0_6px_24px_rgba(88,166,255,0.35)]";

export const classes = {
  moeda: `relative rounded-xl border bg-cartao p-4 ${sombra}`,
  moedaAtiva: "border-destaque ring-2 ring-destaque/30",
  moedaNormal: "border-borda",
  corpo: "block w-full text-left",
  estrela: "absolute right-3 top-3 text-xl leading-none text-aviso transition-transform hover:scale-125",

  nome: "pr-7 text-sm text-suave",
  valor: "mt-1 text-2xl font-bold",
  sobe: "text-sm font-semibold text-ok",
  desce: "text-sm font-semibold text-perigo",
  detalhe: "mt-2 text-xs text-suave",

  // Cards de resultado (endereço e município)
  campo: "rounded-lg border border-borda bg-codigo p-3",
  rotulo: "text-xs uppercase tracking-wider text-suave",
  dado: "font-medium",

  // Passos da cadeia de APIs
  passoOk: "flex items-start gap-2 text-sm",
  passoNum: "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-xs font-bold text-fundo",
  passoEspera: "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-borda text-xs font-bold text-suave",

  erro: "rounded-lg border border-perigo/40 bg-perigo/10 p-3 text-sm text-perigo",
  legenda: "mt-2 text-xs text-suave",
};