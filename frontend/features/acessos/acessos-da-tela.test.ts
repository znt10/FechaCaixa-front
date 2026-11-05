import { describe, expect, it } from "vitest";

import {
  avisoDoGerente,
  corpoDoGerente,
  enviarGerente,
  rotuloDaSituacao,
} from "./acessos-da-tela";

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

describe("enviarGerente", () => {
  const campos = { nome: "Ana", email: "a@x.com", senha: "" };

  it("deu certo: manda o corpo e limpa o formulário", async () => {
    const enviados: unknown[] = [];
    let limpou = false;
    await enviarGerente(campos, async (corpo) => { enviados.push(corpo); }, () => { limpou = true; });
    expect(enviados).toEqual([{ nome: "Ana", email: "a@x.com" }]);
    expect(limpou).toBe(true);
  });

  it("deu erro (e-mail em uso): não apaga o que foi digitado, nem estoura", async () => {
    let limpou = false;
    await enviarGerente(
      campos,
      async () => { throw new Error("Este email ja esta em uso."); },
      () => { limpou = true; },
    );
    expect(limpou).toBe(false);
  });
});
