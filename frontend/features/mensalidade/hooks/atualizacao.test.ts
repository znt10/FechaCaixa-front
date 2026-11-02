import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { MinhaMensalidade } from "../services/mensalidade";

// O React Query decide na carga do modulo se esta no servidor (sem `window`),
// e no servidor nao ha `refetchInterval`. Os testes rodam em Node puro: um
// `window` minimo antes de importar, e o import depois.
vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });

let QueryClient: typeof import("@tanstack/react-query").QueryClient;
let QueryObserver: typeof import("@tanstack/react-query").QueryObserver;
let INTERVALO_DA_MENSALIDADE: number;
let opcoesDaMinhaMensalidade: typeof import("./useMensalidade").opcoesDaMinhaMensalidade;

beforeAll(async () => {
  ({ QueryClient, QueryObserver } = await import("@tanstack/react-query"));
  ({ INTERVALO_DA_MENSALIDADE, opcoesDaMinhaMensalidade } = await import("./useMensalidade"));
});

/**
 * A mensalidade muda fora desta tela: o dono marca a empresa na Plataforma,
 * ou a InfinitePay confirma o pagamento. A tela da loja tem que ver isso
 * sozinha, sem sair e voltar.
 */
describe("a mensalidade se atualiza sozinha", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("relê a cada 15 segundos", async () => {
    const respostas: MinhaMensalidade[] = [
      { situacao: "ATRASADA" },
      { situacao: "EM_DIA" },
    ];
    const buscar = vi.fn(async () => respostas.shift() ?? { situacao: "EM_DIA" });
    const cliente = new QueryClient();
    const observador = new QueryObserver(cliente, {
      ...opcoesDaMinhaMensalidade,
      queryFn: buscar,
    });
    const sair = observador.subscribe(() => {});

    await vi.waitFor(() =>
      expect(observador.getCurrentResult().data?.situacao).toBe("ATRASADA"),
    );
    await vi.advanceTimersByTimeAsync(INTERVALO_DA_MENSALIDADE);

    expect(buscar).toHaveBeenCalledTimes(2);
    expect(observador.getCurrentResult().data?.situacao).toBe("EM_DIA");
    sair();
    cliente.clear();
  });

  it("nunca vale como fresca e relê ao voltar para a aba", () => {
    expect(INTERVALO_DA_MENSALIDADE).toBe(15 * 1000);
    expect(opcoesDaMinhaMensalidade.staleTime).toBe(0);
    expect(opcoesDaMinhaMensalidade.refetchOnWindowFocus).toBe(true);
    expect(opcoesDaMinhaMensalidade.refetchIntervalInBackground).toBe(false);
  });
});
