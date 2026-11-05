import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Fatia } from "../graficos-dados";
import { GraficoDeColunas } from "./GraficoDeColunas";

const fatias: Fatia[] = [
  { campo: "dinheiro", rotulo: "Dinheiro", cor: "#2a78d6", valor: 1800, percentual: 64 },
  { campo: "pix", rotulo: "PIX", cor: "#eb6834", valor: 1000, percentual: 36 },
  { campo: "cartao", rotulo: "Cartão", cor: "#1baf7a", valor: 0, percentual: 0 },
  { campo: "link_pagamento", rotulo: "Link de pagamento", cor: "#eda100", valor: 0, percentual: 0 },
];

describe("GraficoDeColunas", () => {
  it("mostra uma coluna por forma, mesmo zerada, com o rotulo embaixo", () => {
    const html = renderToStaticMarkup(<GraficoDeColunas fatias={fatias} />);

    for (const rotulo of ["Dinheiro", "PIX", "Cartão", "Link de pagamento"]) {
      expect(html).toContain(rotulo);
    }
    expect(html).toContain("64%");
    expect(html).toContain("36%");
  });

  it("a maior coluna e medida contra o topo redondo do eixo", () => {
    const html = renderToStaticMarkup(<GraficoDeColunas fatias={fatias} />);

    // Maior valor 1800 -> passo 500, eixo ate 2000: 1800/2000 = 90%.
    expect(html).toContain("height:90%");
    expect(html).toContain("height:0%");
  });
});
