import { describe, expect, it } from "vitest";

import { rotuloDoPeriodo, turnosDoFiltro } from "./painel-dados";
import type { FechamentoLido } from "./services/painel";

/** So o que estas regras leem: o turno e a data. */
const lancamento = (periodo: string, data: string) =>
  ({ periodo, data }) as FechamentoLido;

/**
 * Como o turno aparece escrito na tela.
 *
 * Domingo era gravado como "MANHA" — o painel chamava de manha um caixa que
 * fechou as sete da noite, e quem filtrava por manha somava o domingo junto
 * com as manhas da semana. Virou turno proprio; feriado ficou no turno do
 * expediente inteiro, que ja existia para quem fecha o caixa uma vez por dia.
 */
describe("o rotulo do turno", () => {
  it("chama cada turno pelo nome", () => {
    expect(rotuloDoPeriodo("MANHA")).toBe("Manhã");
    expect(rotuloDoPeriodo("TARDE")).toBe("Tarde");
    expect(rotuloDoPeriodo("DOMINGO")).toBe("Domingo");
    expect(rotuloDoPeriodo("DIA")).toBe("Dia");
  });

  it("nao depende da data para saber que e domingo", () => {
    // O valor carrega o sentido. Enquanto o domingo era "DIA", so a data
    // separava um domingo de um feriado, e cada tela precisava lembrar de
    // passar a data junto — a que esquecesse chamava o domingo de "Dia".
    expect(rotuloDoPeriodo.length).toBe(1);
  });
});

/**
 * Os turnos oferecidos no filtro do painel.
 *
 * A lista ja foi fixa em Manha/Tarde — num domingo, dois botoes que so sabiam
 * devolver tela vazia. E ja saiu so do que estava lancado, que era pior de
 * outro jeito: as dez da manha a tarde ainda nao existe no banco, entao o
 * botao dela aparecia no meio do dia, na frente de quem estava usando.
 */
describe("os turnos oferecidos no filtro", () => {
  const SEGUNDA = "2026-08-24";
  const DOMINGO = "2026-08-30";

  it("num dia comum oferece manha e tarde antes de existirem", () => {
    // As dez da manha, so a manha esta lancada. A tarde continua no filtro:
    // ela vai acontecer, e o botao nao pode nascer no meio do expediente.
    const soAManha = [lancamento("MANHA", SEGUNDA)];

    expect(turnosDoFiltro(soAManha, SEGUNDA, SEGUNDA)).toEqual([
      "MANHA",
      "TARDE",
    ]);
  });

  it("num dia comum sem lancamento nenhum tambem oferece os dois", () => {
    expect(turnosDoFiltro([], SEGUNDA, SEGUNDA)).toEqual(["MANHA", "TARDE"]);
  });

  it("no domingo oferece o turno de domingo, e nao manha e tarde", () => {
    expect(turnosDoFiltro([], DOMINGO, DOMINGO)).toEqual(["DOMINGO"]);
  });

  it("na semana oferece os tres, na ordem em que a loja vive o dia", () => {
    expect(turnosDoFiltro([], SEGUNDA, DOMINGO)).toEqual([
      "MANHA",
      "TARDE",
      "DOMINGO",
    ]);
  });

  it("o feriado so entra pelo turno gravado", () => {
    // A lista de feriados mora no backend de proposito: aqui 25/12 e uma
    // quinta como outra qualquer, e e o lancamento que conta que nao foi.
    const dezembro = [lancamento("DIA", "2025-12-25")];

    expect(turnosDoFiltro(dezembro, "2025-12-01", "2025-12-31")).toEqual([
      "MANHA",
      "TARDE",
      "DOMINGO",
      "DIA",
    ]);
  });

  it("no dia do feriado nao oferece manha nem tarde", () => {
    // Com tudo do periodo num turno unico, o calendario nao tem o que dizer:
    // aquele dia nao teve manha nem tarde para recortar.
    const natal = [lancamento("DIA", "2025-12-25")];

    expect(turnosDoFiltro(natal, "2025-12-25", "2025-12-25")).toEqual(["DIA"]);
  });

  it("a empresa que fecha o caixa uma vez por dia nao ganha manha e tarde", () => {
    // Conserta um caso que existia desde sempre: essa empresa via dois
    // recortes errados todo dia do ano.
    const mes = [
      lancamento("DIA", "2026-08-03"),
      lancamento("DIA", "2026-08-04"),
    ];

    expect(turnosDoFiltro(mes, "2026-08-01", "2026-08-31", true)).toEqual([
      "DIA",
    ]);
  });

  it("nao adivinha isso pelos dados", () => {
    // Um mes em que a loja so lancou no feriado tem a mesma cara de um mes de
    // quem fecha o caixa uma vez por dia. Adivinhar erraria num dos dois, e
    // seria justamente o erro de sumir com manha e tarde de quem tem os dois.
    const soUmFeriado = [lancamento("DIA", "2025-12-25")];

    expect(turnosDoFiltro(soUmFeriado, "2025-12-01", "2025-12-31")).toContain(
      "TARDE",
    );
  });
});
