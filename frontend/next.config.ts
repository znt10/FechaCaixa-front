import type { NextConfig } from "next";

import { URL_DA_API } from "./shared/config/api";

// Toda chamada a API passa pelo proprio dominio do front (/backend/...),
// que o Next reescreve para o Django. Assim os cookies HTTP-only do backend
// viram cookies first-party e o navegador os envia sem precisar de tokens
// acessiveis ao JavaScript.
// Sem prefixo NEXT_PUBLIC_ de proposito: ele fazia o Next embutir a URL
// interna da API no bundle que vai para o celular da loja, e sugeria que o
// navegador precisava dela — nao precisa.
const API_URL = URL_DA_API;

// Bind mount do Windows pro container nao propaga eventos inotify, entao o
// Turbopack nunca ve os arquivos mudarem. So no Docker (onde a variavel e
// definida) trocamos por polling; rodando direto no host fica no padrao.
const WATCH_POLL_MS = Number(process.env.NEXT_WATCH_POLL_MS) || 0;

// A identidade deste build, que o aparelho usa para perceber que ficou para
// tras (ver shared/config/versao.ts). O `env` do Next substitui o valor no
// codigo durante o `npm run build`, entao o que vai para o bundle do celular e
// para /api/versao e o MESMO literal — este arquivo ser reavaliado quando o
// `next start` sobe nao muda o que ja foi compilado.
//
// O commit vem primeiro por ser legivel num log; o Railway so o entrega ao
// build se o Dockerfile pedir (ARG). Sem ele, a hora do build ja resolve: o
// que importa e mudar a cada deploy.
const VERSAO_DO_BUILD =
  process.env.NODE_ENV === "production"
    ? process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || String(Date.now())
    : "dev";

// Celular da loja abrindo o formulario pelo IP da maquina: em dev o Next
// bloqueia requisicoes de asset vindas de outra origem se ela nao estiver
// listada aqui. Vazio = so localhost (o padrao, para quem roda sozinho).
const ORIGENS_DEV = (process.env.NEXT_DEV_ORIGINS || "")
  .split(",")
  .map((origem) => origem.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_VERSAO_DO_APP: VERSAO_DO_BUILD },
  ...(ORIGENS_DEV.length > 0 ? { allowedDevOrigins: ORIGENS_DEV } : {}),
  ...(WATCH_POLL_MS > 0
    ? { watchOptions: { pollIntervalMs: WATCH_POLL_MS } }
    : {}),
  // Sem isso o Next redireciona /backend/login/ -> /backend/login (308)
  // antes do rewrite, e o Django (APPEND_SLASH) rejeita POST sem barra
  // final. O proxy.ts passa a normalizar a barra das rotas de pagina.
  skipTrailingSlashRedirect: true,
  // Sem isto tudo o que vem de /public sai com "max-age=0, must-revalidate", e
  // o navegador revalida a cada navegacao. Nas telas do painel isso aparecia
  // como um par manifest.webmanifest + icone-192.png se repetindo a cada
  // clique no menu: o Next reemite a tag <link rel="manifest"> ao navegar, o
  // Chrome vai reler o manifest, e ao reler o manifest vai atras do icone.
  // Respondia 304, mas 304 tambem e ida e volta.
  async headers() {
    return [
      {
        // Uma semana. Os icones do app nao mudam sozinhos, e trocar um deles
        // de verdade pede nome de arquivo novo — o celular guarda o icone de
        // quando a pessoa instalou, entao sobrescrever o arquivo ja nao era o
        // caminho.
        source: "/icones/:arquivo*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
      {
        // Uma hora: o manifest e pequeno, mas muda mais do que um icone (nome
        // do app, cor da barra), e nao vale segurar por uma semana.
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Barra final forcada no destino: todas as rotas do Django
        // terminam em "/" (APPEND_SLASH cobre os GETs sem barra).
        source: "/backend/:path*",
        destination: `${API_URL}/:path*/`,
      },
    ];
  },
};

export default nextConfig;
