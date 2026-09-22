import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { atualizarAposEditarEmpresa } from "./cache-da-empresa";

const clienteLimpo = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Abre uma tela que consulta essa chave e devolve o contador de buscas. */
const telaAberta = async (
  cliente: QueryClient,
  queryKey: readonly unknown[],
  staleTime = 30 * 60 * 1000,
) => {
  const buscar = vi.fn(async () => ({ modulos: { catalogo: true } }));
  const observador = new QueryObserver(cliente, { queryKey, queryFn: buscar, staleTime });
  observador.subscribe(() => {});
  await vi.waitFor(() => expect(observador.getCurrentResult().isSuccess).toBe(true));
  return buscar;
};

describe("o cache depois de editar a empresa", () => {
  it("busca de novo quem está logado", async () => {
    // A aba Catálogo e o filtro Desperdício saem do /user/me, que tem
    // staleTime de 30 minutos. Sem esta invalidação, ligar o catálogo não
    // mudava nada na tela: só saindo e voltando, ou recarregando a página.
    const cliente = clienteLimpo();
    const buscar = await telaAberta(cliente, ["usuario-atual"]);

    atualizarAposEditarEmpresa(cliente);

    await vi.waitFor(() => expect(buscar).toHaveBeenCalledTimes(2));
  });

  it("busca de novo o que o painel cobra de cada loja", async () => {
    // Fechamentos por dia muda a cobrança de todas as lojas.
    const cliente = clienteLimpo();
    const buscar = await telaAberta(cliente, ["painel-caixa", "intervalo"]);

    atualizarAposEditarEmpresa(cliente);

    await vi.waitFor(() => expect(buscar).toHaveBeenCalledTimes(2));
  });

  it("busca de novo a própria empresa", async () => {
    const cliente = clienteLimpo();
    const buscar = await telaAberta(cliente, ["admin", "minha-empresa"]);

    atualizarAposEditarEmpresa(cliente);

    await vi.waitFor(() => expect(buscar).toHaveBeenCalledTimes(2));
  });

  it("não mexe no que a empresa não muda", async () => {
    // As notas fiscais da empresa não têm nada a ver com o formulário nem com
    // o regime de fechamento: refazer a listagem inteira a cada clique num
    // interruptor seria trabalho à toa no meio do expediente.
    const cliente = clienteLimpo();
    const buscar = await telaAberta(cliente, ["notas", "lista"]);

    atualizarAposEditarEmpresa(cliente);

    await new Promise((r) => setTimeout(r, 50));
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});
