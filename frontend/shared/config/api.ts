/**
 * Onde o servidor do Next encontra o Django.
 *
 * Vive num arquivo so porque e lido em dois lugares que resolvem a mesma
 * pergunta: o rewrite de /backend/* (next.config.ts) e a renovacao de token do
 * middleware (proxy.ts). Quando o padrao morava nos dois, um deles ficou sem —
 * e rodar o Next fora do Docker mandava a pessoa para /login em toda renovacao.
 *
 * O navegador nunca ve isto. No cliente o endereco da API e sempre "/backend",
 * do proprio dominio, e e assim que os cookies HTTP-only do Django sao
 * first-party.
 */
export const URL_DA_API = process.env.API_PROXY_URL || "http://localhost:8000";
