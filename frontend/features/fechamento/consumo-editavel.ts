import { digitosParaDecimal } from "@/features/fechamento/components/campos";

/** Uma linha do consumo na tela de correcao da gerencia.
 *
 *  `encarregado` e o id do cadastro, nao um nome digitado: no formulario da
 *  loja o campo e de texto e vira cadastro no envio, mas aqui quem corrige nao
 *  esta com a pessoa na frente — deixar digitar criaria "Marina" de novo do
 *  lado da "Marina" que ja existe, e o total do mes se parte em duas. */
export type LinhaDeConsumoDoPainel = {
  chave: number;
  encarregado: string;
  valor: string;
};

/** O que o PATCH grava: a lista inteira substitui a anterior. */
export type ConsumoParaSalvar = { encarregado: string; valor: string };

const centavos = (digitos: string) => Number(digitos || "0");

const completa = (linha: LinhaDeConsumoDoPainel) =>
  Boolean(linha.encarregado) && centavos(linha.valor) > 0;

const emBranco = (linha: LinhaDeConsumoDoPainel) =>
  !linha.encarregado && centavos(linha.valor) === 0;

/**
 * As linhas da tela viram o consumo que vai no PATCH.
 *
 * Linha em branco sai sem reclamar — e a gerencia que abriu mais uma e nao
 * usou. Linha pela metade tambem sai, mas ela nao chega aqui: `consumoPelaMetade`
 * fecha o botao de salvar antes, para o valor nao sumir em silencio.
 */
export const consumosParaSalvar = (
  linhas: LinhaDeConsumoDoPainel[],
): ConsumoParaSalvar[] =>
  linhas.filter(completa).map((linha) => ({
    encarregado: linha.encarregado,
    valor: digitosParaDecimal(linha.valor),
  }));

/** Alguma linha tem pessoa sem valor ou valor sem pessoa. */
export const consumoPelaMetade = (linhas: LinhaDeConsumoDoPainel[]) =>
  linhas.some((linha) => !completa(linha) && !emBranco(linha));

/**
 * O consumo reduzido ao que o servidor guarda, para comparar o rascunho com o
 * que ja esta gravado.
 *
 * Pela ordem, e nao por pessoa: duas linhas iguais sao dois descontos, e nao
 * uma repetida. A chave da linha fica de fora — ela so existe para o React.
 */
export const assinaturaDoConsumo = (linhas: LinhaDeConsumoDoPainel[]) =>
  JSON.stringify(
    linhas
      .filter((linha) => !emBranco(linha))
      .map((linha) => [linha.encarregado, centavos(linha.valor)]),
  );
