import {
  avisoDeCatalogoVazio,
  type ConfiguracaoDoFormulario,
} from "@/features/fechamento/formulario-da-empresa";
import type {
  DesperdicioDoTurno,
  DesperdicioLancado,
  Salgado,
} from "@/features/fechamento/services/fechamentos";

/** Uma linha da lista de desperdicio enquanto esta sendo preenchida: o item
 *  escolhido no seletor (pelo id, nao pelo nome — o catalogo tem dois niveis
 *  e o mesmo nome existe em mais de uma categoria) e a quantidade em
 *  unidades. */
export type LinhaDeDesperdicio = {
  chave: number;
  salgadoId: string;
  quantidade: string;
};

type Resultado =
  | { ok: true; desperdicios: DesperdicioDoTurno[] }
  | { ok: false; erro: string };

/**
 * As linhas escolhidas viram o desperdicio do turno — ou o motivo de nao
 * virarem.
 *
 * Diferente do consumo e de quem lanca: aqui a linha ja chega com o id do
 * catalogo, porque o seletor e um <select> por categoria, nao um campo
 * digitavel. Resolver por nome (como este modulo fazia antes) devolvia
 * sempre o PRIMEIRO item daquele nome — e o catalogo tem dois niveis
 * precisamente porque "Coxinha" existe em "Salgados grande" e em "Salgados
 * mini". Com o id, a linha vai para a categoria que a loja escolheu.
 *
 * Linha em branco sai sem reclamar — e quem abriu mais uma e nao usou. Linha
 * pela metade, nao: item sem quantidade ou quantidade sem item e o meio do
 * caminho, e mandar assim perderia a perda em silencio.
 *
 * Duas linhas do mesmo item passam de proposito: o backend aceita, e recusar
 * obrigaria a loja a somar de cabeca antes de escolher de novo.
 */
export const montarDesperdiciosDoTurno = (
  linhas: LinhaDeDesperdicio[],
  catalogo: Salgado[],
  // Como a empresa chama o que vende, para o aviso de catálogo vazio não
  // falar de salgado para quem vende pão. Vazio conta como "salgados", que é
  // o texto de antes.
  configuracao: ConfiguracaoDoFormulario = {},
): Resultado => {
  const desperdicios: DesperdicioDoTurno[] = [];

  for (const linha of linhas) {
    const salgadoId = linha.salgadoId.trim();
    const quantidadeDigitada = linha.quantidade.trim();
    if (!salgadoId && !quantidadeDigitada) continue;

    const item = catalogo.find((opcao) => opcao.id === salgadoId);
    if (!item) {
      return {
        ok: false,
        erro:
          catalogo.length === 0
            ? avisoDeCatalogoVazio(configuracao)
            : "Selecione um item do catálogo.",
      };
    }

    // Number.isInteger cobre os tres jeitos de a quantidade vir errada:
    // NaN ("abc"), Infinity, e fracionado ("2.5") — todos escapariam de um
    // "<= 0" porque toda comparacao com NaN e falsa em JS.
    const quantidade = Number(quantidadeDigitada);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return {
        ok: false,
        erro: `Informe quantos ${item.nome} foram perdidos, em um número inteiro.`,
      };
    }

    desperdicios.push({ salgado: item.id, quantidade });
  }

  return { ok: true, desperdicios };
};

/**
 * O caminho de volta: a linha como o servidor devolveu na correcao (dentro
 * dos 20 minutos) vira uma linha editavel do formulario.
 *
 * Reidrata pelo `salgado` (o id que `DesperdicioLidoSerializer` ja devolve),
 * e nao pelo nome: reidratar por nome resolveria de volta para o primeiro
 * item daquele nome no catalogo, trocando "Coxinha mini" por "Coxinha
 * grande" silenciosamente numa correcao.
 *
 * Separado do componente porque `chave` vem do contador de linhas do
 * formulario (um `useRef`, que so existe la) — mas salgadoId e quantidade sao
 * conversao pura, e e o unico ponto em que um erro faria a loja reler um
 * item diferente do que ela lancou. Sem reidratar isto, o formulario abre
 * para corrigir com o bloco de desperdicio vazio, e o payload — que sempre
 * inclui a chave "desperdicios", cheia ou vazia — apagaria o que estava la
 * ao salvar qualquer outra correcao.
 */
export const linhaEditavelDoDesperdicio = (
  desperdicio: Pick<DesperdicioLancado, "salgado" | "quantidade">,
  chave: number,
): LinhaDeDesperdicio => ({
  chave,
  salgadoId: desperdicio.salgado,
  quantidade: String(desperdicio.quantidade),
});
