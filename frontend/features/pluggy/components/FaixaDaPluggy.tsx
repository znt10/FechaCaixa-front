"use client";

import Link from "next/link";

import { mostrarPlataforma } from "@/features/mensalidade/mensalidade-da-tela";
import { useUsuarioAtual } from "@/shared/hooks/useUsuarioAtual";

import { usePainelDaPluggy } from "../hooks/usePluggy";
import { textoDaFaixa } from "../situacao-da-pluggy";

/** A parte que desenha; separada dos dados para o teste. */
export function FaixaDaPluggyVista({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <div className="mx-auto max-w-[1440px] px-[16px] pt-[16px] md:px-[40px]">
      <div className="rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[18px] py-[12px] text-caixa-alerta">
        <Link href="/plataforma/pluggy" className="text-[14px] font-medium leading-[1.4]">
          {texto}
        </Link>
      </div>
    </div>
  );
}

/** Faixa do dono da plataforma: só ele pede o painel, e só aparece se alguma conexão caiu. */
export function FaixaDaPluggy() {
  const usuario = useUsuarioAtual();
  const painel = usePainelDaPluggy({ habilitado: mostrarPlataforma(usuario.data) });
  return <FaixaDaPluggyVista texto={painel.data ? textoDaFaixa(painel.data) : null} />;
}
