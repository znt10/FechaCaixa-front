import { describe, expect, it } from "vitest";

import {
  dentroDaJanela,
  limitesDoSeletor,
  marcarOsDias,
  tomDoDia,
  turnoJaLancado,
} from "./reposicao-de-fechamento";
import type { FechamentoLido } from "@/features/fechamento/services/painel";

/**
 * As duas regras da reposicao que nao sao do servidor.
 *
 * O backend ja recusa dia fora da janela e turno repetido — estas funcoes nao
 * substituem nenhuma das duas. Elas existem para a tela nao deixar o gerente
 * preencher trinta campos e so descobrir no envio que o dia nao valia.
 *
 * Por isso a janela precisa ser exatamente a mesma dos 30 dias do serializer:
 * apertada demais, a tela esconde um dia que o servidor aceitaria; folgada
 * demais, ela promete um dia que o servidor recusa.
 */

const HOJE = "2026-09-08";

const lancamento = (extra: Partial<FechamentoLido>): FechamentoLido =>
  ({
    id: "f1",
    loja: "loja-centro",
    periodo: "MANHA",
    data: HOJE,
    ...extra,
  }) as FechamentoLido;

describe("limitesDoSeletor", () => {
  it("nao deixa escolher depois de hoje", () => {
    expect(limitesDoSeletor(HOJE).max).toBe(HOJE);
  });

  it("volta trinta dias", () => {
    expect(limitesDoSeletor(HOJE).min).toBe("2026-08-09");
  });
});

describe("dentroDaJanela", () => {
  it("aceita o trigesimo dia, que e o ultimo que o servidor aceita", () => {
    expect(dentroDaJanela("2026-08-09", HOJE)).toBe(true);
  });

  it("recusa o trigesimo primeiro", () => {
    expect(dentroDaJanela("2026-08-08", HOJE)).toBe(false);
  });

  it("recusa amanha", () => {
    expect(dentroDaJanela("2026-09-09", HOJE)).toBe(false);
  });

  it("aceita hoje — a loja pode ter esquecido o turno da manha", () => {
    expect(dentroDaJanela(HOJE, HOJE)).toBe(true);
  });
});

describe("turnoJaLancado", () => {
  it("acha o turno daquela loja", () => {
    const doDia = [lancamento({ loja: "loja-centro", periodo: "MANHA" })];

    expect(turnoJaLancado(doDia, "loja-centro", "MANHA")).toBe(true);
  });

  it("nao confunde com o mesmo turno de outra loja", () => {
    const doDia = [lancamento({ loja: "loja-bairro", periodo: "MANHA" })];

    expect(turnoJaLancado(doDia, "loja-centro", "MANHA")).toBe(false);
  });

  it("nao confunde com outro turno da mesma loja", () => {
    const doDia = [lancamento({ loja: "loja-centro", periodo: "MANHA" })];

    expect(turnoJaLancado(doDia, "loja-centro", "TARDE")).toBe(false);
  });

  it("dia sem lancamento nenhum e o caso normal da reposicao", () => {
    expect(turnoJaLancado([], "loja-centro", "MANHA")).toBe(false);
  });
});

/**
 * A marca de cada dia no calendario.
 *
 * E o que responde "qual dia a gente esqueceu?" sem o gerente ter que
 * adivinhar, clicar e tomar recusa. Olha uma loja de cada vez porque o buraco
 * e por loja: a Centro ter fechado a terca nao diz nada sobre a do Bairro.
 *
 * 2026-09-06 e um domingo; 2026-09-08, uma terca.
 */
describe("marcarOsDias", () => {
  const HOJE_TERCA = "2026-09-08";

  const marcar = (
    doMes: FechamentoLido[],
    fechamentosPorDia: 1 | 2 = 2,
    loja = "loja-centro",
  ) => marcarOsDias({ doMes, loja, fechamentosPorDia, hoje: HOJE_TERCA });

  it("dia sem lancamento nenhum e o buraco que a tela veio tapar", () => {
    expect(marcar([])("2026-09-07")).toBe("sem-caixa");
  });

  it("dia com os dois turnos esta fechado", () => {
    const doMes = [
      lancamento({ data: "2026-09-07", periodo: "MANHA" }),
      lancamento({ data: "2026-09-07", periodo: "TARDE" }),
    ];

    expect(marcar(doMes)("2026-09-07")).toBe("fechado");
  });

  it("dia com so um dos dois turnos fica incompleto", () => {
    const doMes = [lancamento({ data: "2026-09-07", periodo: "MANHA" })];

    expect(marcar(doMes)("2026-09-07")).toBe("incompleto");
  });

  it("domingo se fecha com um turno so, entao um lancamento ja fecha o dia", () => {
    const doMes = [lancamento({ data: "2026-09-06", periodo: "DOMINGO" })];

    expect(marcar(doMes)("2026-09-06")).toBe("fechado");
  });

  it("empresa de um fechamento por dia fecha a terca com um lancamento", () => {
    const doMes = [lancamento({ data: "2026-09-07", periodo: "DIA" })];

    expect(marcar(doMes, 1)("2026-09-07")).toBe("fechado");
  });

  it("nao conta o lancamento de outra loja", () => {
    const doMes = [
      lancamento({ data: "2026-09-07", periodo: "MANHA", loja: "loja-bairro" }),
      lancamento({ data: "2026-09-07", periodo: "TARDE", loja: "loja-bairro" }),
    ];

    expect(marcar(doMes)("2026-09-07")).toBe("sem-caixa");
  });

  it("dia fora da janela nao e escolhivel, tenha caixa ou nao", () => {
    expect(marcar([])("2026-08-08")).toBe("fora-da-janela");
    expect(marcar([])("2026-09-09")).toBe("fora-da-janela");
  });

  it("hoje entra na janela — a loja pode ter esquecido a manha", () => {
    expect(marcar([])(HOJE_TERCA)).toBe("sem-caixa");
  });
});

/**
 * A cor de cada estado.
 *
 * Existe separado da tela por uma razao so: trocar o verde com o vermelho aqui
 * diria que um dia esta fechado quando ele esta vazio — e o gerente passaria
 * batido justamente pelo dia que veio repor. Um mapa de quatro linhas nao
 * merecia teste; esta consequencia merece.
 *
 * Os tons sao os mesmos que o painel ja usa nos pills de status (LANCADO,
 * REVISAR, AUSENTE): quem aprendeu a ler la nao reaprende aqui.
 */
describe("tomDoDia", () => {
  it("dia fechado usa o tom de lancado", () => {
    expect(tomDoDia("fechado")).toBe("ok");
  });

  it("falta de turno usa o tom de revisar", () => {
    expect(tomDoDia("incompleto")).toBe("atencao");
  });

  it("dia sem fechamento usa o tom de ausente", () => {
    expect(tomDoDia("sem-caixa")).toBe("alerta");
  });

  it("dia fora da janela nao ganha tom — ele ja aparece apagado", () => {
    expect(tomDoDia("fora-da-janela")).toBeNull();
  });
});
