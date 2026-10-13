import { describe, expect, it } from "vitest";

import { avisoDeTurnoOcupado, opcoesDeTurno } from "./turno-editavel";
import type { FechamentoLido } from "./services/painel";

/** So o que estas regras leem: o turno e quem lancou. */
const lancamento = (periodo: string, nome: string) =>
  ({ periodo, nome_funcionario: nome }) as FechamentoLido;

/**
 * A correcao do turno no Por loja.
 *
 * Quem fecha a tarde as vezes escolhe "Manha" no formulario, e o painel passa
 * a mostrar duas manhas e nenhuma tarde. A gerencia corrige no cartao do
 * turno, no dia seguinte ou depois.
 */
describe("os turnos que o seletor oferece", () => {
  it("sao os do dia, que o servidor diz", () => {
    // Feriado so o servidor sabe — os locais estao no cadastro da empresa.
    expect(opcoesDeTurno(["MANHA", "TARDE"], "MANHA")).toEqual(["MANHA", "TARDE"]);
  });

  it("o turno atual continua na lista mesmo que o dia nao o tenha mais", () => {
    // A manha lancada antes da padroeira entrar no cadastro: sem ela na lista,
    // o seletor abriria vazio, e salvar o PIX mudaria o turno junto.
    expect(opcoesDeTurno(["DIA"], "MANHA")).toEqual(["MANHA", "DIA"]);
  });

  it("enquanto o servidor nao responde, so o turno atual", () => {
    expect(opcoesDeTurno(undefined, "TARDE")).toEqual(["TARDE"]);
  });
});

describe("o aviso de turno ocupado", () => {
  it("diz quem ja esta no turno de destino", () => {
    const outros = [lancamento("TARDE", "Ana")];

    expect(avisoDeTurnoOcupado("TARDE", outros, false)).toBe(
      "A tarde deste dia já tem o lançamento de Ana. Mover mesmo assim? " +
        "Os dois ficam na tarde até você corrigir um deles.",
    );
  });

  it("fala do feriado com o artigo dele", () => {
    const outros = [lancamento("DIA", "Bruno")];

    expect(avisoDeTurnoOcupado("DIA", outros, false)).toBe(
      "O feriado deste dia já tem o lançamento de Bruno. Mover mesmo assim? " +
        "Os dois ficam no feriado até você corrigir um deles.",
    );
  });

  it("com o turno de destino livre, nao pergunta nada", () => {
    const outros = [lancamento("MANHA", "Ana")];

    expect(avisoDeTurnoOcupado("TARDE", outros, false)).toBeNull();
  });
});
