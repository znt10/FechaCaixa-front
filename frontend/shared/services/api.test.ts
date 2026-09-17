import { afterEach, describe, expect, it, vi } from "vitest";

import { apiV1 } from "./api";

/**
 * O 403 quase derrubou a aplicacao inteira.
 *
 * O cliente tratava 401 e 403 como "sessao expirada": renovava o token e, se
 * falhasse, mandava para /login. Mas 403 quer dizer "autenticado, e mesmo
 * assim nao pode" — o token novo devolve o mesmo 403, o cliente vai para
 * /login, e o middleware, vendo o cookie ainda valido, devolve a pessoa para a
 * tela de origem. Os dois ficam se empurrando para sempre.
 */
const respostaComStatus = (status: number) =>
  new Response(JSON.stringify({ detail: "nao pode" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiV1 e o refresh de sessao", () => {
  it("nao tenta renovar a sessao quando o servidor responde 403", async () => {
    // Tipado com os argumentos: sem eles o vi.fn() vira uma tupla vazia e o
    // TypeScript recusa ler a URL das chamadas la embaixo.
    const fetchFalso = vi.fn(async (_url: unknown, _init?: unknown) =>
      respostaComStatus(403),
    );
    vi.stubGlobal("fetch", fetchFalso);

    await expect(apiV1("/minha-empresa/")).rejects.toThrow();

    // Uma chamada so: a do proprio endpoint. Uma segunda seria a tentativa de
    // refresh — o comeco do ciclo.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso.mock.calls.every(([url]) => !String(url).includes("refresh"))).toBe(
      true,
    );
  });

  it("deixa a mensagem do servidor chegar em quem chamou", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respostaComStatus(403)));

    await expect(apiV1("/minha-empresa/")).rejects.toThrow("nao pode");
  });

  it("ainda tenta renovar quando o servidor responde 401", async () => {
    // 401 e o caso que o refresh existe para resolver: falta credencial.
    const fetchFalso = vi.fn(async (url: unknown) =>
      String(url).includes("refresh")
        ? respostaComStatus(401)
        : respostaComStatus(401),
    );
    vi.stubGlobal("fetch", fetchFalso);

    await expect(apiV1("/minha-empresa/")).rejects.toThrow();

    const tentouRenovar = fetchFalso.mock.calls.some(([url]) =>
      String(url).includes("refresh"),
    );
    expect(tentouRenovar).toBe(true);
  });
});

describe("apiV1 e o corpo FormData", () => {
  it("nao carimba Content-Type quando o corpo e FormData", async () => {
    // O navegador precisa gerar o boundary do multipart sozinho. Carimbar
    // application/json aqui faz o Django receber um corpo que nao sabe ler, e o
    // upload volta 400 sem explicacao.
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const corpo = new FormData();
    corpo.append("arquivos", new File(["<NFe/>"], "a.xml"));

    await apiV1("/notas-fiscais/importar/", { method: "POST", body: corpo });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });
});
