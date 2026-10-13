"use client";

import { useRef } from "react";

import { useEnviarComprovante } from "../hooks/useComprovantes";
import type { Comprovante } from "../services/comprovantes";

/** Escolher o arquivo ou tirar a foto. Lido na hora; o detalhe abre preenchido
 *  para conferir (e escolher a loja: o papel da lotérica não diz). */
export function EnviarComprovante({ onLido }: { onLido: (comprovante: Comprovante) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = useEnviarComprovante();

  const escolher = async (arquivo?: File) => {
    if (!arquivo) return;
    const comprovante = await enviar.mutateAsync({ arquivo });
    onLido(comprovante);
    if (entrada.current) entrada.current.value = "";
  };

  return (
    <div className="flex flex-col gap-[6px]">
      <input
        ref={entrada}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(evento) => escolher(evento.target.files?.[0])}
      />
      <button
        type="button"
        disabled={enviar.isPending}
        onClick={() => entrada.current?.click()}
        className="w-fit rounded-[10px] bg-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {enviar.isPending ? "Lendo o comprovante…" : "Enviar comprovante"}
      </button>
      {enviar.error && (
        <p className="text-[13px] text-red-700">{(enviar.error as Error).message}</p>
      )}
    </div>
  );
}
