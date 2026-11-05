import { describe, expect, it } from "vitest";

import { avisoDoGerente, corpoDoGerente, rotuloDaSituacao } from "./acessos-da-tela";

describe("avisoDoGerente", () => {
  it("diz se o link foi, se a senha foi dada ou se o e-mail falhou", () => {
    expect(avisoDoGerente("a@x.com", true)).toBe("Gerente criado. Link enviado para a@x.com.");
    expect(avisoDoGerente("a@x.com", null)).toBe("Gerente criado com a senha informada.");
    expect(avisoDoGerente("a@x.com", false)).toBe(
      "Gerente criado, mas o e-mail não saiu. Use Reenviar link.",
    );
  });
});

describe("corpoDoGerente", () => {
  it("senha em branco não vai: é o pedido do link", () => {
    expect(corpoDoGerente({ nome: " Ana ", email: " a@x.com ", senha: "  " })).toEqual({
      nome: "Ana",
      email: "a@x.com",
    });
  });

  it("senha preenchida vai como foi digitada", () => {
    expect(corpoDoGerente({ nome: "Ana", email: "a@x.com", senha: "segredo1" })).toEqual({
      nome: "Ana",
      email: "a@x.com",
      senha: "segredo1",
    });
  });
});

describe("rotuloDaSituacao", () => {
  it("em palavras", () => {
    expect(rotuloDaSituacao("ATIVO")).toBe("Ativo");
    expect(rotuloDaSituacao("AGUARDANDO_SENHA")).toBe("Aguardando senha");
    expect(rotuloDaSituacao("DESATIVADO")).toBe("Desativado");
  });
});
