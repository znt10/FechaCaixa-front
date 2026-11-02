import { describe, expect, it } from "vitest";

import { avisoDeBoletoNaoSalvo, valorDoCampo } from "./boletos-do-formulario";

describe("avisoDeBoletoNaoSalvo", () => {
  it("segura o envio do turno quando há foto de boleto que não foi salva", () => {
    expect(avisoDeBoletoNaoSalvo({ houve: true, pendente: true })).toBe(
      "Há um boleto com foto que não foi salvo. Toque em “Salvar boleto” antes de enviar o caixa.",
    );
  });

  it("não segura nada sem foto pendente, ou com a pergunta em Não", () => {
    expect(avisoDeBoletoNaoSalvo({ houve: true, pendente: false })).toBeNull();
    expect(avisoDeBoletoNaoSalvo({ houve: false, pendente: true })).toBeNull();
  });
});

describe("valorDoCampo", () => {
  it("o campo de moeda apagado mostra 0,00: zero é não ter digitado", () => {
    expect(valorDoCampo("")).toBeUndefined();
    expect(valorDoCampo("00")).toBeUndefined();
    expect(valorDoCampo("0")).toBeUndefined();
  });

  it("valor digitado vai em reais com ponto", () => {
    expect(valorDoCampo("23000")).toBe("230.00");
  });
});
