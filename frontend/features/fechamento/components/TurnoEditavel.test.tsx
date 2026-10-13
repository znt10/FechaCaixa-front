import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TurnoEditavel } from "./TurnoEditavel";
import type { Periodo } from "../services/fechamentos";
import type { FechamentoLido } from "../services/painel";

/**
 * O seletor de turno no cartao do Por loja. Renderizado em Node puro (sem
 * jsdom), como o RevisaoDoEnvio.test: o que se confere e o que aparece.
 */
const lancado = (periodo: Periodo) =>
  ({
    id: "f1",
    loja: "l1",
    loja_nome: "Centro",
    nome_funcionario: "Ana",
    lancado_por: null,
    data: "2026-08-05",
    periodo,
    pix: "100.00",
    cartao: "0.00",
    dinheiro: "0.00",
    link_pagamento: "0.00",
    houve_retirada: false,
    responsavel_retirada: null,
    valor_retirado: null,
    retiradas: [],
    despesas: [],
    houve_devolucao: false,
    devolucao_valor: null,
    houve_desperdicio: false,
    desperdicio_detalhes: null,
    consumos: [],
    desperdicios: [],
    conferido: false,
    editado_por_nome: null,
    created_at: "2026-08-05T18:00:00Z",
  }) as unknown as FechamentoLido;

const renderizar = (periodo: Periodo, turnosDoDia: Periodo[] | undefined) =>
  renderToStaticMarkup(
    <TurnoEditavel
      fechamento={lancado(periodo)}
      responsaveis={[]}
      quemConsome={[]}
      turnosDoDia={turnosDoDia}
      outrosDoDia={[]}
      umFechamentoPorDia={false}
      onSalvar={async () => {}}
      onConferir={() => {}}
      conferindo={false}
      onCancelar={async () => {}}
    />,
  );

describe("o turno no cartao do Por loja", () => {
  it("num dia comum, oferece manha e tarde, com o atual marcado", () => {
    const html = renderizar("MANHA", ["MANHA", "TARDE"]);

    expect(html).toContain('id="turno-f1"');
    expect(html).toMatch(/<option value="MANHA" selected="">Manhã<\/option>/);
    expect(html).toMatch(/<option value="TARDE">Tarde<\/option>/);
  });

  it("no domingo nao ha para onde mover, e o seletor nao aparece", () => {
    const html = renderizar("DOMINGO", ["DOMINGO"]);

    expect(html).not.toContain('id="turno-f1"');
  });

  it("o turno do dia inteiro aparece como feriado no titulo", () => {
    const html = renderizar("DIA", ["DIA"]);

    expect(html).toMatch(/<h3[^>]*>Feriado<\/h3>/);
  });
});
