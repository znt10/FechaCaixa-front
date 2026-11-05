"use client";

import { useState } from "react";

import { CartaoDaEmpresa } from "@/features/acessos/components/CartaoDaEmpresa";
import { NovaEmpresa } from "@/features/acessos/components/NovaEmpresa";
import { useAcessos } from "@/features/acessos/hooks/useAcessos";

/**
 * Acessos: o que antes só se fazia pelo admin do Django. Criar a empresa com
 * o primeiro gerente, ligar o que ela contratou e dar acesso a mais gerentes.
 * Só o dono da plataforma (a API responde 403 aos outros).
 */
export default function AcessosPage() {
  const acessos = useAcessos();
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-[16px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px] pt-[28px]">
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[22px] font-bold leading-[1.2]">Acessos</h1>
          <p className="text-[14px] leading-[1.4] text-caixa-muted">
            Empresas, módulos contratados e gerentes.
          </p>
        </div>
      </div>

      <NovaEmpresa onAviso={setAviso} />
      {aviso && <p className="text-[14px] font-medium text-caixa-accent">{aviso}</p>}

      {acessos.error && (
        <p className="rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px] text-[14px] font-medium text-caixa-alerta">
          {acessos.error instanceof Error ? acessos.error.message : "Não foi possível carregar as empresas."}
        </p>
      )}
      {acessos.isPending && <p className="text-[15px] text-caixa-muted">Carregando empresas...</p>}

      {(acessos.data ?? []).map((empresa) => (
        <CartaoDaEmpresa key={empresa.id} empresa={empresa} />
      ))}
    </main>
  );
}
