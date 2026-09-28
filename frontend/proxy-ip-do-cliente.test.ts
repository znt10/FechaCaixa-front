import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, type NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import proxy, { config } from "./proxy";

/**
 * O proxy repassa ao Django o IP de quem esta no navegador. Sem isto, todo
 * pedido chega ao Django com o IP deste servidor, e o limite por IP juntaria
 * o site inteiro num contador so. Ver shared/config/ip-do-cliente.ts.
 */

const SEGREDO = "segredo-do-proxy-so-de-teste";

/** O que o Next repassa ao destino do rewrite: `NextResponse.next({ request })`
 *  vira `x-middleware-request-<nome>` na resposta do proxy. */
const repassado = (resposta: Response, nome: string) =>
  resposta.headers.get(`x-middleware-request-${nome}`);

const pedir = (caminho: string, cabecalhos: Record<string, string> = {}) =>
  proxy(
    new NextRequest(new URL(caminho, "https://caixa.exemplo.com"), {
      method: "POST",
      headers: cabecalhos,
    }),
  ) as NextResponse;

beforeEach(() => vi.stubEnv("PROXY_SEGREDO", SEGREDO));
afterEach(() => vi.unstubAllEnvs());

describe("proxy: o IP do visitante nos pedidos a API", () => {
  it("repassa o IP e o segredo", () => {
    const resposta = pedir("/backend/login/", {
      "x-forwarded-for": "200.1.1.1",
    });

    expect(resposta.status).toBe(200);
    expect(repassado(resposta, "x-cliente-ip")).toBe("200.1.1.1");
    expect(repassado(resposta, "x-proxy-segredo")).toBe(SEGREDO);
  });

  it("repassa o ULTIMO IP de x-forwarded-for, nao o que o cliente escreveu", () => {
    // O cliente manda 6.6.6.6; o Traefik acrescenta o IP que viu de verdade.
    const resposta = pedir("/backend/login/", {
      "x-forwarded-for": "6.6.6.6, 200.1.1.1",
    });

    expect(repassado(resposta, "x-cliente-ip")).toBe("200.1.1.1");
  });

  it("apaga os cabecalhos que vieram de fora", () => {
    vi.stubEnv("PROXY_SEGREDO", "");

    const resposta = pedir("/backend/login/", {
      "x-forwarded-for": "200.1.1.1",
      "x-cliente-ip": "6.6.6.6",
      "x-proxy-segredo": "chute",
    });

    expect(repassado(resposta, "x-cliente-ip")).toBeNull();
    expect(repassado(resposta, "x-proxy-segredo")).toBeNull();
  });

  it("nao redireciona nem pede login na API", () => {
    // A barra final e o login sao regras das paginas; a API e do Django.
    const resposta = pedir("/backend/api/v1/fechamentos/");

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("location")).toBeNull();
  });
});

describe("proxy: a renovacao do token", () => {
  it("chama o Django com o IP do visitante", async () => {
    const chamadas: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        chamadas.push(init);
        return new Response(null, { status: 401 });
      }),
    );

    await proxy(
      new NextRequest(new URL("/fechamentos", "https://caixa.exemplo.com"), {
        headers: {
          cookie: "refresh_token=def",
          "x-forwarded-for": "200.1.1.1",
        },
      }),
    );
    vi.unstubAllGlobals();

    const cabecalhos = chamadas[0].headers as Record<string, string>;
    expect(cabecalhos["x-cliente-ip"]).toBe("200.1.1.1");
    expect(cabecalhos["x-proxy-segredo"]).toBe(SEGREDO);
  });
});

describe("proxy: onde ele roda", () => {
  const roda = (caminho: string) =>
    unstable_doesMiddlewareMatch({
      config,
      url: `https://caixa.exemplo.com${caminho}`,
    });

  it("roda nos pedidos a API", () => {
    expect(roda("/backend/login/")).toBe(true);
    expect(roda("/backend/token/refresh/")).toBe(true);
    expect(roda("/backend/api/v1/formulario/acesso/")).toBe(true);
  });

  it("continua nas paginas", () => {
    expect(roda("/fechamentos")).toBe(true);
    expect(roda("/login")).toBe(true);
  });
});
