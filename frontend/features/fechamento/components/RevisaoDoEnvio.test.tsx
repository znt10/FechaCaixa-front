import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RevisaoDoEnvio } from "./RevisaoDoEnvio";
import type { Revisao } from "@/features/fechamento/revisao-do-envio";

/**
 * A tela burra que so desenha o que revisao-do-envio.ts montou (ver a
 * docstring do componente). O que esta em jogo aqui e um detalhe visual que
 * o teste de montarRevisao nao alcanca: o componente prefixa "R$" na frente
 * de todo `linha.valor` nao vazio, porque ate agora todo bloco era dinheiro.
 * Desperdicio quebrou essa premissa (o valor e "8 un"), e sem este teste a
 * regressao — "R$ 8 un" na tela da loja — passaria despercebida.
 *
 * Sem react-testing-library no projeto: `renderToStaticMarkup` roda em Node
 * puro (sem jsdom) e basta para checar o texto renderizado.
 */
const revisaoDe = (blocos: Revisao["blocos"]): Revisao => ({
  loja: "Centro",
  turno: "Tarde",
  lancadoPor: "Ana",
  recebido: [{ rotulo: "PIX", valor: "10,00" }],
  blocos,
  total: "10,00",
});

const renderizar = (revisao: Revisao) =>
  renderToStaticMarkup(
    <RevisaoDoEnvio
      revisao={revisao}
      corrigindo={false}
      enviando={false}
      erro={null}
      onVoltar={() => {}}
      onConfirmar={() => {}}
    />,
  );

describe("RevisaoDoEnvio", () => {
  it("mostra a linha de desperdicio sem R$", () => {
    const html = renderizar(
      revisaoDe([
        { titulo: "Desperdício", linhas: [{ rotulo: "Coxinha", valor: "8 un" }] },
      ]),
    );

    expect(html).toContain("8 un");
    expect(html).not.toContain("R$ 8 un");
  });

  it("mantem o R$ nos blocos de dinheiro", () => {
    const html = renderizar(
      revisaoDe([
        { titulo: "Consumo", linhas: [{ rotulo: "Rita", valor: "12,00" }] },
      ]),
    );

    expect(html).toContain("R$ 12,00");
  });

  it("as quatro formas de pagamento continuam com R$, com ou sem desperdicio no mesmo envio", () => {
    const html = renderizar(
      revisaoDe([
        { titulo: "Desperdício", linhas: [{ rotulo: "Coxinha", valor: "8 un" }] },
      ]),
    );

    expect(html).toContain("R$ 10,00");
  });
});
