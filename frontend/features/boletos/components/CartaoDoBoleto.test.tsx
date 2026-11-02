import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CartaoDoBoletoVista } from "./CartaoDoBoleto";

/**
 * O cartão onde a loja manda o boleto. Renderizado em Node puro (sem jsdom),
 * como o RevisaoDoEnvio.test: o que se confere é o que aparece.
 */
const html = (props: Partial<Parameters<typeof CartaoDoBoletoVista>[0]> = {}) =>
  renderToStaticMarkup(
    <CartaoDoBoletoVista
      id="boleto-1"
      arquivoNome={null}
      vencimento=""
      valorDigitos=""
      pedindoData={false}
      enviando={false}
      erro={null}
      semLoja={false}
      aoEscolherArquivo={() => {}}
      aoMudarVencimento={() => {}}
      aoMudarValor={() => {}}
      aoSalvar={() => {}}
      {...props}
    />,
  );

describe("CartaoDoBoletoVista", () => {
  it("aceita foto e PDF, e o celular oferece a câmera", () => {
    expect(html()).toContain('accept="image/*,application/pdf"');
  });

  it("sem a data, avisa e troca o botão", () => {
    const saida = html({ pedindoData: true });
    expect(saida).toContain("Sem a data, o boleto chega para o dono como “sem data”.");
    expect(saida).toContain(">Salvar sem data</button>");
  });

  it("enquanto envia, o botão fica desligado: o toque duplo não cria dois boletos", () => {
    expect(html({ enviando: true })).toMatch(/<button[^>]*disabled=""[^>]*>Salvando…<\/button>/);
  });

  it("sem loja escolhida, desliga e explica", () => {
    const saida = html({ semLoja: true });
    expect(saida).toMatch(/<button[^>]*disabled=""[^>]*>Salvar boleto<\/button>/);
    expect(saida).toContain("Escolha a loja lá em cima para salvar o boleto.");
  });

  it("mostra o erro que o servidor mandou", () => {
    expect(html({ erro: "A foto não abriu. Tire outra." })).toContain(
      "A foto não abriu. Tire outra.",
    );
  });

  // Abaixo de 16px o Safari do iPhone dá zoom na tela ao tocar no campo.
  it("a data usa letra de 16px", () => {
    expect(html()).toMatch(/<input[^>]*type="date"[^>]*text-\[16px\]|<input[^>]*text-\[16px\][^>]*type="date"/);
  });
});
