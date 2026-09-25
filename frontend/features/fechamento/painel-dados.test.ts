import { describe, expect, it } from "vitest";

import { montarResumo } from "./painel-dados";
import type { FechamentoLido, LojaDoPainel } from "./services/painel";

/**
 * As colunas de dinheiro do painel.
 *
 * A regra que este arquivo tranca separa duas coisas que parecem iguais e nao
 * sao. Retirada e despesa saem AMBAS do dinheiro — nunca do PIX ou do cartao —
 * e o campo `dinheiro` e o que SOBROU na gaveta, ja sem as duas. Mas elas nao
 * terminam no mesmo lugar:
 *
 *   retirada -> o dono levou para guardar. O dinheiro EXISTE, so mudou de mao.
 *   despesa  -> foi gasta. Esse dinheiro nao existe mais.
 *
 * Por isso a retirada volta para a coluna de dinheiro e a despesa tem coluna
 * propria. As duas somam no total, porque a venda valeu nos dois casos.
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
    retiradas: [],
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

const painel = (fechamentos: FechamentoLido[]) =>
  montarResumo([CENTRO], fechamentos, "DIARIO").totais;

describe("as colunas de dinheiro do painel", () => {
  it("a retirada entra na coluna de dinheiro", () => {
    // Vendeu 1.000 em especie, o dono levou 500. Sobraram 500 na gaveta, e e
    // isso que o funcionario digita — mas os 1.000 continuam sendo da empresa.
    const totais = painel([
      fechamento({
        dinheiro: "500.00",
        houve_retirada: true,
        valor_retirado: "500.00",
      }),
    ]);

    expect(totais.dinheiro).toBe(1000);
    expect(totais.total).toBe(1000);
  });

  it("a despesa fica na coluna dela, fora do dinheiro", () => {
    // Somar no dinheiro diria que a loja tem R$ 400 em especie quando ela tem
    // R$ 300 — os outros 100 viraram gas e agua.
    const totais = painel([
      fechamento({
        dinheiro: "300.00",
        despesas: [
          { id: "d1", descricao: "Gás", valor: "60.00" },
          { id: "d2", descricao: "Água", valor: "40.00" },
        ],
      }),
    ]);

    expect(totais.dinheiro).toBe(300);
    expect(totais.despesas).toBe(100);
  });

  it("as cinco colunas fecham o total na horizontal", () => {
    // E o que a dona confere: arrastar a linha tem que dar a coluna TOTAL.
    const totais = painel([
      fechamento({
        dinheiro: "300.00",
        pix: "200.00",
        cartao: "150.00",
        link_pagamento: "50.00",
        houve_retirada: true,
        valor_retirado: "400.00",
        despesas: [{ id: "d1", descricao: "Gás", valor: "60.00" }],
      }),
    ]);

    const soma =
      totais.dinheiro +
      totais.pix +
      totais.cartao +
      totais.linkPagamento +
      totais.despesas;

    expect(soma).toBe(totais.total);
    expect(totais.total).toBe(1160);
  });

  it("a devolucao nao entra em coluna nenhuma", () => {
    // Ela saiu da gaveta e cancelou a venda junto: as duas coisas ja se
    // anularam no numero que o funcionario contou.
    const totais = painel([
      fechamento({
        dinheiro: "200.00",
        houve_devolucao: true,
        devolucao_valor: "50.00",
      }),
    ]);

    expect(totais.dinheiro).toBe(200);
    expect(totais.total).toBe(200);
  });
});
