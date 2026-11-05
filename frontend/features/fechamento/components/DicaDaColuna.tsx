import React from "react";

import { emReais } from "@/features/fechamento/painel-dados";

export type LinhaDaDica = { rotulo: string; valor: number; cor?: string };

/**
 * A caixinha que aparece em cima da coluna apontada (ou tocada, no celular).
 * O `title` nativo demorava um segundo para abrir e nao existe no toque.
 *
 * `lado` evita que a dica das colunas das pontas saia para fora do cartao:
 * nas da esquerda ela cresce para a direita, e vice-versa.
 */
export function DicaDaColuna({
  titulo,
  linhas,
  alturaDaColuna,
  lado,
}: {
  titulo: string;
  linhas: LinhaDaDica[];
  /** Em %, para a dica nascer logo acima do topo da coluna. */
  alturaDaColuna: number;
  lado: "esquerda" | "centro" | "direita";
}) {
  const posicao =
    lado === "esquerda"
      ? "left-0"
      : lado === "direita"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-10 min-w-[150px] whitespace-nowrap rounded-[8px] border border-caixa-border bg-caixa-surface px-[12px] py-[8px] text-[12px] shadow-lg ${posicao}`}
      style={{ bottom: `calc(${Math.min(alturaDaColuna, 100)}% + 10px)` }}
    >
      <p className="mb-[4px] font-semibold text-caixa-ink">{titulo}</p>
      {linhas.map((linha) => (
        <p key={linha.rotulo} className="flex items-center gap-[8px] py-[1px]">
          {linha.cor && (
            <span
              aria-hidden="true"
              className="h-[8px] w-[8px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: linha.cor }}
            />
          )}
          <span className="flex-1 text-caixa-muted">{linha.rotulo}</span>
          <span className="font-medium tabular-nums">R$ {emReais(linha.valor)}</span>
        </p>
      ))}
    </div>
  );
}

/** Em que lado a dica abre, pela posicao da coluna entre as `total`. */
export const ladoDaDica = (
  indice: number,
  total: number,
): "esquerda" | "centro" | "direita" =>
  total < 3
    ? "centro"
    : indice < total / 3
      ? "esquerda"
      : indice >= (2 * total) / 3
        ? "direita"
        : "centro";
