import { describe, expect, it } from "vitest";

import { montarConsumosDoTurno } from "./consumo-do-turno";
import type { Encarregado } from "./services/fechamentos";

/**
 * O consumo do turno saindo do formulario.
 *
 * O gerente digita nome e valor de cada um; e aqui que o texto vira cadastro.
 * O que esta em jogo e o total que a dona desconta no fim do mes: uma linha
 * perdida em silencio some do salario de alguem.
 */
const pessoa = (id: string, nome: string, extra: Partial<Encarregado> = {}) => ({
  id,
  nome,
  pode_lancar_caixa: false,
  pode_consumir: true,
  ativo: true,
  ...extra,
});

const CAMILA = pessoa("c1", "Camila Souza");
const JOSE = pessoa("j1", "José Neto");
const QUEM_CONSOME = [CAMILA, JOSE];

const linha = (nome: string, valor: string, chave = 0) => ({ chave, nome, valor });

describe("o consumo do turno", () => {
  it("uma linha por pessoa, com o valor em reais", () => {
    const resultado = montarConsumosDoTurno(
      [linha("Camila Souza", "1250"), linha("José Neto", "800", 1)],
      QUEM_CONSOME,
    );

    expect(resultado).toEqual({
      ok: true,
      consumos: [
        { encarregado: "c1", valor: "12.50" },
        { encarregado: "j1", valor: "8.00" },
      ],
    });
  });

  it("acha a pessoa mesmo com a grafia da pressa", () => {
    // A loja digita no celular: exigir acento e caixa exatos devolveria ao
    // formulario o erro que o cadastro acabou de resolver.
    const resultado = montarConsumosDoTurno(
      [linha(" jose neto ", "800")],
      QUEM_CONSOME,
    );

    expect(resultado).toEqual({
      ok: true,
      consumos: [{ encarregado: "j1", valor: "8.00" }],
    });
  });

  it("linha em branco sai sem reclamar", () => {
    const resultado = montarConsumosDoTurno(
      [linha("Camila Souza", "1250"), linha("", "")],
      QUEM_CONSOME,
    );

    expect(resultado).toEqual({
      ok: true,
      consumos: [{ encarregado: "c1", valor: "12.50" }],
    });
  });

  it("nome que nao esta na lista para o envio", () => {
    const resultado = montarConsumosDoTurno(
      [linha("Marina", "1000")],
      QUEM_CONSOME,
    );

    expect(resultado).toEqual({ ok: false, erro: expect.stringContaining("Marina") });
  });

  it("nome certo e valor zerado para o envio", () => {
    // Sem isto o consumo dessa pessoa sumiria calado, e ela e a unica que
    // perderia — ninguem confere o que nao aparece.
    const resultado = montarConsumosDoTurno(
      [linha("Camila Souza", "")],
      QUEM_CONSOME,
    );

    expect(resultado).toEqual({
      ok: false,
      erro: "Informe quanto Camila Souza consumiu.",
    });
  });

  it("valor sem nome tambem para", () => {
    const resultado = montarConsumosDoTurno([linha("", "1250")], QUEM_CONSOME);

    expect(resultado).toEqual({ ok: false, erro: expect.stringContaining("Sem nome") });
  });

  it("com ninguem marcado para consumo, explica onde marcar", () => {
    const resultado = montarConsumosDoTurno([linha("Camila Souza", "1250")], []);

    expect(resultado).toEqual({
      ok: false,
      erro: expect.stringContaining("tela Empresa"),
    });
  });

  it("lista vazia e um turno sem consumo, nao um erro", () => {
    expect(montarConsumosDoTurno([], QUEM_CONSOME)).toEqual({
      ok: true,
      consumos: [],
    });
  });
});
