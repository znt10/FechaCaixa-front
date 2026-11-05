import React from "react";

import { emReais } from "@/features/fechamento/painel-dados";
import { marcasDoEixo, type Fatia } from "@/features/fechamento/graficos-dados";

/** Rotulo curto do eixo: "R$ 12 mil" cabe na margem; "R$ 12.000,00" nao. */
const rotuloDoEixo = (valor: number) =>
  `R$ ${valor.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })}`;

/**
 * As mesmas quatro formas da rosca, lado a lado: a rosca mostra a parte de
 * cada uma no todo; as colunas deixam comparar uma com a outra em reais.
 * Todas as quatro aparecem, mesmo zeradas — o eixo fica igual de um periodo
 * para outro e a coluna vazia diz "nada entrou por aqui".
 */
export function GraficoDeColunas({ fatias }: { fatias: Fatia[] }) {
  const marcas = marcasDoEixo(Math.max(...fatias.map((f) => f.valor), 0));
  const topo = marcas.at(-1) || 1;

  return (
    <figure
      className="m-0 w-full min-w-0 flex-1 md:min-w-[360px]"
      role="img"
      aria-label={`Formas de pagamento: ${fatias
        .map((f) => `${f.rotulo} R$ ${emReais(f.valor)}`)
        .join(", ")}`}
    >
      <div className="flex">
        {/* Eixo: os rotulos ficam a esquerda, cada um na altura da sua linha. */}
        <div className="relative h-[220px] w-[64px] shrink-0">
          {marcas.map((marca) => (
            <span
              key={marca}
              className="absolute right-[8px] translate-y-1/2 text-[11px] text-caixa-muted tabular-nums"
              style={{ bottom: `${(marca / topo) * 100}%` }}
            >
              {rotuloDoEixo(marca)}
            </span>
          ))}
        </div>

        <div className="relative h-[220px] flex-1">
          {marcas.map((marca) => (
            <div
              key={marca}
              aria-hidden="true"
              className={`absolute inset-x-0 border-t ${
                marca === 0 ? "border-caixa-ink/40" : "border-caixa-border/70"
              }`}
              style={{ bottom: `${(marca / topo) * 100}%` }}
            />
          ))}

          <div className="relative flex h-full items-end gap-[8px] px-[4px]">
            {fatias.map((fatia) => (
              <div
                key={fatia.campo}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <span className="mb-[4px] whitespace-nowrap text-[11px] font-medium tabular-nums">
                  {fatia.valor > 0 ? `${fatia.percentual.toFixed(0)}%` : ""}
                </span>
                <div
                  className="w-full max-w-[64px] shrink-0 rounded-t-[4px]"
                  style={{
                    height: `${(fatia.valor / topo) * 100}%`,
                    backgroundColor: fatia.cor,
                  }}
                  title={`${fatia.rotulo}: R$ ${emReais(fatia.valor)}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ml-[64px] mt-[8px] flex gap-[8px] px-[4px]">
        {fatias.map((fatia) => (
          <span
            key={fatia.campo}
            className="min-w-0 flex-1 text-center text-[12px] leading-[1.25] text-caixa-muted"
          >
            {fatia.rotulo}
          </span>
        ))}
      </div>
    </figure>
  );
}
