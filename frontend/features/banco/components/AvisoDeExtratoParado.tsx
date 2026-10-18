"use client";

import { avisoDeParado } from "@/features/pluggy/situacao-da-pluggy";

import { useContasBancarias } from "../hooks/useBanco";

/** Topo do extrato: avisa quando a conta ligada à Pluggy está sem atualizar há mais de 48 h. */
export function AvisoDeExtratoParado() {
  const contas = useContasBancarias();
  const aviso = contas.data ? avisoDeParado(contas.data, new Date()) : null;
  if (!aviso) return null;
  return (
    <p
      role="status"
      className="mt-[16px] rounded-[12px] border border-caixa-warn/40 bg-caixa-warn-soft px-[18px] py-[12px] text-[14px] font-medium text-caixa-warn"
    >
      {aviso}
    </p>
  );
}
