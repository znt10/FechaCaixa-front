import { NextRequest, NextResponse } from "next/server";

import { URL_DA_API } from "@/shared/config/api";

// /fechamento e publico de proposito: o funcionario da loja lanca o caixa
// sem login (trade-off aceito no piloto).
//
// /api/versao entra pelo mesmo motivo: quem mais precisa saber que saiu versao
// nova e o celular da loja, que nao tem login. Protegida, ela responderia um
// redirect para /login, o aviso nunca apareceria — e nao apareceria calado.
// Ela devolve o identificador do build e mais nada.
const PUBLIC_ROUTES = [
  "/login",
  "/esqueci-senha",
  "/fechamento",
  "/api/versao",
];

// O que /notas-fiscais faz nas tres listas: o modulo e vendido por conta, nao
// por cargo, e quem barra a conta sem ele e o backend — recusar aqui por papel
// inventaria uma regra de permissao que so existe no front, e ela iria
// divergir da do servidor na primeira mudanca. O que a topbar faz e outra
// coisa: ela esconde a aba de quem nao tem o modulo, para nao oferecer um
// caminho que termina em recusa.
const PAINEL_DE_CAIXA = [
  "/fechamentos",
  "/por-loja",
  "/saidas",
  "/graficos",
  "/notas-fiscais",
];

// ATENCAO ao tirar uma rota daqui: esta tabela tambem alimenta a lista de
// rotas conhecidas do app (ver ROTAS_DO_APP abaixo). Uma rota removida de
// todos os papeis deixa de ser conhecida e cai no ramo de "apelido de
// empresa", que e PUBLICO — ou seja, ela nao some do app, ela fica ABERTA.
// Foi exatamente assim que /notas-fiscais nasceu servindo a tela a quem nao
// tinha login.
const ROLE_ROUTES: Record<string, string[]> = {
  // O painel de caixa e as mesmas telas para todo mundo que entra com login.
  // O que separa os papeis e o que existe ALEM delas.
  Admin: PAINEL_DE_CAIXA,
  // So o gerente tem /empresa: codigo de acesso, lojas, quem retira dinheiro
  // e quem tem login.
  Gerente: ["/empresa", ...PAINEL_DE_CAIXA],
  // O funcionario confere e corrige o caixa, e nao administra a empresa.
  Funcionario: PAINEL_DE_CAIXA,
};

// Para onde cada papel vai ao entrar (e ao abrir "/"). Espelha
// getHomeByGroup em app/login/page.tsx.
const ROLE_HOME: Record<string, string> = {
  // Todos caem no painel: e a tela pela qual se entra no sistema. A tela da
  // empresa fica a um clique no menu — visita-se raramente.
  Admin: "/fechamentos",
  Gerente: "/fechamentos",
  Funcionario: "/fechamentos",
};

const normalizeRole = (role?: string) => {
  if (!role) {
    return undefined;
  }

  const normalized = role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["admin", "administrador"].includes(normalized)) {
    return "Admin";
  }

  if (normalized === "gerente") {
    return "Gerente";
  }

  if (normalized === "funcionario") {
    return "Funcionario";
  }

  return undefined;
};

// Toda rota que o app tem. Serve para o middleware saber o que NAO e apelido
// de empresa: /primavera e /aurorasalgados sao enderecos de formulario, e o
// middleware roda na borda, sem banco para consultar — entao ele decide por
// exclusao.
//
// Trade-off assumido: rota nova do app que esquecerem de listar aqui passa a
// ser tratada como apelido de empresa e deixa de exigir login no middleware. O
// que ela mostraria e a casca da tela: desde que o formulario deixou de ser
// publico, todo dado vem da API, que exige credencial propria. E incomodo, nao
// vazamento.
const ROTAS_DO_APP = new Set<string>(
  [
    ...PUBLIC_ROUTES,
    ...Object.values(ROLE_ROUTES).flat(),
    "/redefinir-senha",
    "/confirmar-conta",
    // Reservado: a tela do Admin ainda vai ser definida. Fica na lista para
    // que /admin nunca seja confundido com o apelido de uma empresa.
    "/admin",
  ].map((rota) => rota.split("/")[1]),
);

/** /primavera, /aurorasalgados — um segmento so, que nao e rota do app. */
const pareceApelidoDeEmpresa = (pathname: string) => {
  const segmentos = pathname.split("/").filter(Boolean);
  return segmentos.length === 1 && !ROTAS_DO_APP.has(segmentos[0]);
};

export default function proxy(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const role = normalizeRole(request.cookies.get("role")?.value);
  const { pathname } = request.nextUrl;

  // Com skipTrailingSlashRedirect no next.config, a normalizacao da barra
  // final das rotas de pagina passa a ser responsabilidade do middleware
  // (as rotas /backend/* ficam fora do matcher e mantem a barra).
  if (pathname !== "/" && pathname.endsWith("/")) {
    // URL padrao, nao request.nextUrl.clone(): o NextURL re-aplica a barra
    // final original ao serializar, o que geraria um loop de redirect.
    const url = new URL(
      pathname.slice(0, -1) + request.nextUrl.search,
      request.url,
    );
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/" && token && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  if (pathname === "/login" && token && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  if (
    PUBLIC_ROUTES.includes(pathname) ||
    // O endereco publico de cada empresa: /primavera. Quem entra ali sem o
    // cookie do aparelho ve a tela do codigo, nao o formulario.
    pareceApelidoDeEmpresa(pathname) ||
    // /fechamento/<empresa> — o link antigo, que hoje so redireciona.
    pathname.startsWith("/fechamento/") ||
    pathname.startsWith("/redefinir-senha/") ||
    pathname.startsWith("/confirmar-conta/")
  ) {
    return NextResponse.next();
  }

  if (!token) {
    if (refreshToken) {
      return refreshAccessToken(request);
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!role) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("role");
    return response;
  }

  const allowedRoutes = ROLE_ROUTES[role];
  const isAllowed = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!isAllowed) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  return NextResponse.next();
}

async function refreshAccessToken(request: NextRequest) {
  const apiUrl = URL_DA_API;

  if (!apiUrl) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const refreshResponse = await fetch(`${apiUrl}/token/refresh/`, {
    method: "POST",
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
    },
  });

  if (!refreshResponse.ok) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("role");
    return response;
  }

  // O novo access_token vem apenas como Set-Cookie HTTP-only do backend;
  // repassa os cabecalhos ao navegador em vez de ler token do corpo.
  const response = NextResponse.redirect(request.nextUrl);

  for (const cookie of refreshResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

export const config = {
  // "backend" fica fora do matcher: as chamadas de API same-origin passam
  // direto para o rewrite do next.config sem sofrer redirect de navegacao.
  //
  // Os arquivos do PWA tambem: sem eles na lista, /icones/*.png era tratado
  // como rota protegida e respondia 307 para /login — o navegador nao
  // conseguia baixar o icone, e sem icone nao ha instalacao. /sw.js e o
  // manifest passavam, mas por acidente: tem um segmento so, entao caiam no
  // ramo de "apelido de empresa", que e publico. Explicito para nao depender
  // disso.
  matcher: [
    "/((?!backend|_next/static|_next/image|icones/|sw\\.js|manifest\\.webmanifest|apple-touch-icon\\.png|favicon\\.ico|favicon\\.svg|icon\\.svg).*)",
  ],
};
