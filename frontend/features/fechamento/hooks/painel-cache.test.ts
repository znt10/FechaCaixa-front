import {
  QueryClient,
  QueryObserver,
  type QueryObserverOptions,
} from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

/**
 * Trocar de tela no painel nao pode refazer a consulta que acabou de voltar.
 *
 * As quatro telas do painel (/fechamentos, /por-loja, /saidas, /graficos)
 * abrem no mesmo periodo — a semana ou o dia de hoje — entao usam a MESMA
 * chave de cache. Com staleTime 0, o dado nascia velho: ir de /saidas para
 * /graficos disparava de novo o `fechamentos-caixa/?de=...` que tinha
 * chegado dois segundos antes.
 *
 * O teste monta e desmonta o QueryObserver, que e o que o useQuery faz por
 * baixo quando a pagina entra e sai da tela.
 */
const INTERVALO_DE_ATUALIZACAO = 30 * 1000;

const clienteLimpo = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/**
 * Abre a tela, espera o dado chegar, e sai.
 *
 * Esperar o dado e o ponto: se desmontar no meio da requisicao, a montagem
 * seguinte apenas se pendura no fetch que ja esta voando (o React Query
 * deduplica), e o teste passa por engano — sem provar nada sobre staleTime.
 * Foi o que aconteceu na primeira versao deste arquivo.
 */
const visitarTela = async (
  cliente: QueryClient,
  opcoes: QueryObserverOptions<unknown, Error, unknown, unknown, readonly unknown[]>,
) => {
  const observador = new QueryObserver(cliente, opcoes);
  const sair = observador.subscribe(() => {});
  await vi.waitFor(() =>
    expect(observador.getCurrentResult().isSuccess).toBe(true),
  );
  sair();
};

const chaveDaSemana = (de: string, ate: string) => [
  "painel-caixa",
  "intervalo",
  de,
  ate,
];

describe("o cache do painel ao trocar de tela", () => {
  it("nao repete a consulta quando a outra tela pede o mesmo periodo", async () => {
    const buscar = vi.fn(async () => [{ id: "1" }]);
    const opcoes = {
      queryKey: chaveDaSemana("2026-08-24", "2026-08-30"),
      queryFn: buscar,
      staleTime: INTERVALO_DE_ATUALIZACAO,
    };
    const cliente = clienteLimpo();

    await visitarTela(cliente, opcoes); // /saidas
    await visitarTela(cliente, opcoes); // a pessoa clica em "Gráficos"

    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("com staleTime 0 a mesma navegacao pedia duas vezes", async () => {
    // O comportamento antigo, aqui para o motivo do staleTime nao se perder:
    // quem voltar este numero para zero ve este teste falhar.
    const buscar = vi.fn(async () => [{ id: "1" }]);
    const opcoes = {
      queryKey: chaveDaSemana("2026-08-24", "2026-08-30"),
      queryFn: buscar,
      staleTime: 0,
    };
    const cliente = clienteLimpo();

    await visitarTela(cliente, opcoes);
    await visitarTela(cliente, opcoes);

    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("periodo diferente continua sendo uma consulta nova", async () => {
    // O cache nao pode esconder dado que a pessoa ainda nao viu: mudar a
    // semana tem que ir ao servidor.
    const buscar = vi.fn(async () => [{ id: "1" }]);
    const cliente = clienteLimpo();
    const opcoesDe = (de: string, ate: string) => ({
      queryKey: chaveDaSemana(de, ate),
      queryFn: buscar,
      staleTime: INTERVALO_DE_ATUALIZACAO,
    });

    await visitarTela(cliente, opcoesDe("2026-08-24", "2026-08-30"));
    await visitarTela(cliente, opcoesDe("2026-08-17", "2026-08-23"));

    expect(buscar).toHaveBeenCalledTimes(2);
  });
});
