import { digitosParaDecimal } from "@/features/fechamento/components/campos";
import type { DespesaDoTurno } from "@/features/fechamento/services/fechamentos";

/** Uma linha da lista de despesas enquanto esta sendo preenchida: a descricao
 *  como foi digitada e o valor em centavos. */
export type LinhaDeDespesa = { chave: number; descricao: string; valor: string };

type Resultado =
  | { ok: true; despesas: DespesaDoTurno[] }
  | { ok: false; erro: string };

/**
 * As linhas digitadas viram as despesas do turno — ou o motivo de nao virarem.
 *
 * Sem cadastro para casar, ao contrario do consumo: "gas" e texto livre, e
 * obrigar um cadastro faria a loja parar no meio do fechamento para criar
 * "remedio".
 *
 * Linha em branco sai sem reclamar — e o gerente que abriu mais uma e nao
 * usou. Linha pela metade, nao: descricao sem valor ou valor sem descricao e o
 * meio do caminho, e mandar assim perderia o gasto em silencio. Como a despesa
 * SOMA no total do caixa, uma linha perdida faz a loja aparecer vendendo menos
 * do que vendeu.
 */
export const montarDespesasDoTurno = (linhas: LinhaDeDespesa[]): Resultado => {
  const despesas: DespesaDoTurno[] = [];

  for (const linha of linhas) {
    const descricao = linha.descricao.trim();
    const centavos = Number(linha.valor || "0");
    if (!descricao && centavos === 0) continue;

    if (!descricao) {
      return { ok: false, erro: "Diga no que foi gasto." };
    }
    if (centavos === 0) {
      // O nome do gasto no erro: com cinco linhas na tela, "preencha os
      // campos" nao diz qual delas esta pela metade.
      return { ok: false, erro: `Informe quanto foi gasto com ${descricao}.` };
    }

    despesas.push({ descricao, valor: digitosParaDecimal(linha.valor) });
  }

  return { ok: true, despesas };
};
