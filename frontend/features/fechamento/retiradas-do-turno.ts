import { digitosParaDecimal } from "@/features/fechamento/components/campos";
import type {
  ResponsavelRetirada,
  RetiradaDoTurno,
} from "@/features/fechamento/services/fechamentos";

/** Uma linha da lista de retiradas enquanto esta sendo preenchida: o id de
 *  quem retirou (vem de um seletor, nao de texto digitado) e o valor em
 *  centavos. */
export type LinhaDeRetirada = { chave: number; responsavel: string; valor: string };

type Resultado =
  | { ok: true; retiradas: RetiradaDoTurno[] }
  | { ok: false; erro: string };

/**
 * As linhas preenchidas viram as retiradas do turno — ou o motivo de nao
 * virarem.
 *
 * Linha em branco sai sem reclamar: e quem abriu mais uma e nao usou. Linha
 * pela metade, nao — pessoa sem valor ou valor sem pessoa e o meio do caminho,
 * e como a retirada SOMA no total do caixa, uma linha perdida faz a loja
 * aparecer vendendo menos do que vendeu.
 *
 * "Houve retirada" marcado e nenhuma linha preenchida tambem e recusado: o
 * servidor recusaria do mesmo jeito, depois de a loja ter preenchido a tela
 * inteira.
 */
export const montarRetiradasDoTurno = (
  linhas: LinhaDeRetirada[],
  responsaveis: ResponsavelRetirada[],
): Resultado => {
  const retiradas: RetiradaDoTurno[] = [];

  for (const linha of linhas) {
    const centavos = Number(linha.valor || "0");
    if (!linha.responsavel && centavos === 0) continue;

    if (!linha.responsavel) {
      return { ok: false, erro: "Escolha quem retirou." };
    }
    if (centavos === 0) {
      // O nome no erro: com duas linhas na tela, "informe o valor" nao diz
      // qual delas esta pela metade.
      const nome = responsaveis.find((p) => p.id === linha.responsavel)?.nome;
      return {
        ok: false,
        erro: nome ? `Informe quanto ${nome} retirou.` : "Informe o valor retirado.",
      };
    }

    retiradas.push({
      responsavel: linha.responsavel,
      valor: digitosParaDecimal(linha.valor),
    });
  }

  if (linhas.length > 0 && retiradas.length === 0) {
    return { ok: false, erro: "Informe quem retirou e o valor retirado." };
  }

  return { ok: true, retiradas };
};

/** Quanto as linhas somam, em centavos — o que volta para o total do caixa. */
export const somaDasRetiradas = (linhas: LinhaDeRetirada[]) =>
  linhas.reduce((soma, linha) => soma + Number(linha.valor || "0"), 0);
