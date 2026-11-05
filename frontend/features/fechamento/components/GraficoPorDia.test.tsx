import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FORMAS, type ColunaDoDia } from "../graficos-dados";
import { GraficoPorDia } from "./GraficoPorDia";

const coluna = (dia: string, pix: number, dinheiro: number): ColunaDoDia => {
  const total = pix + dinheiro;
  return {
    dia,
    total,
    fatias: FORMAS.map(({ campo, rotulo, cor }) => {
      const valor = campo === "pix" ? pix : campo === "dinheiro" ? dinheiro : 0;
      return { campo, rotulo, cor, valor, percentual: total ? (valor / total) * 100 : 0 };
    }),
  };
};

describe("GraficoPorDia", () => {
  const colunas = [
    coluna("2026-11-02", 1200, 600), // segunda
    coluna("2026-11-03", 0, 0),
    coluna("2026-11-04", 500, 0),
  ];

  it("na semana mostra o dia da semana e o total em cima", () => {
    const html = renderToStaticMarkup(<GraficoPorDia colunas={colunas} modo="SEMANA" />);

    expect(html).toContain("seg");
    expect(html).toMatch(/1,8\smil/); // o Intl separa com espaco duro
    // A maior coluna (1800) contra o topo do eixo (2000).
    expect(html).toContain("height:90%");
  });

  it("empilha so as formas com valor, na proporcao do dia", () => {
    const html = renderToStaticMarkup(<GraficoPorDia colunas={colunas} modo="MES" />);

    // 600 de 1800 em dinheiro, 1200 de 1800 em PIX.
    expect(html).toContain("height:33.33");
    expect(html).toContain("height:66.66");
    // Dia vazio: coluna de altura zero, sem pedacos.
    expect(html).toContain("height:0%");
  });
});
