import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FaixaDeBoletosVista } from "./FaixaDeBoletos";

describe("FaixaDeBoletosVista", () => {
  it("não desenha nada quando nenhum boleto pede atenção", () => {
    expect(renderToStaticMarkup(<FaixaDeBoletosVista texto={null} />)).toBe("");
  });

  it("leva para a aba Boletos, em vermelho", () => {
    const saida = renderToStaticMarkup(
      <FaixaDeBoletosVista texto="Boletos: 1 vencido · 1 sem data" />,
    );
    expect(saida).toContain('href="/boletos"');
    expect(saida).toContain("Boletos: 1 vencido · 1 sem data");
    expect(saida).toContain("bg-caixa-alerta-soft");
  });
});
