import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LinhaDaConexao } from "./LinhaDaConexao";
import type { ConexaoPluggy } from "../services/pluggy";

/** A linha de cada conexão na página Pluggy, renderizada em Node puro. */
const conexao = {
  id: "c1",
  empresa: { id: "e1", nome: "ZNT" },
  email: "dono@znt.com.br",
  estado: "COM_ERRO",
  client_id: "abc",
  segredo_salvo_em: "2026-10-18T12:00:00Z",
  item_ids: "item-1",
  conectada_em: "2026-10-18T12:00:00Z",
  ultima_busca_ok_em: "2026-10-18T10:00:00Z",
  ultimo_erro: "A autorização no banco venceu",
  contas: [{ id: "k1", numero: "12345-6", banco_nome: "Santander", loja: "Centro" }],
} as ConexaoPluggy;

const renderizar = (c: ConexaoPluggy = conexao) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <LinhaDaConexao conexao={c} />
    </QueryClientProvider>,
  );

describe("a linha da conexão na página Pluggy", () => {
  const html = renderizar();

  it("caída mostra o motivo", () => expect(html).toContain("A autorização no banco venceu"));
  it("mostra o estado", () => expect(html).toContain("Caiu"));
  it("não mostra o segredo em lugar nenhum", () => expect(html).not.toContain("client_secret"));
  it("mostra quando conectou", () => expect(html).toContain("Conectada em 18/10"));
  it("mostra a empresa, o e-mail e as contas", () => {
    expect(html).toContain("ZNT");
    expect(html).toContain("dono@znt.com.br");
    expect(html).toContain("12345-6");
  });
  it("funcionando não mostra motivo", () => {
    const ok = renderizar({ ...conexao, estado: "ATIVA", ultimo_erro: "" });
    expect(ok).toContain("Funcionando");
    expect(ok).not.toContain("A autorização");
  });
});
