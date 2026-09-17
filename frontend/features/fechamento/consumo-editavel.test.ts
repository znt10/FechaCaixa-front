import { describe, expect, it } from "vitest";

import {
  assinaturaDoConsumo,
  consumoPelaMetade,
  consumosParaSalvar,
  type LinhaDeConsumoDoPainel,
} from "./consumo-editavel";

const linha = (
  chave: number,
  encarregado: string,
  valor: string,
): LinhaDeConsumoDoPainel => ({ chave, encarregado, valor });

describe("consumosParaSalvar", () => {
  it("converte os centavos digitados no decimal que o backend grava", () => {
    expect(consumosParaSalvar([linha(1, "pessoa-a", "1250")])).toEqual([
      { encarregado: "pessoa-a", valor: "12.50" },
    ]);
  });

  it("descarta a linha em branco que a gerência abriu e não usou", () => {
    expect(
      consumosParaSalvar([linha(1, "pessoa-a", "1250"), linha(2, "", "")]),
    ).toEqual([{ encarregado: "pessoa-a", valor: "12.50" }]);
  });

  it("descarta a linha pela metade em vez de mandar um valor sem dono", () => {
    // O botão de salvar já fica fechado por `consumoPelaMetade`; isto é a
    // segunda tranca, para o caso de a linha chegar aqui mesmo assim.
    expect(
      consumosParaSalvar([linha(1, "", "1250"), linha(2, "pessoa-b", "0")]),
    ).toEqual([]);
  });

  it("lista vazia continua vazia — é o que apaga o consumo do turno", () => {
    expect(consumosParaSalvar([])).toEqual([]);
  });

  it("mantém as duas linhas quando a mesma pessoa comeu duas vezes no turno", () => {
    expect(
      consumosParaSalvar([linha(1, "pessoa-a", "500"), linha(2, "pessoa-a", "300")]),
    ).toEqual([
      { encarregado: "pessoa-a", valor: "5.00" },
      { encarregado: "pessoa-a", valor: "3.00" },
    ]);
  });
});

describe("consumoPelaMetade", () => {
  it("acusa o valor sem dono", () => {
    expect(consumoPelaMetade([linha(1, "", "1250")])).toBe(true);
  });

  it("acusa a pessoa sem valor", () => {
    expect(consumoPelaMetade([linha(1, "pessoa-a", "0")])).toBe(true);
  });

  it("não acusa a linha totalmente em branco", () => {
    expect(consumoPelaMetade([linha(1, "", "")])).toBe(false);
  });

  it("não acusa a linha completa", () => {
    expect(consumoPelaMetade([linha(1, "pessoa-a", "1250")])).toBe(false);
  });
});

describe("assinaturaDoConsumo", () => {
  it("ignora a chave da linha, que só existe para o React", () => {
    expect(assinaturaDoConsumo([linha(1, "pessoa-a", "1250")])).toBe(
      assinaturaDoConsumo([linha(99, "pessoa-a", "1250")]),
    );
  });

  it("ignora a linha em branco: abrir uma e não usar não é uma alteração", () => {
    expect(
      assinaturaDoConsumo([linha(1, "pessoa-a", "1250"), linha(2, "", "")]),
    ).toBe(assinaturaDoConsumo([linha(1, "pessoa-a", "1250")]));
  });

  it("muda quando a pessoa muda", () => {
    expect(assinaturaDoConsumo([linha(1, "pessoa-a", "1250")])).not.toBe(
      assinaturaDoConsumo([linha(1, "pessoa-b", "1250")]),
    );
  });

  it("muda quando o valor muda", () => {
    expect(assinaturaDoConsumo([linha(1, "pessoa-a", "1250")])).not.toBe(
      assinaturaDoConsumo([linha(1, "pessoa-a", "1200")]),
    );
  });

  it("distingue duas linhas iguais de uma só — são dois descontos", () => {
    expect(
      assinaturaDoConsumo([linha(1, "pessoa-a", "500"), linha(2, "pessoa-a", "500")]),
    ).not.toBe(assinaturaDoConsumo([linha(1, "pessoa-a", "500")]));
  });
});
