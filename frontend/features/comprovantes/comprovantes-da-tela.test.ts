import { describe, expect, it } from "vitest";

import {
  acoesDoDetalhe,
  escolhasIniciais,
  linhasDoResumo,
  montarFiltro,
  mostrarAreaDeComprovantes,
  paraDataLocal,
  intervaloDasEscolhas,
  rotuloDaSituacao,
  rotuloDoTotal,
  type EscolhasDosComprovantes,
} from "./comprovantes-da-tela";

const gerente = (comprovantes: boolean) => ({
  id: 1,
  group: "Gerente",
  modulos: { comprovantes },
});

describe("mostrarAreaDeComprovantes", () => {
  it("aparece para a gerência com o módulo", () => {
    expect(
      mostrarAreaDeComprovantes({ usuario: gerente(true), carregando: false, falhou: false }),
    ).toBe(true);
  });

  it("some sem o módulo", () => {
    expect(
      mostrarAreaDeComprovantes({ usuario: gerente(false), carregando: false, falhou: false }),
    ).toBe(false);
  });

  it("some para o funcionário, que o backend recusa", () => {
    const funcionario = { id: 2, group: "Funcionario", modulos: { comprovantes: true } };
    expect(
      mostrarAreaDeComprovantes({ usuario: funcionario, carregando: false, falhou: false }),
    ).toBe(false);
  });

  it("não pisca enquanto carrega, e não some num soluço de rede", () => {
    expect(mostrarAreaDeComprovantes({ carregando: true, falhou: false })).toBe(false);
    expect(mostrarAreaDeComprovantes({ carregando: false, falhou: true })).toBe(true);
  });
});

describe("escolhas e filtro", () => {
  const escolhas = (mudanca: Partial<EscolhasDosComprovantes> = {}): EscolhasDosComprovantes => ({
    ...escolhasIniciais("2026-10-15"),
    ...mudanca,
  });

  it("começa no mês atual, sem loja nem situação", () => {
    expect(escolhasIniciais("2026-10-15")).toEqual({
      granularidade: "MES",
      dia: "2026-10-15",
      mes: "2026-10",
      loja: "",
      situacao: "",
      pagina: 1,
    });
  });

  it("mês vira o mês inteiro", () => {
    expect(intervaloDasEscolhas(escolhas())).toEqual({ de: "2026-10-01", ate: "2026-10-31" });
  });

  it("semana vai de segunda a domingo", () => {
    // 15/10/2026 é uma quinta.
    expect(intervaloDasEscolhas(escolhas({ granularidade: "SEMANA" }))).toEqual({
      de: "2026-10-12",
      ate: "2026-10-18",
    });
  });

  it("dia é só o dia", () => {
    expect(intervaloDasEscolhas(escolhas({ granularidade: "DIA" }))).toEqual({
      de: "2026-10-15",
      ate: "2026-10-15",
    });
  });

  it("o filtro leva o período e só o resto que foi escolhido", () => {
    expect(montarFiltro(escolhas({ loja: "sem", pagina: 2 }))).toEqual({
      de: "2026-10-01",
      ate: "2026-10-31",
      loja: "sem",
      page: 2,
    });
  });
});

describe("linhasDoResumo", () => {
  it("só o total quando não há loja", () => {
    expect(
      linhasDoResumo({
        valor: "30.00",
        conferir: 0,
        por_loja: [{ loja: null, nome: "Sem loja", valor: "30.00" }],
      }),
    ).toEqual([]);
  });

  it("lojas e sem loja quando há alguma loja", () => {
    expect(
      linhasDoResumo({
        valor: "130.00",
        conferir: 0,
        por_loja: [
          { loja: "a", nome: "Loja A", valor: "100.00" },
          { loja: null, nome: "Sem loja", valor: "30.00" },
        ],
      }),
    ).toEqual([
      { nome: "Loja A", valor: "100.00" },
      { nome: "Sem loja", valor: "30.00" },
    ]);
  });
});

describe("textos", () => {
  it("situação em português", () => {
    expect(rotuloDaSituacao("CONFERIR")).toBe("Conferir");
    expect(rotuloDaSituacao("DESCARTADO")).toBe("Descartado");
  });

  it("data ISO vira o valor do input datetime-local, no horário de São Paulo", () => {
    expect(paraDataLocal("2026-10-13T13:03:22Z")).toBe("2026-10-13T10:03");
    expect(paraDataLocal(null)).toBe("");
  });
});

describe("acoesDoDetalhe", () => {
  it("conferir: confirma ou descarta", () => {
    expect(acoesDoDetalhe("CONFERIR")).toEqual({ principal: "confirmar", descartar: true });
  });

  it("ok: salva a correção ou descarta", () => {
    expect(acoesDoDetalhe("OK")).toEqual({ principal: "salvar", descartar: true });
  });

  it("descartado: só volta para conferir", () => {
    expect(acoesDoDetalhe("DESCARTADO")).toEqual({ principal: "voltar", descartar: false });
  });
});

describe("rotuloDoTotal", () => {
  it("acompanha o período, como no fechamento de caixa", () => {
    expect(rotuloDoTotal("DIA")).toBe("TOTAL DO DIA");
    expect(rotuloDoTotal("SEMANA")).toBe("TOTAL DA SEMANA");
    expect(rotuloDoTotal("MES")).toBe("TOTAL DO MÊS");
  });
});
