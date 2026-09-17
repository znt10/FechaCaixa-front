import { describe, expect, it } from "vitest";

import { montarResumo } from "./graficos-dados";
import type { FechamentoLido, LojaDoPainel } from "./services/painel";

/**
 * A pizza responde "como entrou o dinheiro nesta loja".
 *
 * O que este arquivo tranca e uma distorcao que nao se ve olhando a tela: o
 * campo `dinheiro` e o que SOBROU na gaveta, ja sem a retirada e sem as
 * despesas — e as duas saem sempre do dinheiro, nunca do PIX ou do cartao.
 *
 * Somar a fatia azul so pelo campo faria o dinheiro parecer menor do que foi,
 * e as outras tres fatias maiores em proporcao. A loja que manda o dono
 * recolher todo dia apareceria vendendo no cartao.
 */
const CENTRO: LojaDoPainel = { id: "l-centro", nome_loja: "Loja Centro", ativo: true };

let contador = 0;

const fechamento = (extra: Partial<FechamentoLido> = {}): FechamentoLido => {
  contador += 1;
  return {
    id: `f-${contador}`,
    loja: CENTRO.id,
    loja_nome: CENTRO.nome_loja,
    nome_funcionario: "Ana Paula",
    lancado_por: null,
    data: "2026-08-22",
    periodo: "MANHA",
    pix: "0.00",
    cartao: "0.00",
    dinheiro: "0.00",
    link_pagamento: "0.00",
    recebido: "0.00",
    total: "0.00",
    registrado: "0.00",
    saidas: "0.00",
    total_liquido: "0.00",
    houve_retirada: false,
    responsavel_retirada: null,
    responsavel_retirada_nome: null,
    valor_retirado: null,
    despesas: [],
    houve_devolucao: false,
    devolucao_valor: null,
    houve_desperdicio: false,
    desperdicio_detalhes: null,
    consumos: [],
    desperdicios: [],
    conferido: false,
    conferido_em: null,
    conferido_por_nome: null,
    editado_por_nome: null,
    created_at: "2026-08-22T11:30:00Z",
    ...extra,
  };
};

const fatia = (resumo: ReturnType<typeof montarResumo>, campo: string) =>
  resumo.fatias.find((f) => f.campo === campo)!;

describe("a pizza das formas de pagamento", () => {
  it("a retirada volta para a fatia de dinheiro", () => {
    // A loja vendeu 1.000 em especie e o dono levou 500. Sobraram 500 na
    // gaveta, e e isso que o funcionario digita.
    const resumo = montarResumo(
      [CENTRO],
      [fechamento({ dinheiro: "500.00", houve_retirada: true, valor_retirado: "500.00" })],
      null,
    );

    expect(fatia(resumo, "dinheiro").valor).toBe(1000);
    expect(resumo.total).toBe(1000);
  });

  it("as despesas NAO voltam para a fatia de dinheiro", () => {
    // A diferenca em relacao a retirada: a despesa foi gasta. Somar aqui faria
    // a fatia dizer que a empresa tem R$ 400 em especie quando ela tem R$ 300
    // — os outros 100 viraram gas e agua.
    const resumo = montarResumo(
      [CENTRO],
      [
        fechamento({
          dinheiro: "300.00",
          despesas: [
            { id: "d1", descricao: "Gás", valor: "60.00" },
            { id: "d2", descricao: "Água", valor: "40.00" },
          ],
        }),
      ],
      null,
    );

    expect(fatia(resumo, "dinheiro").valor).toBe(300);
    expect(resumo.emCaixa).toBe(300);
    expect(resumo.despesas).toBe(100);
    // O total continua sendo a liquidez bruta: a venda valeu, inclusive a
    // parte dela que ja foi gasta.
    expect(resumo.total).toBe(400);
  });

  it("a proporcao entre as fatias fica honesta", () => {
    // Sem a correcao, o cartao apareceria com 50% de uma loja que vendeu 75%
    // em dinheiro — so porque o dono passou recolhendo.
    const resumo = montarResumo(
      [CENTRO],
      [
        fechamento({
          dinheiro: "100.00",
          cartao: "500.00",
          houve_retirada: true,
          valor_retirado: "900.00",
        }),
      ],
      null,
    );

    expect(fatia(resumo, "dinheiro").percentual).toBeCloseTo(66.7, 1);
    expect(fatia(resumo, "cartao").percentual).toBeCloseTo(33.3, 1);
  });

  it("a devolucao nao entra em fatia nenhuma", () => {
    // Ela saiu da gaveta, mas cancelou a venda junto: ja se descontou sozinha
    // no dinheiro contado. Devolver para a fatia seria contar a venda que nao
    // houve.
    const resumo = montarResumo(
      [CENTRO],
      [
        fechamento({
          dinheiro: "200.00",
          houve_devolucao: true,
          devolucao_valor: "50.00",
        }),
      ],
      null,
    );

    expect(fatia(resumo, "dinheiro").valor).toBe(200);
    expect(resumo.total).toBe(200);
  });

  it("retirada dentro do caixa, despesa fora, devolucao em lugar nenhum", () => {
    // O turno inteiro, com os tres casos de uma vez.
    const resumo = montarResumo(
      [CENTRO],
      [
        fechamento({
          dinheiro: "100.00",
          houve_retirada: true,
          valor_retirado: "300.00",
          despesas: [{ id: "d1", descricao: "Gás", valor: "60.00" }],
          houve_devolucao: true,
          devolucao_valor: "50.00",
        }),
      ],
      null,
    );

    // 100 na gaveta + 300 que o dono guardou: o dinheiro existe.
    expect(fatia(resumo, "dinheiro").valor).toBe(400);
    expect(resumo.emCaixa).toBe(400);
    // Os 60 do gas nao existem mais, mas a venda deles valeu.
    expect(resumo.despesas).toBe(60);
    expect(resumo.total).toBe(460);
  });
});
