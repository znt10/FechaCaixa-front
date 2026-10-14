import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LinhaDaPlataforma } from "./LinhaDaPlataforma";
import type { EmpresaDaPlataforma } from "../services/mensalidade";

/**
 * A linha de cada empresa na Plataforma. Renderizada em Node puro (sem
 * jsdom), como o RevisaoDoEnvio.test: o que se confere e o que aparece.
 */
const empresa = {
  id: "e1",
  nome: "ZNT",
  ativo: true,
  situacao: "EM_DIA",
  valor_mensal: "100.00",
  paga_ate: "2026-11-10",
  isenta: false,
  nunca_bloquear: false,
  aguardando: null,
  ultimo_pagamento: { valor: "100.00", resolvido_em: "2026-10-10T12:00:00Z", origem: "MANUAL" },
} as EmpresaDaPlataforma;

const renderizar = () =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <LinhaDaPlataforma empresa={empresa} />
    </QueryClientProvider>,
  );

describe("a linha da empresa na Plataforma", () => {
  it("mostra valor e paga ate escritos, como o ultimo pagamento", () => {
    // O valor era uma caixa de digitar sempre aberta, clara, e lia diferente
    // dos outros dois numeros da linha.
    const html = renderizar();

    expect(html).toMatch(/Valor:\s*<strong[^>]*>R\$ 100,00<\/strong>/);
    expect(html).toMatch(/Paga até:\s*<strong[^>]*>10\/11\/2026<\/strong>/);
    expect(html).toMatch(/Último pagamento:\s*<strong/);
  });

  it("so abre os campos quando pedem para editar", () => {
    const html = renderizar();

    expect(html).toContain(">Editar</button>");
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain('type="date"');
  });
});
