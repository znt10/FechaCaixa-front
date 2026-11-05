import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DicaDaColuna, ladoDaDica } from "./DicaDaColuna";

describe("DicaDaColuna", () => {
  it("mostra o titulo e o valor de cada linha em reais", () => {
    const html = renderToStaticMarkup(
      <DicaDaColuna
        titulo="seg, 02/11"
        linhas={[
          { rotulo: "PIX", valor: 1200, cor: "#eb6834" },
          { rotulo: "Total", valor: 1800 },
        ]}
        alturaDaColuna={90}
        lado="centro"
      />,
    );

    expect(html).toContain("seg, 02/11");
    expect(html).toContain("R$ 1.200,00");
    expect(html).toContain("R$ 1.800,00");
    expect(html).toContain("calc(90% + 10px)");
  });
});

describe("ladoDaDica", () => {
  it("as pontas abrem para dentro, o meio centraliza", () => {
    const lados = Array.from({ length: 7 }, (_, i) => ladoDaDica(i, 7));
    expect(lados[0]).toBe("esquerda");
    expect(lados[3]).toBe("centro");
    expect(lados[6]).toBe("direita");
  });
});
