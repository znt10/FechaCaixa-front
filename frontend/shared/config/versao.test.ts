import { describe, expect, it } from "vitest";

import { precisaAtualizar } from "./versao";

/**
 * A faixa "atualize" aparece por cima de quem esta lancando o caixa. Ela so
 * pode aparecer quando houve deploy de verdade — nunca por um fetch que caiu
 * no meio do turno.
 */
describe("precisaAtualizar", () => {
  it("avisa quando o servidor esta num build diferente", () => {
    expect(precisaAtualizar("abc1234", "def5678")).toBe(true);
  });

  it("nao avisa quando as duas versoes sao a mesma", () => {
    expect(precisaAtualizar("abc1234", "abc1234")).toBe(false);
  });

  it("nao avisa quando a resposta do servidor nao veio", () => {
    // Sem rede, ou o servidor reiniciando no meio do deploy. O aparelho nao
    // sabe de nada — e nao saber nao e motivo para interromper o lancamento.
    expect(precisaAtualizar("abc1234", undefined)).toBe(false);
    expect(precisaAtualizar("abc1234", "")).toBe(false);
  });

  it("nao avisa quando o proprio aparelho nao sabe em que versao esta", () => {
    expect(precisaAtualizar(undefined, "def5678")).toBe(false);
    expect(precisaAtualizar("", "def5678")).toBe(false);
  });

  it("nao avisa em desenvolvimento", () => {
    // O dev server recarrega sozinho; a faixa so atrapalharia.
    expect(precisaAtualizar("dev", "def5678")).toBe(false);
  });
});
