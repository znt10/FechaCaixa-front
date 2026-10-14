"use client";

import { useState } from "react";

import { LinhaDaPlataforma } from "@/features/mensalidade/components/LinhaDaPlataforma";
import { usePainelDaPlataforma } from "@/features/mensalidade/hooks/usePlataforma";
import {
  CRITERIOS,
  naOrdem,
  ordenarEmpresas,
  type CriterioDeOrdem,
} from "@/features/mensalidade/ordem-da-plataforma";

/**
 * Plataforma: as empresas clientes do FechaCaixa, para o dono.
 *
 * Os contadores do topo dizem se há trabalho antes de rolar a lista. A lista
 * abre por nome e fica parada: marcar "Isenta" ou confirmar um pagamento não
 * tira a empresa do lugar. Ela só se reordena quando o dono escolhe um
 * critério no topo.
 */
export default function PlataformaPage() {
  const painel = usePainelDaPlataforma();
  const contadores = painel.data?.contadores;
  const empresas = painel.data?.empresas ?? [];

  const [criterio, setCriterio] = useState<CriterioDeOrdem>("NOME");
  // Nula ate o dono escolher um criterio: ate la vale o nome, que nao muda
  // com nada que se faz nesta tela.
  const [ordem, setOrdem] = useState<string[] | null>(null);
  const lista = naOrdem(empresas, ordem ?? ordenarEmpresas(empresas, "NOME"));

  const ordenar = (novo: CriterioDeOrdem) => {
    setCriterio(novo);
    setOrdem(ordenarEmpresas(empresas, novo));
  };

  const atualizadoAs = painel.dataUpdatedAt
    ? new Date(painel.dataUpdatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px] py-[28px]">
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[22px] font-bold leading-[1.2]">Empresas</h1>
          <p className="text-[14px] leading-[1.4] text-caixa-muted">
            Quem pagou, quem está atrasado, e quem pode usar o FechaCaixa.
          </p>
        </div>

        {/* A lista se relê sozinha a cada 10 minutos e ao voltar para a aba;
            o botão é para quando a empresa acabou de avisar que pagou. */}
        <div className="flex items-center gap-[12px]">
          {atualizadoAs && (
            <span className="text-[13px] text-caixa-muted">
              Atualizado às {atualizadoAs}
            </span>
          )}
          <button
            type="button"
            onClick={() => painel.refetch()}
            disabled={painel.isFetching}
            className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[9px] text-[14px] font-semibold text-caixa-ink transition hover:border-caixa-accent/40 disabled:opacity-60"
          >
            {painel.isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
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

      {empresas.length > 1 && (
        <div className="mb-[14px] flex flex-wrap items-center gap-[10px]">
          <span className="text-[13px] font-medium text-caixa-muted">Ordenar por</span>
          <div className="flex gap-[4px] rounded-[10px] bg-caixa-faixa p-[3px]">
            {CRITERIOS.map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={criterio === valor}
                onClick={() => ordenar(valor)}
                className={`rounded-[8px] px-[14px] py-[6px] text-[14px] font-medium transition ${
                  criterio === valor
                    ? "bg-caixa-surface text-caixa-accent shadow-sm"
                    : "text-caixa-muted hover:text-caixa-ink"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-[12px]">
        {lista.map((empresa) => (
          <LinhaDaPlataforma key={empresa.id} empresa={empresa} />
        ))}
      </div>
    </main>
  );
}
