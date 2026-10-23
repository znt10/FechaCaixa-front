import { describe, expect, it } from "vitest";

import { montarVendasDoTurno, quantidadesDasVendas } from "./vendas-do-turno";

describe("as vendas do turno", () => {
  it("leva so os itens com quantidade", () => {
    expect(montarVendasDoTurno({ nata: "10", formigueiro: "", cenoura: "0" })).toEqual([
      { salgado: "nata", quantidade: 10 },
    ]);
  });

  it("na correcao, volta para os campos somando linhas repetidas", () => {
    expect(
      quantidadesDasVendas([
        { salgado: "nata", quantidade: 4 },
        { salgado: "nata", quantidade: 6 },
        { salgado: "formigueiro", quantidade: 2 },
      ]),
    ).toEqual({ nata: "10", formigueiro: "2" });
  });
});
