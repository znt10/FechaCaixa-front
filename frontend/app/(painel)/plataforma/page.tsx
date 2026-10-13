"use client";

import { LinhaDaPlataforma } from "@/features/mensalidade/components/LinhaDaPlataforma";
import { usePainelDaPlataforma } from "@/features/mensalidade/hooks/usePlataforma";

/**
 * Plataforma: as empresas clientes do FechaCaixa, para o dono.
 *
 * Quem aguarda confirmação vem primeiro (a API ordena), e os contadores do
 * topo dizem se há trabalho antes de rolar a lista.
 */
export default function PlataformaPage() {
  const painel = usePainelDaPlataforma();
  const contadores = painel.data?.contadores;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="flex flex-col gap-[2px] py-[28px]">
        <h1 className="text-[22px] font-bold leading-[1.2]">Empresas</h1>
        <p className="text-[14px] leading-[1.4] text-caixa-muted">
          Quem pagou, quem está atrasado, e quem pode usar o FechaCaixa.
        </p>
      </div>

      {painel.error && (
        <p className="rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px] text-[14px] font-medium text-caixa-alerta">
          {painel.error instanceof Error
            ? painel.error.message
            : "Não foi possível carregar as empresas."}
        </p>
      )}

      {painel.isPending && <p className="text-[15px] text-caixa-muted">Carregando empresas...</p>}

      {contadores && (
        <div className="mb-[20px] flex flex-wrap gap-[12px]">
          {[
            { rotulo: "aguardando confirmação", valor: contadores.aguardando },
            { rotulo: "atrasadas", valor: contadores.atrasadas },
            { rotulo: "bloqueadas", valor: contadores.bloqueadas },
          ].map((contador) => (
            <div
              key={contador.rotulo}
              className="min-w-[160px] flex-1 rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[14px]"
            >
              <p className="text-[24px] font-semibold tabular-nums">{contador.valor}</p>
              <p className="text-[13px] text-caixa-muted">{contador.rotulo}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-[12px]">
        {(painel.data?.empresas ?? []).map((empresa) => (
          <LinhaDaPlataforma key={empresa.id} empresa={empresa} />
        ))}
      </div>
    </main>
  );
}
