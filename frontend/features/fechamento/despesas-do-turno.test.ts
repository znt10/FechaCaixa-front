import { describe, expect, it } from "vitest";

import { montarDespesasDoTurno } from "./despesas-do-turno";

/**
 * As despesas do turno saindo do formulario.
 *
 * O gerente digita no que gastou e quanto, uma linha por gasto. Antes cabia
 * uma so por turno, e gas, agua e remedio do mesmo dia iam empilhados num
 * campo de texto — onde nao somam e a contabilidade nao lanca.
 *
 * O que esta em jogo e o total do caixa: a despesa SOMA no fechamento (o
 * dinheiro saiu da gaveta depois da venda), entao uma linha perdida em
 * silencio faz a loja aparecer vendendo menos do que vendeu.
 */
const linha = (descricao: string, valor: string, chave = 0) => ({
  chave,
  descricao,
  valor,
});

describe("as despesas do turno", () => {
  it("uma linha por gasto, com o valor em reais", () => {
    const resultado = montarDespesasDoTurno([
      linha("Gás", "6000", 1),
      linha("Água", "4000", 2),
    ]);

    expect(resultado).toEqual({
      ok: true,
      despesas: [
        { descricao: "Gás", valor: "60.00" },
        { descricao: "Água", valor: "40.00" },
      ],
    });
  });

  it("linha em branco sai sem reclamar", () => {
    // O gerente abriu mais uma e nao usou. Reclamar aqui obrigaria a remover a
    // linha antes de enviar, no fim do expediente.
    const resultado = montarDespesasDoTurno([
      linha("Gás", "6000", 1),
      linha("", "", 2),
    ]);

    expect(resultado).toEqual({
      ok: true,
      despesas: [{ descricao: "Gás", valor: "60.00" }],
    });
  });

  it("descricao sem valor nao passa", () => {
    // Meia linha e o meio do caminho, nao uma despesa: mandar assim perderia
    // o gasto em silencio.
    const resultado = montarDespesasDoTurno([linha("Gás", "")]);

    expect(resultado.ok).toBe(false);
  });

  it("valor sem descricao nao passa", () => {
    const resultado = montarDespesasDoTurno([linha("", "6000")]);

    expect(resultado.ok).toBe(false);
  });

  it("o erro diz de qual linha se trata", () => {
    // Com cinco linhas na tela, "preencha os campos" nao diz qual.
    const resultado = montarDespesasDoTurno([
      linha("Gás", "6000", 1),
      linha("Remédio", "", 2),
    ]);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro).toContain("Remédio");
  });

  it("espaco em volta nao vira descricao", () => {
    const resultado = montarDespesasDoTurno([linha("   ", "")]);

    expect(resultado).toEqual({ ok: true, despesas: [] });
  });

  it("sem linha nenhuma, nenhuma despesa", () => {
    expect(montarDespesasDoTurno([])).toEqual({ ok: true, despesas: [] });
  });
});
