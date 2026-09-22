import { describe, expect, it } from "vitest";

import {
  AREAS,
  areaDaRota,
  paginasDaArea,
  type Area,
} from "./areas-do-painel";

const rotulos = (area: Area, opcoes: { gerente: boolean; notas: boolean }) =>
  paginasDaArea(area, opcoes).map((pagina) => pagina.rotulo);

describe("areaDaRota", () => {
  it("notas fiscais é Despesas", () => {
    expect(areaDaRota("/notas-fiscais")).toBe("DESPESAS");
  });

  it("as telas do caixa são Caixa", () => {
    for (const rota of ["/fechamentos", "/por-loja", "/saidas", "/graficos"]) {
      expect(areaDaRota(rota)).toBe("CAIXA");
    }
  });

  it("Empresa é Caixa: administrar a conta não é lançar despesa", () => {
    expect(areaDaRota("/empresa")).toBe("CAIXA");
  });

  it("Catálogo é Caixa: cadastrar categoria e item também não é lançar despesa", () => {
    expect(areaDaRota("/catalogo")).toBe("CAIXA");
  });

  it("rota desconhecida cai no Caixa, que é onde quase todo mundo trabalha", () => {
    expect(areaDaRota("/qualquer-coisa")).toBe("CAIXA");
  });

  it("uma subrota de notas continua em Despesas", () => {
    // A área sai da URL e não de estado guardado: se um dia existir
    // /notas-fiscais/<id>, o seletor não pode piscar de volta para Caixa.
    expect(areaDaRota("/notas-fiscais/abc-123")).toBe("DESPESAS");
  });

  it("não confunde uma rota que só COMEÇA parecido", () => {
    expect(areaDaRota("/notas-fiscais-antigas")).toBe("CAIXA");
  });
});

describe("paginasDaArea", () => {
  it("o caixa tem as quatro telas de sempre, na ordem de sempre", () => {
    expect(rotulos("CAIXA", { gerente: false, notas: true })).toEqual([
      "Painel",
      "Por loja",
      "Saídas",
      "Gráficos",
    ]);
  });

  it("Empresa e Catálogo entram no fim, e só para o gerente", () => {
    expect(rotulos("CAIXA", { gerente: true, notas: true })).toEqual([
      "Painel",
      "Por loja",
      "Saídas",
      "Gráficos",
      "Empresa",
      "Catálogo",
    ]);
  });

  it("Saídas fica no caixa e não vai para Despesas", () => {
    // Saídas responde "para onde foi o dinheiro da gaveta" — é leitura do
    // fechamento, não conta a pagar de fornecedor.
    expect(rotulos("DESPESAS", { gerente: true, notas: true })).not.toContain(
      "Saídas",
    );
  });

  it("Despesas tem notas fiscais", () => {
    expect(rotulos("DESPESAS", { gerente: false, notas: true })).toEqual([
      "Notas fiscais",
    ]);
  });

  it("sem o módulo, Despesas não tem tela nenhuma", () => {
    expect(rotulos("DESPESAS", { gerente: true, notas: false })).toEqual([]);
  });

  it("o módulo desligado não mexe nas abas do caixa", () => {
    expect(rotulos("CAIXA", { gerente: true, notas: false })).toEqual([
      "Painel",
      "Por loja",
      "Saídas",
      "Gráficos",
      "Empresa",
      "Catálogo",
    ]);
  });
});

describe("AREAS", () => {
  it("cada área diz por onde ela começa", () => {
    expect(AREAS.map((area) => [area.id, area.inicio])).toEqual([
      ["CAIXA", "/fechamentos"],
      ["DESPESAS", "/notas-fiscais"],
    ]);
  });

  it("o rótulo é o que a pessoa lê no seletor", () => {
    expect(AREAS.map((area) => area.rotulo)).toEqual([
      "Fechamento de caixa",
      "Despesas",
    ]);
  });
});

describe("a aba Catálogo acompanha o que a empresa vende", () => {
  it("some quando a empresa não usa catálogo de itens", () => {
    // Quem não vende nada de catálogo (um bar, uma loja de roupa) não tem o
    // que cadastrar ali, e a aba só ocupava espaço na fila.
    const abas = paginasDaArea("CAIXA", { gerente: true, notas: false, catalogo: false });

    expect(abas.map((pagina) => pagina.href)).not.toContain("/catalogo");
    // As outras não vão junto: catálogo é o que a empresa vende, não o resto
    // da administração dela.
    expect(abas.map((pagina) => pagina.href)).toContain("/empresa");
  });

  it("fica quando a empresa usa catálogo", () => {
    const abas = paginasDaArea("CAIXA", { gerente: true, notas: false, catalogo: true });

    expect(abas.map((pagina) => pagina.href)).toContain("/catalogo");
  });
});
