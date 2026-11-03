import { describe, expect, it } from "vitest";

import { prazoDoBoleto, resumoDoBoletoSalvo, textoDaFaixa } from "./prazo-do-boleto";

const hoje = "2026-11-02";
const zero = { sem_data: 0, vencidos: 0, hoje: 0, em_3_dias: 0, em_7_dias: 0, aviso: 0 };

describe("prazoDoBoleto", () => {
  it("sem data, vencido e hoje pedem atencao", () => {
    expect(prazoDoBoleto(null, hoje)).toEqual({ rotulo: "Sem data", tom: "alerta" });
    expect(prazoDoBoleto("2026-11-01", hoje)).toEqual({ rotulo: "Vencido há 1 dia", tom: "alerta" });
    expect(prazoDoBoleto("2026-10-28", hoje)).toEqual({ rotulo: "Vencido há 5 dias", tom: "alerta" });
    expect(prazoDoBoleto("2026-11-02", hoje)).toEqual({ rotulo: "Vence hoje", tom: "alerta" });
  });

  it("ate 3 dias e aviso; depois, neutro", () => {
    expect(prazoDoBoleto("2026-11-03", hoje)).toEqual({ rotulo: "Vence amanhã", tom: "aviso" });
    expect(prazoDoBoleto("2026-11-05", hoje)).toEqual({ rotulo: "Vence em 3 dias", tom: "aviso" });
    expect(prazoDoBoleto("2026-11-06", hoje)).toEqual({ rotulo: "Vence em 4 dias", tom: "neutro" });
  });

  it("conta dias de calendario, inclusive na virada do mes", () => {
    expect(prazoDoBoleto("2026-12-01", "2026-11-30").rotulo).toBe("Vence amanhã");
  });
});

describe("textoDaFaixa", () => {
  it("nada pedindo atencao, nada de faixa", () => {
    expect(textoDaFaixa(zero)).toBeNull();
  });

  it("junta as faixas na ordem, no singular e no plural", () => {
    expect(
      textoDaFaixa({ ...zero, vencidos: 1, em_3_dias: 1, em_7_dias: 1, sem_data: 1, aviso: 4 }),
    ).toBe("Boletos: 1 vencido · 2 vencem nos próximos 7 dias · 1 sem data");
    expect(textoDaFaixa({ ...zero, hoje: 2, aviso: 2 })).toBe("Boletos: 2 vencem hoje");
    expect(textoDaFaixa({ ...zero, vencidos: 3, hoje: 1, aviso: 4 })).toBe(
      "Boletos: 3 vencidos · 1 vence hoje",
    );
  });
});

describe("resumoDoBoletoSalvo", () => {
  it("diz o vencimento e o valor do que a loja acabou de salvar", () => {
    expect(resumoDoBoletoSalvo({ vencimento: "2026-11-20", valor: "230.00" })).toBe(
      "Boleto salvo · vence 20/11 · R$ 230,00",
    );
    expect(resumoDoBoletoSalvo({ vencimento: null, valor: null })).toBe("Boleto salvo · sem data");
  });
});
