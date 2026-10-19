import { arvoreDoBloco } from "./banco-da-tela";
import type { BlocoDoResumo, ResumoDoExtrato } from "./services/banco";

// ---------- fluxo de caixa ----------

/** Uma barra do gráfico: um dia, ou uma semana quando o período é longo.
 *  `saidas` vem como tamanho (positivo): o desenho é que a põe para baixo. */
export type PontoDoFluxo = {
  inicio: string;
  rotulo: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

/** Acima disto, barra por dia fica fina demais para ler e para passar o dedo. */
const DIAS_ATE_AGRUPAR = 62;

const DIA_EM_MS = 24 * 60 * 60 * 1000;

// Tudo em UTC e em string AAAA-MM-DD, como o resto do extrato: Date local
// troca o dia na virada do fuso.
const paraMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const paraIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const diaEMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const centavos = (valor: number) => Math.round(valor * 100) / 100;

/** A segunda-feira da semana do dia. */
const segundaDe = (ms: number) => {
  const diaDaSemana = new Date(ms).getUTCDay(); // 0 = domingo
  return ms - ((diaDaSemana + 6) % 7) * DIA_EM_MS;
};

/**
 * O fluxo do resumo pronto para desenhar.
 *
 * O servidor só manda os dias com movimento; aqui os dias vazios entram com
 * zero, senão o gráfico encosta a sexta na segunda e parece que o dinheiro
 * entrou todo dia. Em período longo (mais de dois meses), uma barra por semana.
 */
export const serieDoFluxo = (porDia: NonNullable<ResumoDoExtrato["por_dia"]>): PontoDoFluxo[] => {
  if (porDia.length === 0) return [];

  const primeiro = paraMs(porDia[0].data);
  const ultimo = paraMs(porDia[porDia.length - 1].data);
  const porSemana = (ultimo - primeiro) / DIA_EM_MS + 1 > DIAS_ATE_AGRUPAR;
  const chaveDe = (ms: number) => (porSemana ? segundaDe(ms) : ms);

  const baldes = new Map<number, { entradas: number; saidas: number }>();
  const passo = porSemana ? 7 * DIA_EM_MS : DIA_EM_MS;
  for (let ms = chaveDe(primeiro); ms <= ultimo; ms += passo) {
    baldes.set(ms, { entradas: 0, saidas: 0 });
  }
  for (const dia of porDia) {
    const balde = baldes.get(chaveDe(paraMs(dia.data)));
    if (!balde) continue;
    balde.entradas += Number(dia.entradas);
    balde.saidas += Math.abs(Number(dia.saidas));
  }

  return [...baldes.entries()].map(([ms, { entradas, saidas }]) => ({
    inicio: paraIso(ms),
    rotulo: diaEMes(paraIso(ms)),
    entradas: centavos(entradas),
    saidas: centavos(saidas),
    saldo: centavos(entradas - saidas),
  }));
};

// ---------- para onde foi ----------

export type GastoDoGrupo = { nome: string; valor: number };

/** Seis barras e um "Outros": mais que isso a pergunta "onde foi a maior
 *  parte" some no meio de barra pequena. */
const GRUPOS_NO_GRAFICO = 6;

/**
 * Os pagamentos somados por grupo do plano de contas (Pessoal, Operacional...),
 * do maior para o menor, em tamanho. Usa a mesma árvore do resumo, para o
 * número do gráfico ser o mesmo da lista embaixo.
 */
export const gastosPorGrupo = (bloco: Pick<BlocoDoResumo, "categorias">): GastoDoGrupo[] => {
  const grupos = arvoreDoBloco(bloco)
    .map((no) => ({ nome: no.nome, valor: centavos(Math.abs(no.valor)) }))
    .filter((grupo) => grupo.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));

  if (grupos.length <= GRUPOS_NO_GRAFICO + 1) return grupos;
  const resto = grupos.slice(GRUPOS_NO_GRAFICO);
  return [
    ...grupos.slice(0, GRUPOS_NO_GRAFICO),
    { nome: "Outros", valor: centavos(resto.reduce((soma, grupo) => soma + grupo.valor, 0)) },
  ];
};
