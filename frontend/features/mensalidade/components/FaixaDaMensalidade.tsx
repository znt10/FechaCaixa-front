"use client";

import { useState } from "react";

import { faixaDaMensalidade } from "../mensalidade-da-tela";
import type { MinhaMensalidade } from "../services/mensalidade";
import { QuadroDoPix } from "./QuadroDoPix";

const CORES = {
  aviso: "border-caixa-warn/40 bg-caixa-warn-soft text-caixa-warn",
  alerta: "border-caixa-alerta/30 bg-caixa-alerta-soft text-caixa-alerta",
  info: "border-caixa-border bg-caixa-faixa text-caixa-ink",
} as const;

/** A faixa logo abaixo da barra do topo. O Pix abre ali mesmo, sem trocar de tela. */
export function FaixaDaMensalidade({ mensalidade }: { mensalidade?: MinhaMensalidade }) {
  const [aberto, setAberto] = useState(false);
  const faixa = faixaDaMensalidade(mensalidade);
  if (!faixa || !mensalidade) return null;

  return (
    <div className="mx-auto max-w-[1440px] px-[16px] pt-[16px] md:px-[40px]">
      <div className={`flex flex-col gap-[12px] rounded-[12px] border px-[18px] py-[12px] ${CORES[faixa.tom]}`}>
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <p className="text-[14px] font-medium leading-[1.4]">{faixa.texto}</p>
          {faixa.mostraPix && (
            <button
              type="button"
              onClick={() => setAberto((estava) => !estava)}
              className="rounded-[8px] border border-current px-[12px] py-[6px] text-[13px] font-semibold"
            >
              {aberto ? "Fechar" : "Pagar com Pix"}
            </button>
          )}
        </div>
        {aberto && faixa.mostraPix && <QuadroDoPix mensalidade={mensalidade} />}
      </div>
    </div>
  );
}
