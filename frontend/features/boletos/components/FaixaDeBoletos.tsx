"use client";

import Link from "next/link";

import { useBoletosDaGerencia, useResumoDosBoletos } from "../hooks/useBoletos";
import { textoDaFaixa } from "../prazo-do-boleto";

/** A parte que desenha; separada dos dados para o teste. */
export function FaixaDeBoletosVista({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <div className="mx-auto max-w-[1440px] px-[16px] pt-[16px] md:px-[40px]">
      <div className="rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[18px] py-[12px] text-caixa-alerta">
        <Link href="/boletos" className="text-[14px] font-medium leading-[1.4]">
          {texto}
        </Link>
      </div>
    </div>
  );
}

/**
 * O aviso dos boletos, em toda tela do painel: vencidos, os que vencem em até
 * 7 dias e os sem data. É o que faz o dono que mora longe da loja ver o boleto
 * que chegou lá — sem e-mail, no próprio app.
 */
export function FaixaDeBoletos() {
  const daGerencia = useBoletosDaGerencia();
  const resumo = useResumoDosBoletos({ habilitado: daGerencia });
  return <FaixaDeBoletosVista texto={daGerencia && resumo.data ? textoDaFaixa(resumo.data) : null} />;
}
