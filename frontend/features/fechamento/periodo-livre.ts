import { rotuloDoIntervalo } from "./painel-dados";

/**
 * O periodo que se escolhe clicando no calendario: um clique no primeiro dia,
 * outro no ultimo.
 *
 * Existe para a planilha do consumo que vai ao financeiro no dia 25, do dia 26
 * do mes anterior ate o 25 — que nao e dia, nem semana, nem mes. Escolher pelo
 * calendario, e nao digitando a data, e o pedido da dona: ela ve o mes e
 * aponta.
 *
 * `ate` nulo e o periodo pela metade, esperando o segundo clique.
 */
export type PeriodoLivre = { de: string | null; ate: string | null };

export const PERIODO_VAZIO: PeriodoLivre = { de: null, ate: null };

/** O periodo depois de um clique em `dia`. */
export const escolherDia = (atual: PeriodoLivre, dia: string): PeriodoLivre => {
  // Sem inicio, ou com o periodo ja fechado, o clique comeca outro: quem
  // errou o fim clica de novo no comeco, sem botao de limpar.
  if (!atual.de || atual.ate) return { de: dia, ate: null };
  // Clicar antes do inicio nao e erro, e comecar pelo fim: o periodo e o
  // mesmo, entao as pontas trocam em vez de a tela recusar.
  return dia < atual.de ? { de: dia, ate: atual.de } : { de: atual.de, ate: dia };
};

/** Como o dia aparece no calendario: as pontas cheias, o meio suave. */
export const posicaoNoPeriodo = (
  dia: string,
  periodo: PeriodoLivre,
): "ponta" | "meio" | null => {
  if (dia === periodo.de || dia === periodo.ate) return "ponta";
  if (periodo.de && periodo.ate && dia > periodo.de && dia < periodo.ate) {
    return "meio";
  }
  return null;
};

/** O periodo por extenso — ou o que falta clicar, enquanto ele nao fecha. */
export const rotuloDoPeriodoLivre = (periodo: PeriodoLivre) =>
  !periodo.de
    ? "Clique no primeiro dia"
    : !periodo.ate
      ? "Agora clique no último dia"
      : rotuloDoIntervalo(periodo.de, periodo.ate);
