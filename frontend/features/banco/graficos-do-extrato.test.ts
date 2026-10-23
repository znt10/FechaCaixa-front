import { describe, expect, it } from "vitest";

import { gastosPorGrupo, serieDoFluxo } from "./graficos-do-extrato";
import type { BlocoDoResumo } from "./services/banco";

describe("serieDoFluxo", () => {
  it("preenche os dias sem movimento e põe a saída como tamanho", () => {
    const serie = serieDoFluxo([
      { data: "2026-10-01", entradas: "80.00", saidas: "-30.50" },
      { data: "2026-10-03", entradas: "0.00", saidas: "-10.00" },
    ]);

    expect(serie).toEqual([
      { inicio: "2026-10-01", rotulo: "01/10", entradas: 80, saidas: 30.5, saldo: 49.5 },
      { inicio: "2026-10-02", rotulo: "02/10", entradas: 0, saidas: 0, saldo: 0 },
      { inicio: "2026-10-03", rotulo: "03/10", entradas: 0, saidas: 10, saldo: -10 },
    ]);
  });

  it("vazio fica vazio", () => {
    expect(serieDoFluxo([])).toEqual([]);
  });

  it("período longo vira semanas, começando na segunda", () => {
    const dias = Array.from({ length: 70 }, (_, i) => {
      const data = new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);
      return { data, entradas: "1.00", saidas: "0.00" };
    });

    const serie = serieDoFluxo(dias);

    // 01/07/2026 é quarta: a primeira semana começa na segunda 29/06.
    expect(serie[0]).toMatchObject({ inicio: "2026-06-29", rotulo: "29/06", entradas: 5 });
    expect(serie.every((ponto) => ponto.rotulo.length === 5)).toBe(true);
    expect(serie.reduce((soma, ponto) => soma + ponto.entradas, 0)).toBe(70);
  });
});

describe("gastosPorGrupo", () => {
  const bloco = (categorias: [string, string][]): Pick<BlocoDoResumo, "categorias"> => ({
    categorias: categorias.map(([nome, valor], i) => ({ id: String(i), nome, valor, quantidade: 1 })),
  });

  it("soma por grupo, do maior para o menor, em tamanho", () => {
    const gastos = gastosPorGrupo(
      bloco([
        ["Pessoal > Salário", "-1000.00"],
        ["Pessoal > Vale", "-200.00"],
        ["Operacional > Aluguel", "-1500.00"],
      ]),
    );

    expect(gastos).toEqual([
      { nome: "Operacional", valor: 1500 },
      { nome: "Pessoal", valor: 1200 },
    ]);
  });

  it("depois do sexto, o resto vira Outros", () => {
    const gastos = gastosPorGrupo(
      bloco(["A", "B", "C", "D", "E", "F", "G", "H"].map((nome, i) => [`${nome} > x`, `-${100 - i}.00`])),
    );

    expect(gastos.map((gasto) => gasto.nome)).toEqual(["A", "B", "C", "D", "E", "F", "Outros"]);
    expect(gastos[6].valor).toBe(93 + 94);
  });
});
