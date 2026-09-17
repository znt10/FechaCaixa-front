import { describe, expect, it } from "vitest";

import { diasDaGrade } from "./BarraDoPeriodo";
import { inicioDaSemana } from "../painel-dados";

/**
 * A grade do calendario.
 *
 * O que esta sendo protegido aqui e uma coisa so: cada linha da grade e uma
 * semana comercial inteira (segunda a domingo). E disso que o modo SEMANA
 * depende para acender a linha inteira quando o ponteiro passa por um dia — se
 * a grade comecasse no domingo, como quase todo calendario, a semana da tela
 * ficaria partida entre duas linhas e o realce apontaria para o periodo errado.
 */
describe("a grade do calendario", () => {
  it("comeca na segunda da semana em que o mes cai", () => {
    // 01/03/2026 e um domingo: a grade tem que abrir na segunda anterior,
    // 23/02, e nao no proprio dia 1.
    expect(diasDaGrade("2026-03")[0]).toBe("2026-02-23");
  });

  it("tem seis linhas de sete dias, sempre", () => {
    // Altura fixa: com cinco linhas em alguns meses, virar o mes mexia no
    // tamanho do calendario e o que estava embaixo do ponteiro trocava.
    for (const mes of ["2026-02", "2026-03", "2026-08", "2027-01"]) {
      expect(diasDaGrade(mes)).toHaveLength(42);
    }
  });

  it("cada linha e uma semana comercial fechada", () => {
    const grade = diasDaGrade("2026-08");

    for (let linha = 0; linha < 6; linha += 1) {
      const dias = grade.slice(linha * 7, linha * 7 + 7);
      expect(inicioDaSemana(dias[0])).toBe(dias[0]);
      expect(dias.every((dia) => inicioDaSemana(dia) === dias[0])).toBe(true);
    }
  });

  it("atravessa a virada do ano sem furo", () => {
    const grade = diasDaGrade("2026-12");

    expect(grade).toContain("2026-12-31");
    expect(grade).toContain("2027-01-01");
  });
});
