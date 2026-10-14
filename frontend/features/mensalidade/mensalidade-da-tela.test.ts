import { describe, expect, it } from "vitest";

import {
  emDataEHora,
  estadoDoPortao,
  faixaDaMensalidade,
  mostrarPlataforma,
  umMesDepois,
} from "./mensalidade-da-tela";
import type { MinhaMensalidade } from "./services/mensalidade";

const base: MinhaMensalidade = {
  situacao: "EM_DIA",
  valor: "100.00",
  paga_ate: "2026-10-10",
  dias: 20,
  bloqueia_em: "2026-10-16",
  aguardando: null,
  pode_informar: true,
  pix: null,
};

describe("a faixa da mensalidade", () => {
  it("em dia não mostra nada", () => {
    expect(faixaDaMensalidade(base)).toBeNull();
  });

  it("vencendo conta os dias", () => {
    expect(faixaDaMensalidade({ ...base, situacao: "VENCENDO", dias: 3 })?.texto).toBe(
      "Sua mensalidade de R$ 100,00 vence em 3 dias.",
    );
    expect(faixaDaMensalidade({ ...base, situacao: "VENCENDO", dias: 1 })?.texto).toBe(
      "Sua mensalidade de R$ 100,00 vence amanhã.",
    );
    expect(faixaDaMensalidade({ ...base, situacao: "VENCENDO", dias: 0 })?.texto).toBe(
      "Sua mensalidade de R$ 100,00 vence hoje.",
    );
  });

  it("atrasada diz quando bloqueia e oferece o Pix", () => {
    const faixa = faixaDaMensalidade({ ...base, situacao: "ATRASADA", dias: 2 });
    expect(faixa).toEqual({
      tom: "alerta",
      texto:
        "Sua mensalidade de R$ 100,00 está vencida há 2 dias. O painel é bloqueado em 16/10/2026.",
      mostraPix: true,
    });
  });

  it("atrasada que nunca bloqueia não promete bloqueio", () => {
    const faixa = faixaDaMensalidade({
      ...base, situacao: "ATRASADA", dias: 1, bloqueia_em: null,
    });
    expect(faixa?.texto).toBe("Sua mensalidade de R$ 100,00 está vencida há 1 dia.");
  });

  it("aguardando não oferece o Pix de novo", () => {
    const faixa = faixaDaMensalidade({
      ...base,
      situacao: "AGUARDANDO",
      aguardando: { informado_em: "2026-09-30T14:05:00-03:00" },
    });
    expect(faixa).toEqual({
      tom: "info",
      texto: "Pagamento informado em 30/09 às 14:05, aguardando confirmação.",
      mostraPix: false,
    });
  });

  it("sem resposta não mostra nada", () => {
    expect(faixaDaMensalidade(undefined)).toBeNull();
  });
});

describe("o portão do painel", () => {
  it("trava só bloqueada e desativada", () => {
    expect(estadoDoPortao({ ...base, situacao: "BLOQUEADA" })).toBe("BLOQUEADA");
    expect(estadoDoPortao({ situacao: "DESATIVADA" })).toBe("DESATIVADA");
    for (const situacao of ["EM_DIA", "VENCENDO", "ATRASADA", "AGUARDANDO", "ISENTA"] as const) {
      expect(estadoDoPortao({ ...base, situacao })).toBe("LIBERADO");
    }
  });

  it("carregando ou com erro deixa passar: quem barra é o servidor", () => {
    expect(estadoDoPortao(undefined)).toBe("LIBERADO");
  });
});

describe("datas", () => {
  it("um mês depois vira o ano e limita o dia a 28", () => {
    expect(umMesDepois("2026-12-15")).toBe("2027-01-15");
    expect(umMesDepois("2026-01-31")).toBe("2026-02-28");
  });

  it("data e hora em Brasília", () => {
    expect(emDataEHora("2026-10-01T02:30:00Z")).toBe("30/09 às 23:30");
  });
});

describe("quem vê a Plataforma", () => {
  it("só o superusuário", () => {
    expect(mostrarPlataforma({ id: 1, super: true })).toBe(true);
    expect(mostrarPlataforma({ id: 1, super: false, group: "Admin" })).toBe(false);
    expect(mostrarPlataforma(undefined)).toBe(false);
  });
});
