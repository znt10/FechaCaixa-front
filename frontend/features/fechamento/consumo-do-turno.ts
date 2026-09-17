import {
  acharPeloNome,
  digitosParaDecimal,
} from "@/features/fechamento/components/campos";
import type {
  ConsumoDoTurno,
  Encarregado,
} from "@/features/fechamento/services/fechamentos";

/** Uma linha da lista de consumo enquanto esta sendo preenchida: o nome como
 *  foi digitado (so vira cadastro no envio) e o valor em centavos. */
export type LinhaDeConsumo = { chave: number; nome: string; valor: string };

type Resultado =
  | { ok: true; consumos: ConsumoDoTurno[] }
  | { ok: false; erro: string };

/**
 * As linhas digitadas viram o consumo do turno — ou o motivo de nao virarem.
 *
 * Quem preenche e o gerente, no fechamento do turno, dizendo de quem foi cada
 * valor. O campo do nome e digitavel (a loja preenche no celular, com a lista
 * ajudando), entao aqui e onde o texto vira cadastro: sem isso o backend
 * responderia 400 depois de a loja ter preenchido a tela inteira.
 *
 * Linha em branco sai sem reclamar — e o gerente que abriu mais uma e nao
 * usou. Linha pela metade, nao: nome sem valor ou valor sem nome e o meio do
 * caminho, e mandar assim perderia o consumo de alguem em silencio.
 */
export const montarConsumosDoTurno = (
  linhas: LinhaDeConsumo[],
  quemConsome: Encarregado[],
): Resultado => {
  const consumos: ConsumoDoTurno[] = [];

  for (const linha of linhas) {
    const nome = linha.nome.trim();
    const centavos = Number(linha.valor || "0");
    if (!nome && centavos === 0) continue;

    const pessoa = acharPeloNome(quemConsome, nome);
    if (!pessoa) {
      return {
        ok: false,
        erro:
          quemConsome.length === 0
            ? "Ninguém marcado para consumo. Peça para marcar na tela Empresa quem pode consumir."
            : `"${nome || "Sem nome"}" não está na lista de consumo.`,
      };
    }
    if (centavos === 0) {
      return { ok: false, erro: `Informe quanto ${pessoa.nome} consumiu.` };
    }

    consumos.push({ encarregado: pessoa.id, valor: digitosParaDecimal(linha.valor) });
  }

  return { ok: true, consumos };
};
