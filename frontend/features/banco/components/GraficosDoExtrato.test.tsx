import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GastosPorGrupo } from "./GastosPorGrupo";
import { GraficoDoFluxo } from "./GraficoDoFluxo";

/** Renderizados em Node puro, como os outros testes de componente: o que se
 *  confere é o que aparece. */
const pontos = [
  { inicio: "2026-10-01", rotulo: "01/10", entradas: 80, saidas: 30.5, saldo: 49.5 },
  { inicio: "2026-10-02", rotulo: "02/10", entradas: 0, saidas: 10, saldo: -10 },
];

describe("GraficoDoFluxo", () => {
  it("desenha legenda, eixo e a tabela com os mesmos números", () => {
    const html = renderToStaticMarkup(<GraficoDoFluxo pontos={pontos} />);

    expect(html).toContain("Fluxo de caixa por dia");
    expect(html).toContain("Entrou");
    expect(html).toContain("Saiu");
    expect(html).toContain("<svg");
    expect(html).toContain("Ver em tabela");
    expect(html).toContain("49,50");
    expect(html).toContain("−10,00");
  });

  it("um dia só, ou nada de dinheiro, não vira gráfico", () => {
    expect(renderToStaticMarkup(<GraficoDoFluxo pontos={pontos.slice(0, 1)} />)).toBe("");
    expect(
      renderToStaticMarkup(
        <GraficoDoFluxo pontos={pontos.map((ponto) => ({ ...ponto, entradas: 0, saidas: 0, saldo: 0 }))} />,
      ),
    ).toBe("");
  });
});

describe("GastosPorGrupo", () => {
  it("mostra cada grupo com o valor e avisa o que está fora", () => {
    const html = renderToStaticMarkup(
      <GastosPorGrupo gastos={[{ nome: "Operacional", valor: 1500 }, { nome: "Pessoal", valor: 750 }]} pendentes={3} />,
    );

    expect(html).toContain("Para onde foi o dinheiro");
    expect(html).toContain("Operacional");
    expect(html).toContain("R$ 1.500,00");
    expect(html).toContain("width:50%");
    expect(html).toContain("3 movimentações ainda sem categoria ficam fora deste gráfico.");
  });

  it("sem pagamento classificado diz isso", () => {
    const html = renderToStaticMarkup(<GastosPorGrupo gastos={[]} pendentes={0} />);
    expect(html).toContain("Nenhum pagamento classificado no período.");
  });
});
