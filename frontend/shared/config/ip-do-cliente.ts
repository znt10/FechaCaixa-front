/**
 * O IP do visitante, para o limite por IP do Django.
 *
 * O rewrite de /backend/* chama a URL publica da API, entao do lado do Django
 * todo pedido chega vindo deste servidor — o mesmo IP para o site inteiro. O
 * IP de verdade vai em x-cliente-ip, com o PROXY_SEGREDO em x-proxy-segredo, e
 * o Django so acredita nele com o segredo certo (app.middleware.
 * IpDoProxyMiddleware). Ver docs/limite-por-ip.md no backend.
 *
 * PROXY_SEGREDO sem NEXT_PUBLIC_ de proposito: prefixado, iria para o bundle
 * do navegador. Vazio (dev) = nenhum cabecalho, e o Django conta pelo IP da
 * conexao.
 */

export const CABECALHO_IP = "x-cliente-ip";
export const CABECALHO_SEGREDO = "x-proxy-segredo";

/**
 * O ULTIMO de x-forwarded-for, e nao o primeiro. Cada proxy ACRESCENTA ao fim
 * da lista, entao o comeco e o que o cliente quiser escrever: com o primeiro,
 * bastava mandar um x-forwarded-for novo a cada pedido para nunca bater no
 * limite. Em producao ha exatamente um proxy antes do Next (o Traefik do
 * Coolify). Se um dia entrar outro na frente (Cloudflare, por exemplo), isto
 * muda junto.
 */
export function ipDoCliente(headers: Headers): string | undefined {
  const ultimo = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return ultimo || undefined;
}

/**
 * Os cabecalhos que acompanham um pedido deste servidor ao Django. Vazio sem
 * segredo ou sem IP.
 */
export function cabecalhosDoVisitante(
  headers: Headers,
): Record<string, string> {
  const segredo = process.env.PROXY_SEGREDO;
  const ip = ipDoCliente(headers);
  if (!segredo || !ip) {
    return {};
  }
  return { [CABECALHO_IP]: ip, [CABECALHO_SEGREDO]: segredo };
}
