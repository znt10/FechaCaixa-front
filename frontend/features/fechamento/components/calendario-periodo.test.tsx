import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CalendarioDeDias } from "./BarraDoPeriodo";

/**
 * O calendario no modo periodo: em vez de um dia, acende o trecho entre os dois
 * cliques. Renderizado em Node puro (sem jsdom), como o RevisaoDoEnvio.test.
 */
const diasMarcados = (html: string) =>
  [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>(\d+)<\/button>/g)].map(
    (casamento) => Number(casamento[1]),
  );

describe("o calendario escolhendo um periodo", () => {
  it("acende do primeiro ao ultimo dia, com o meio junto", () => {
    const html = renderToStaticMarkup(
      <CalendarioDeDias
        diaISO="2026-09-26"
        porSemana={false}
        aoEscolher={() => {}}
        periodo={{ de: "2026-09-26", ate: "2026-09-28" }}
      />,
    );

    expect(diasMarcados(html)).toEqual([26, 27, 28]);
  });

  it("com so o inicio escolhido, acende so ele", () => {
    const html = renderToStaticMarkup(
      <CalendarioDeDias
        diaISO="2026-09-26"
        porSemana={false}
        aoEscolher={() => {}}
        periodo={{ de: "2026-09-26", ate: null }}
      />,
    );

    expect(diasMarcados(html)).toEqual([26]);
  });

  it("sem periodo nenhum ainda, nada acende", () => {
    // Entrar no modo periodo nao pode parecer que um dia ja foi escolhido —
    // o dia de hoje continua so com o anel, e nao cheio.
    const html = renderToStaticMarkup(
      <CalendarioDeDias
        diaISO="2026-09-26"
        porSemana={false}
        aoEscolher={() => {}}
        periodo={{ de: null, ate: null }}
      />,
    );

    expect(diasMarcados(html)).toEqual([]);
  });
});
