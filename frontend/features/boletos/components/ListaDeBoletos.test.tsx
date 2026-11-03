import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Boleto } from "../services/boletos";
import { LinhaDoBoletoVista, linhaFormatada } from "./ListaDeBoletos";

/**
 * Um boleto na tela da gerência. Renderizado em Node puro (sem jsdom): o que
 * se confere é o que aparece.
 */
const BANCARIO = "34191234546789012345767890123457316360000023000";

const boleto = (campos: Partial<Boleto> = {}): Boleto => ({
  id: "b1",
  loja: "l1",
  loja_nome: "Centro",
  origem: "FORMULARIO",
  situacao: "A_PAGAR",
  conferir: false,
  vencimento: "2026-11-03",
  valor: "230.00",
  beneficiario_nome: "Distribuidora Exemplo",
  beneficiario_documento: "",
  linha_digitavel: BANCARIO,
  descricao: "",
  arquivo_tipo: "image/jpeg",
  arquivo_nome: "boleto.jpg",
  tem_arquivo: true,
  created_at: "2026-11-02T10:00:00Z",
  pago_em: null,
  pago_por_nome: null,
  ...campos,
});

const nada = () => {};

const html = (b: Boleto, aba: "A_PAGAR" | "PAGO" = "A_PAGAR") =>
  renderToStaticMarkup(
    <LinhaDoBoletoVista
      boleto={b}
      hoje="2026-11-02"
      aba={aba}
      copiado={false}
      confirmandoDescarte={false}
      aoPagar={nada}
      aoDesfazer={nada}
      aoEditar={nada}
      aoCopiar={nada}
      aoPedirDescarte={nada}
      aoConfirmarDescarte={nada}
      aoCancelarDescarte={nada}
    />,
  );

describe("LinhaDoBoletoVista", () => {
  it("a pagar mostra o prazo e as ações", () => {
    const saida = html(boleto());
    expect(saida).toContain("Vence amanhã");
    expect(saida).toContain(">Paguei</button>");
    expect(saida).toContain(">Editar</button>");
    expect(saida).toContain(">Descartar</button>");
    expect(saida).toContain("R$ 230,00");
  });

  it("mostra a linha digitável em grupos, com Copiar", () => {
    const saida = html(boleto());
    expect(saida).toContain("34191.23454 67890.123457 67890.123457 3 16360000023000");
    expect(saida).toContain(">Copiar</button>");
  });

  it("sem linha, não há o que copiar", () => {
    expect(html(boleto({ linha_digitavel: "" }))).not.toContain("Copiar");
  });

  it("marca o que precisa conferir", () => {
    expect(html(boleto({ conferir: true }))).toContain("Conferir");
  });

  it("pago mostra Desfazer, e não Paguei", () => {
    const saida = html(boleto({ situacao: "PAGO", pago_em: "2026-11-02T12:00:00Z" }), "PAGO");
    expect(saida).toContain(">Desfazer</button>");
    expect(saida).not.toContain("Paguei");
  });
});

describe("linhaFormatada", () => {
  it("boleto bancário no formato impresso", () => {
    expect(linhaFormatada(BANCARIO)).toBe("34191.23454 67890.123457 67890.123457 3 16360000023000");
  });

  it("conta de consumo em quatro blocos com o verificador", () => {
    expect(linhaFormatada("836300000012894700000009011111111115111111111113")).toBe(
      "83630000001-2 89470000000-9 01111111111-5 11111111111-3",
    );
  });
});
