import { NextRequest, type NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import proxy from "./proxy";

/**
 * O celular da loja nao tem login. Toda rota que ele precisa alcancar tem que
 * estar liberada aqui — e o modo de falhar do middleware e traicoeiro: ele
 * responde 307 para /login, ou seja, uma resposta "ok" que nao e o que se
 * pediu. Quem chamou por fetch nao ve erro nenhum, so um resultado errado.
 */
/** O proxy so devolve Promise no ramo de refresh de token, que nenhum caso
 *  aqui exercita — todos entram sem cookie nenhum. O cast estreita a uniao
 *  para o que estes testes de fato recebem. */
const pedir = (caminho: string) =>
  proxy(
    new NextRequest(new URL(caminho, "https://caixa.exemplo.com")),
  ) as NextResponse;

describe("proxy: as rotas que o aparelho sem login precisa", () => {
  it("deixa passar a checagem de versao", () => {
    const resposta = pedir("/api/versao");

    expect(resposta?.status).toBe(200);
    expect(resposta?.headers.get("location")).toBeNull();
  });

  it("deixa passar a porta do formulario", () => {
    expect(pedir("/fechamento")?.status).toBe(200);
  });

  it("deixa passar o endereco da empresa", () => {
    expect(pedir("/primavera")?.status).toBe(200);
  });

  it("continua mandando para o login quem tenta o painel sem credencial", () => {
    const resposta = pedir("/fechamentos");

    expect(resposta?.status).toBe(307);
    expect(resposta?.headers.get("location")).toContain("/login");
  });
});

/** Com login, e com o papel gravado no cookie — como o painel chega aqui. */
const pedirComo = (papel: string, caminho: string) =>
  proxy(
    new NextRequest(new URL(caminho, "https://caixa.exemplo.com"), {
      headers: { cookie: `access_token=abc; refresh_token=def; role=${papel}` },
    }),
  ) as NextResponse;

describe("proxy: a tela de notas fiscais", () => {
  /**
   * "/notas-fiscais" tem um segmento so, igual a "/primavera". Fora da lista
   * de rotas do app ela seria tomada por apelido de empresa, e o ramo das
   * rotas publicas responde antes da checagem de papel: a casca da tela ia
   * para quem nao fez login. Quem TEM login sempre entrou — esse ramo devolve
   * next() antes de olhar ROLE_ROUTES, entao nao havia como cair no painel.
   */
  it("nao e endereco publico de empresa: sem login vai para o login", () => {
    const resposta = pedir("/notas-fiscais");

    expect(resposta?.status).toBe(307);
    expect(resposta?.headers.get("location")).toContain("/login");
  });

  it.each(["Gerente", "Admin", "Funcionario"])(
    "deixa %s entrar — quem barra por conta sem o modulo e o backend",
    (papel) => {
      const resposta = pedirComo(papel, "/notas-fiscais");

      expect(resposta?.status).toBe(200);
      expect(resposta?.headers.get("location")).toBeNull();
    },
  );
});

/**
 * A matriz de papeis: quem entra em que.
 *
 * Este arquivo decide o roteamento de um sistema em producao com mais de uma
 * empresa dentro, e a lista de rotas de cada papel e uma constante compartida
 * — trocar a de um pela do outro nao quebra nada que se veja rodando. Ja
 * aconteceu de o funcionario ganhar a tela da empresa (codigo de acesso,
 * lojas, quem tem login) sem um teste sequer reclamar. A matriz existe para
 * que isso pare de ser silencioso.
 */
const PAINEL_DE_CAIXA = [
  "/fechamentos",
  "/por-loja",
  "/saidas",
  "/graficos",
  "/notas-fiscais",
];

const TELA_DA_EMPRESA = "/empresa";

describe("proxy: o que cada papel alcanca", () => {
  describe.each(["Gerente", "Admin", "Funcionario"])(
    "%s entra no painel de caixa inteiro",
    (papel) => {
      it.each(PAINEL_DE_CAIXA)("%s", (rota) => {
        const resposta = pedirComo(papel, rota);

        expect(resposta?.status).toBe(200);
        expect(resposta?.headers.get("location")).toBeNull();
      });
    },
  );

  it("so o gerente abre a tela da empresa", () => {
    const resposta = pedirComo("Gerente", TELA_DA_EMPRESA);

    expect(resposta?.status).toBe(200);
    expect(resposta?.headers.get("location")).toBeNull();
  });

  // Escalada de privilegio se isto deixar de valer: a tela da empresa troca o
  // codigo de acesso da padaria, cadastra loja e cria login.
  it.each(["Funcionario", "Admin"])(
    "%s nao abre a tela da empresa: volta para o painel",
    (papel) => {
      const resposta = pedirComo(papel, TELA_DA_EMPRESA);

      expect(resposta?.status).toBe(307);
      expect(resposta?.headers.get("location")).toContain("/fechamentos");
    },
  );

  it.each([...PAINEL_DE_CAIXA, TELA_DA_EMPRESA])(
    "sem login nenhum, %s manda para o login",
    (rota) => {
      const resposta = pedir(rota);

      expect(resposta?.status).toBe(307);
      expect(resposta?.headers.get("location")).toContain("/login");
    },
  );

  // Cookie com papel que o sistema nao conhece (renomeacao de grupo no
  // backend, cookie velho de uma versao anterior): a sessao cai, em vez de a
  // pessoa entrar em algum lugar por engano.
  it("papel desconhecido derruba a sessao", () => {
    const resposta = pedirComo("Estagiario", "/fechamentos");

    expect(resposta?.status).toBe(307);
    expect(resposta?.headers.get("location")).toContain("/login");
  });
});
