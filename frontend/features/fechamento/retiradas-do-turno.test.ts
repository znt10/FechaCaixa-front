import { describe, expect, it } from "vitest";

import { montarRetiradasDoTurno, somaDasRetiradas } from "./retiradas-do-turno";

/**
 * As retiradas do turno saindo do formulario.
 *
 * Cabia uma pessoa por turno; o dono e a socia retiram no mesmo expediente.
 * A retirada SOMA no total do caixa, entao uma linha perdida em silencio faz a
 * loja aparecer vendendo menos do que vendeu.
 */
const RESPONSAVEIS = [
  { id: "resp-1", nome: "Dona Cida", ativo: true },
  { id: "resp-2", nome: "Seu Juca", ativo: true },
];

const linha = (responsavel: string, valor: string, chave = 0) => ({
  chave,
  responsavel,
  valor,
});

describe("as retiradas do turno", () => {
  it("uma linha por pessoa, com o valor em reais", () => {
    expect(
      montarRetiradasDoTurno(
        [linha("resp-1", "30000", 1), linha("resp-2", "5000", 2)],
        RESPONSAVEIS,
      ),
    ).toEqual({
      ok: true,
      retiradas: [
        { responsavel: "resp-1", valor: "300.00" },
        { responsavel: "resp-2", valor: "50.00" },
      ],
    });
  });

  it("linha em branco sai sem reclamar", () => {
    expect(
      montarRetiradasDoTurno(
        [linha("resp-1", "1000", 1), linha("", "", 2)],
        RESPONSAVEIS,
      ),
    ).toEqual({ ok: true, retiradas: [{ responsavel: "resp-1", valor: "10.00" }] });
  });

  it("valor sem pessoa e recusado", () => {
    expect(montarRetiradasDoTurno([linha("", "1000")], RESPONSAVEIS)).toEqual({
      ok: false,
      erro: "Escolha quem retirou.",
    });
  });

  it("pessoa sem valor diz de quem falta o valor", () => {
    expect(
      montarRetiradasDoTurno(
        [linha("resp-1", "1000", 1), linha("resp-2", "", 2)],
        RESPONSAVEIS,
      ),
    ).toEqual({ ok: false, erro: "Informe quanto Seu Juca retirou." });
  });

  it("sim com todas as linhas em branco e recusado", () => {
    expect(montarRetiradasDoTurno([linha("", "")], RESPONSAVEIS)).toEqual({
      ok: false,
      erro: "Informe quem retirou e o valor retirado.",
    });
  });

  it("soma as linhas em centavos", () => {
    expect(somaDasRetiradas([linha("resp-1", "30000"), linha("", "5050")])).toBe(35050);
  });
});
