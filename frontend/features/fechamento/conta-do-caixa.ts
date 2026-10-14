/**
 * A conta do caixa que o formulario mostra antes de enviar, em centavos.
 *
 * `recebido` e o que a loja digitou (dinheiro que sobrou na gaveta, PIX,
 * cartao, link). A retirada volta para o total: o dono levou para guardar, e o
 * dinheiro continua sendo da empresa. A despesa NAO volta: foi gasta, e somar
 * mostraria dinheiro que nao existe — ela fica anotada embaixo do total. Mesma
 * conta do back (FechamentoCaixa.total); ate 2026-10-14 a despesa somava.
 */
export const contaDoCaixa = ({
  recebido,
  retirada,
}: {
  recebido: number;
  retirada: number;
  despesas: number;
}) => ({
  naGaveta: recebido,
  total: recebido + retirada,
  // "Na gaveta + Retirada = Total" so tem o que explicar quando houve retirada.
  mostraAConta: retirada > 0,
});
