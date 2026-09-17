import { NextResponse } from "next/server";

import { VERSAO_DO_APP } from "@/shared/config/versao";

/**
 * Qual build esta no ar agora. O aparelho compara com o dele.
 *
 * Mora em /api/ e nao em /versao para nao roubar um apelido de empresa: o
 * formulario abre em /<empresa> (/primavera), e uma rota estatica de primeiro
 * nivel ganha da dinamica — a empresa que se chamasse "versao" simplesmente
 * nao abriria. /api/ nao colide com nada; a API do Django e /backend/.
 *
 * `force-dynamic` e o no-store: sem eles o Next serve isto do cache de build,
 * e a resposta continuaria dizendo a versao antiga depois do deploy — que e
 * exatamente o que esta rota existe para desmentir.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { versao: VERSAO_DO_APP },
    { headers: { "Cache-Control": "no-store" } },
  );
}
