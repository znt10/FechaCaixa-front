import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SeletorNativo } from "./SeletorDeClassificacao";

/**
 * O seletor da tela de toque. Renderizado em Node puro (sem jsdom), como o
 * RevisaoDoEnvio.test: o que se confere e o que aparece.
 */
const grupos = [
  {
    rotulo: "Salgados grande",
    opcoes: [{ valor: "s1", nome: "Coxinha" }],
  },
  {
    rotulo: "Salgados mini",
    opcoes: [{ valor: "s2", nome: "Coxinha" }],
  },
];

const html = (props: Partial<Parameters<typeof SeletorNativo>[0]> = {}) =>
  renderToStaticMarkup(
    <SeletorNativo
      id="desperdicio-item-0"
      rotulo="Item 1 do desperdício"
      valor=""
      grupos={grupos}
      indisponivel={null}
      desabilitado={false}
      aoEscolher={() => {}}
      semValor="Selecione o item"
      {...props}
    />,
  );

describe("SeletorNativo", () => {
  it("e o <select> do aparelho, com o id que o rotulo do campo aponta", () => {
    expect(html()).toMatch(/<select[^>]*id="desperdicio-item-0"/);
  });

  it("separa por categoria: as duas Coxinhas sao escolhas diferentes", () => {
    const saida = html();
    expect(saida).toContain('<optgroup label="Salgados grande"><option value="s1">Coxinha</option></optgroup>');
    expect(saida).toContain('<optgroup label="Salgados mini"><option value="s2">Coxinha</option></optgroup>');
  });

  it("comeca no texto de sem valor", () => {
    expect(html()).toMatch(/<option value="" selected="">Selecione o item<\/option>/);
  });

  it("marca o item ja escolhido", () => {
    expect(html({ valor: "s2" })).toContain('<option value="s2" selected="">Coxinha</option>');
  });

  it("enquanto as opcoes nao chegam, mostra o aviso no lugar do texto", () => {
    expect(html({ indisponivel: "Carregando..." })).toContain(">Carregando...</option>");
  });

  // Abaixo de 16px o Safari do iPhone da zoom na tela ao tocar no campo.
  it("usa letra de 16px", () => {
    expect(html()).toContain("text-[16px]");
  });
});
