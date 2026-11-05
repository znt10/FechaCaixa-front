"use client";

import React, { useState } from "react";

import { emReais } from "@/features/fechamento/painel-dados";
import { marcasDoEixo, type ColunaDoDia } from "@/features/fechamento/graficos-dados";
import { DicaDaColuna, ladoDaDica } from "./DicaDaColuna";

const ALTURA = "h-[240px]";

/** "R$ 12 mil" cabe na margem do eixo; "R$ 12.000,00" nao. */
const compacto = (valor: number) =>
  valor.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

const diaDaSemana = (dataISO: string) => {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(ano, mes - 1, dia)
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "");
};

const diaDoMes = (dataISO: string) => String(Number(dataISO.slice(8, 10)));

/**
 * Quanto entrou em cada dia do periodo, empilhado pelas mesmas formas e cores
 * da rosca — a legenda ao lado serve para os dois graficos.
 *
 * Na semana cabem o dia da semana e o total em cima da coluna; no mes sao ate
 * 31 colunas, e ali fica so o numero do dia — o valor aparece na dica, ao
 * passar o mouse ou tocar na coluna.
 */
export function GraficoPorDia({
  colunas,
  modo,
}: {
  colunas: ColunaDoDia[];
  modo: "SEMANA" | "MES";
}) {
  const marcas = marcasDoEixo(Math.max(...colunas.map((c) => c.total), 0));
  const topo = marcas.at(-1) || 1;
  const semana = modo === "SEMANA";
  // Apontada pelo mouse ou tocada no celular (onde nao existe hover).
  const [ativa, setAtiva] = useState<string | null>(null);

  return (
    <figure
      className="m-0 w-full min-w-0 flex-1 md:min-w-[420px]"
      role="img"
      aria-label={`Recebido por dia: ${colunas
        .map((c) => `${c.dia.slice(8, 10)}/${c.dia.slice(5, 7)} R$ ${emReais(c.total)}`)
        .join(", ")}`}
    >
      <div className="flex">
        <div className={`relative ${ALTURA} w-[56px] shrink-0`}>
          {marcas.map((marca) => (
            <span
              key={marca}
              className="absolute right-[8px] translate-y-1/2 text-[11px] text-caixa-muted tabular-nums"
              style={{ bottom: `${(marca / topo) * 100}%` }}
            >
              R$ {compacto(marca)}
            </span>
          ))}
        </div>

        <div className={`relative ${ALTURA} flex-1`}>
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

          <div
            className={`relative flex h-full items-end px-[2px] ${
              semana ? "gap-[10px]" : "gap-[2px] md:gap-[4px]"
            }`}
          >
            {colunas.map((coluna, indice) => (
              <div
                key={coluna.dia}
                className={`relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end transition-opacity ${
                  ativa && ativa !== coluna.dia ? "opacity-50" : ""
                }`}
                onMouseEnter={() => setAtiva(coluna.dia)}
                onMouseLeave={() => setAtiva(null)}
                onClick={() =>
                  setAtiva((antes) => (antes === coluna.dia ? null : coluna.dia))
                }
              >
                {ativa === coluna.dia && (
                  <DicaDaColuna
                    titulo={`${diaDaSemana(coluna.dia)}, ${coluna.dia.slice(8, 10)}/${coluna.dia.slice(5, 7)}${
                      coluna.total > 0 ? "" : " · sem lançamento"
                    }`}
                    linhas={
                      coluna.total > 0
                        ? [
                            ...coluna.fatias
                              .filter((f) => f.valor > 0)
                              .map((f) => ({ rotulo: f.rotulo, valor: f.valor, cor: f.cor })),
                            { rotulo: "Total", valor: coluna.total },
                          ]
                        : []
                    }
                    alturaDaColuna={(coluna.total / topo) * 100}
                    lado={ladoDaDica(indice, colunas.length)}
                  />
                )}
                {semana && coluna.total > 0 && (
                  <span className="mb-[4px] whitespace-nowrap text-[11px] font-medium tabular-nums">
                    {compacto(coluna.total)}
                  </span>
                )}
                {/* Pilha de baixo para cima na ordem da legenda: dinheiro
                    sempre na base. */}
                <div
                  className={`flex w-full shrink-0 flex-col-reverse overflow-hidden rounded-t-[3px] ${
                    semana ? "max-w-[56px]" : ""
                  }`}
                  style={{ height: `${(coluna.total / topo) * 100}%` }}
                >
                  {coluna.fatias
                    .filter((f) => f.valor > 0)
                    .map((fatia) => (
                      <div
                        key={fatia.campo}
                        className="w-full"
                        style={{
                          height: `${(fatia.valor / coluna.total) * 100}%`,
                          backgroundColor: fatia.cor,
                        }}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`ml-[56px] mt-[6px] flex px-[2px] ${
          semana ? "gap-[10px]" : "gap-[2px] md:gap-[4px]"
        }`}
      >
        {colunas.map((coluna) => (
          <span
            key={coluna.dia}
            className="min-w-0 flex-1 text-center text-[11px] leading-[1.2] text-caixa-muted tabular-nums"
          >
            {semana ? (
              <>
                <span className="block capitalize">{diaDaSemana(coluna.dia)}</span>
                {diaDoMes(coluna.dia)}
              </>
            ) : (
              // No celular, 31 numeros nao cabem: fica o 1 e os multiplos de
              // 5, que bastam para achar o dia.
              <span
                className={
                  Number(diaDoMes(coluna.dia)) === 1 ||
                  Number(diaDoMes(coluna.dia)) % 5 === 0
                    ? ""
                    : "hidden md:inline"
                }
              >
                {diaDoMes(coluna.dia)}
              </span>
            )}
          </span>
        ))}
      </div>
    </figure>
  );
}
