import type { FiltroTurno } from "./painel-dados";
import type { FechamentoLido, LojaDoPainel } from "./services/painel";

// O grafico responde "como entrou o dinheiro nesta loja": as fatias sao as
// formas de pagamento. Sao quatro, dentro do limite de leitura de uma pizza.
//
// As cores vem da paleta categorica de referencia da skill de dataviz, e nao
// do verde da marca: um hue so nao carrega quatro identidades. A ordem e fixa
// e amarrada a forma de pagamento — PIX e sempre azul, mesmo quando alguma
// fatia some por estar zerada. Cor segue a entidade, nunca a posicao no rank.
// Dinheiro vem primeiro: e o unico que passa pela gaveta, e o unico que pode
// sumir sem deixar rastro. As outras formas a maquininha e o banco conferem
// sozinhos.
//
// A fatia dele NAO e o campo `dinheiro` cru — ver montarResumo.
//
// A ordem das cores e a sequencia validada da paleta (slot 1, 2, 3, 4) e nao
// se mexe; o que mudou foi qual forma ocupa cada slot. Depois de fixado, cor
// segue a entidade: dinheiro e sempre azul, mesmo quando alguma fatia zera.
export const FORMAS = [
  { campo: "dinheiro", rotulo: "Dinheiro", cor: "#2a78d6" },
  { campo: "pix", rotulo: "PIX", cor: "#eb6834" },
  { campo: "cartao", rotulo: "Cartão", cor: "#1baf7a" },
  { campo: "link_pagamento", rotulo: "Link de pagamento", cor: "#eda100" },
] as const;

export type CampoDePagamento = (typeof FORMAS)[number]["campo"];

export type Fatia = {
  campo: CampoDePagamento;
  rotulo: string;
  cor: string;
  valor: number;
  percentual: number;
};

export type ResumoDaLoja = {
  lojaId: string;
  lojaNome: string;
  lancamentos: number;
  /** O dinheiro que a empresa TEM: a soma das quatro fatias. A retirada esta
   *  dentro (mudou de mao, continua sendo dela); a despesa nao (foi gasta). */
  emCaixa: number;
  /** O que a loja gastou no turno. Fora das fatias porque nao esta mais em
   *  caixa — dentro delas, seria dinheiro que a empresa nao tem. */
  despesas: number;
  /** A liquidez bruta: quanto a loja movimentou. `emCaixa` + `despesas`, porque
   *  a venda valeu, inclusive a parte dela que ja foi gasta. */
  total: number;
  fatias: Fatia[];
};

const numero = (valor: string | null) => Number(valor ?? 0);

const somaDasDespesas = (fechamento: FechamentoLido) =>
  (fechamento.despesas ?? []).reduce((soma, d) => soma + numero(d.valor), 0);

/**
 * `lojaId` nulo soma todas as lojas da conta; `turno` "TODOS" soma os dois
 * turnos. Os dois filtros valem ao mesmo tempo — a manha de uma loja so.
 */
export const montarResumo = (
  lojas: LojaDoPainel[],
  fechamentos: FechamentoLido[],
  lojaId: string | null,
  turno: FiltroTurno = "TODOS",
): ResumoDaLoja => {
  const doEscopo = fechamentos.filter(
    (f) =>
      (lojaId === null || f.loja === lojaId) &&
      (turno === "TODOS" || f.periodo === turno),
  );

  // A retirada volta para a fatia de dinheiro; a despesa NAO. As duas saem do
  // dinheiro (nunca do PIX ou do cartao) e `dinheiro` e o que sobrou na gaveta,
  // ja sem as duas — mas elas nao terminam no mesmo lugar:
  //
  //   retirada -> o dono levou para guardar. O dinheiro EXISTE, so mudou de
  //               mao. Sem devolver, a loja que manda recolher todo dia
  //               apareceria vendendo no cartao.
  //   despesa  -> foi gasta. Devolver aqui faria a fatia dizer que a empresa
  //               tem uma quantia que ja nao existe.
  //
  // A devolucao tambem nao volta: saiu da gaveta e cancelou a venda junto.
  const retiradas = doEscopo.reduce(
    (soma, f) => soma + numero(f.valor_retirado),
    0,
  );
  const despesas = doEscopo.reduce((soma, f) => soma + somaDasDespesas(f), 0);

  const valores = FORMAS.map(({ campo, rotulo, cor }) => ({
    campo,
    rotulo,
    cor,
    valor:
      doEscopo.reduce((soma, f) => soma + numero(f[campo]), 0) +
      (campo === "dinheiro" ? retiradas : 0),
  }));

  const emCaixa = valores.reduce((soma, v) => soma + v.valor, 0);

  return {
    lojaId: lojaId ?? "TODAS",
    lojaNome: lojaId
      ? (lojas.find((l) => l.id === lojaId)?.nome_loja ?? "Loja")
      : "Todas as lojas",
    lancamentos: doEscopo.length,
    emCaixa,
    despesas,
    total: emCaixa + despesas,
    // A porcentagem e sobre o que esta em caixa, que e o que a pizza desenha.
    // Sobre o total, as quatro fatias somariam menos de 100% e sobraria um
    // pedaco vazio que a legenda nao explica.
    fatias: valores.map((v) => ({
      ...v,
      percentual: emCaixa > 0 ? (v.valor / emCaixa) * 100 : 0,
    })),
  };
};
