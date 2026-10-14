import { describe, expect, it } from "vitest";

import { contaDoCaixa } from "./conta-do-caixa";

/**
 * A conta que o formulario mostra antes de enviar, em centavos. Tem que dar o
 * mesmo total que o back grava (FechamentoCaixa.total): a retirada volta, a
 * despesa nao — foi gasta, fica anotada embaixo.
 */
describe("contaDoCaixa", () => {
  it("a retirada volta para o total", () => {
    expect(contaDoCaixa({ recebido: 35000, retirada: 50000, despesas: 0 })).toEqual({
      naGaveta: 35000,
      total: 85000,
      mostraAConta: true,
    });
  });

  it("a despesa fica fora do total", () => {
    // Gaveta 350 com 60 de gas pago: o caixa fecha em 350, e nao em 410.
    expect(contaDoCaixa({ recebido: 35000, retirada: 0, despesas: 6000 })).toEqual({
      naGaveta: 35000,
      total: 35000,
      mostraAConta: false,
    });
  });

  it("o exemplo do dono: gaveta 350, retirada 500, gas e agua 100", () => {
    expect(contaDoCaixa({ recebido: 35000, retirada: 50000, despesas: 10000 }).total).toBe(85000);
  });
});
