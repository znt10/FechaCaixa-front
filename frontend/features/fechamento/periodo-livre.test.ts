import { describe, expect, it } from "vitest";

import {
  PERIODO_VAZIO,
  escolherDia,
  posicaoNoPeriodo,
  rotuloDoPeriodoLivre,
} from "./periodo-livre";
import { rotuloDoIntervalo } from "./painel-dados";

/**
 * O periodo que a dona escolhe clicando no calendario.
 *
 * O caso que trouxe isto: no dia 25 o consumo vai para o financeiro, do dia 26
 * do mes anterior ate o 25. Nao e dia, nem semana, nem mes — e um clique no
 * primeiro dia e outro no ultimo, sem digitar data.
 */
describe("escolher o periodo no calendario", () => {
  it("o primeiro clique marca o inicio e deixa o fim em aberto", () => {
    expect(escolherDia(PERIODO_VAZIO, "2026-09-26")).toEqual({
      de: "2026-09-26",
      ate: null,
    });
  });

  it("o segundo clique fecha o periodo, mesmo em outro mes", () => {
    const comecado = escolherDia(PERIODO_VAZIO, "2026-09-26");

    expect(escolherDia(comecado, "2026-10-25")).toEqual({
      de: "2026-09-26",
      ate: "2026-10-25",
    });
  });

  it("clicar antes do inicio troca as pontas em vez de recusar", () => {
    // Quem comecou pelo fim nao errou nada: o periodo e o mesmo.
    const comecado = escolherDia(PERIODO_VAZIO, "2026-10-25");

    expect(escolherDia(comecado, "2026-09-26")).toEqual({
      de: "2026-09-26",
      ate: "2026-10-25",
    });
  });

  it("dois cliques no mesmo dia escolhem aquele dia so", () => {
    const comecado = escolherDia(PERIODO_VAZIO, "2026-10-13");

    expect(escolherDia(comecado, "2026-10-13")).toEqual({
      de: "2026-10-13",
      ate: "2026-10-13",
    });
  });

  it("com o periodo fechado, o proximo clique comeca outro", () => {
    const fechado = { de: "2026-09-26", ate: "2026-10-25" };

    expect(escolherDia(fechado, "2026-10-01")).toEqual({
      de: "2026-10-01",
      ate: null,
    });
  });
});

describe("o desenho do periodo no calendario", () => {
  const periodo = { de: "2026-09-26", ate: "2026-09-28" };

  it("as duas pontas acendem cheias", () => {
    expect(posicaoNoPeriodo("2026-09-26", periodo)).toBe("ponta");
    expect(posicaoNoPeriodo("2026-09-28", periodo)).toBe("ponta");
  });

  it("os dias do meio acendem suaves", () => {
    expect(posicaoNoPeriodo("2026-09-27", periodo)).toBe("meio");
  });

  it("fora do periodo nao acende nada", () => {
    expect(posicaoNoPeriodo("2026-09-25", periodo)).toBeNull();
    expect(posicaoNoPeriodo("2026-09-29", periodo)).toBeNull();
  });

  it("com so o inicio escolhido, so ele acende", () => {
    const comecado = { de: "2026-09-26", ate: null };

    expect(posicaoNoPeriodo("2026-09-26", comecado)).toBe("ponta");
    expect(posicaoNoPeriodo("2026-09-27", comecado)).toBeNull();
  });
});

describe("o periodo escrito por extenso", () => {
  it("diz o que falta enquanto o periodo nao fecha", () => {
    expect(rotuloDoPeriodoLivre(PERIODO_VAZIO)).toBe("Clique no primeiro dia");
    expect(rotuloDoPeriodoLivre({ de: "2026-09-26", ate: null })).toBe(
      "Agora clique no último dia",
    );
  });

  it("escreve os dois meses quando o periodo vira o mes", () => {
    expect(rotuloDoIntervalo("2026-09-26", "2026-10-25")).toBe(
      "26 de setembro de 2026 a 25 de outubro de 2026",
    );
  });

  it("escreve o mes uma vez so quando cabe nele", () => {
    expect(rotuloDoIntervalo("2026-10-04", "2026-10-22")).toBe(
      "4 a 22 de outubro de 2026",
    );
  });

  it("um dia so sai como dia, e nao como 13 a 13", () => {
    expect(rotuloDoIntervalo("2026-10-13", "2026-10-13")).toBe(
      "Terça, 13 de outubro de 2026",
    );
  });
});
