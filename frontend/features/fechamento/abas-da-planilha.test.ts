import { describe, expect, it } from "vitest";

import { ABAS_DA_PLANILHA, enderecoDaPlanilha } from "./abas-da-planilha";

/**
 * As abas que vao no arquivo.
 *
 * No dia 25 o consumo vai sozinho para o financeiro: o caixa da loja nao e
 * assunto de quem desconta da folha. A tela manda as abas marcadas, e o
 * backend (app/api/v1/views/planilha.py) escreve so elas.
 */
describe("as abas da planilha", () => {
  it("sao as cinco do arquivo, na ordem dele", () => {
    // Espelha ABAS do backend: uma aba nova la sem entrar aqui nunca chega a
    // ser escolhida, e um nome errado aqui some do arquivo sem erro nenhum.
    expect(ABAS_DA_PLANILHA.map((aba) => aba.chave)).toEqual([
      "entradas",
      "saidas",
      "consumo_por_pessoa",
      "consumo",
      "desperdicio",
    ]);
  });

  it("o pedido leva o periodo e as abas marcadas", () => {
    expect(
      enderecoDaPlanilha(
        "2026-09-26",
        "2026-10-25",
        new Set(["consumo_por_pessoa", "consumo"] as const),
      ),
    ).toBe(
      "/planilha/?de=2026-09-26&ate=2026-10-25&abas=consumo_por_pessoa,consumo",
    );
  });

  it("as abas vao na ordem do arquivo, e nao na ordem em que foram marcadas", () => {
    const marcadas = new Set(["consumo", "entradas"] as const);

    expect(enderecoDaPlanilha("2026-10-01", "2026-10-31", marcadas)).toBe(
      "/planilha/?de=2026-10-01&ate=2026-10-31&abas=entradas,consumo",
    );
  });
});
