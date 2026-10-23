"use client";

import { useState } from "react";

import { emReais } from "@/features/fechamento/painel-dados";

import type { PontoDoFluxo } from "../graficos-do-extrato";

/** Verde para o que entrou, laranja para o que saiu. Validadas contra o fundo
 *  branco (scripts do guia de gráficos): separáveis para daltônico com a
 *  ajuda da posição, já que entrada sobe e saída desce da linha do zero. */
export const COR_ENTRADA = "#16865c";
export const COR_SAIDA = "#c25b2f";

const LARGURA = 640;
const ALTURA = 220;
const MARGEM = { esquerda: 64, direita: 8, topo: 12, baixo: 26 };
const RAIO = 4;

/** Barra com o canto arredondado só na ponta do dado; a base fica reta,
 *  colada na linha do zero. */
const caminhoDaBarra = (x: number, y0: number, largura: number, altura: number, sobe: boolean) => {
  if (altura <= 0) return "";
  const r = Math.min(RAIO, largura / 2, altura);
  if (sobe) {
    const topo = y0 - altura;
    return `M${x},${y0} V${topo + r} Q${x},${topo} ${x + r},${topo} H${x + largura - r} Q${x + largura},${topo} ${x + largura},${topo + r} V${y0} Z`;
  }
  const fundo = y0 + altura;
  return `M${x},${y0} V${fundo - r} Q${x},${fundo} ${x + r},${fundo} H${x + largura - r} Q${x + largura},${fundo} ${x + largura},${fundo - r} V${y0} Z`;
};

const ehSemana = (pontos: PontoDoFluxo[]) =>
  pontos.length > 1 && Date.parse(pontos[1].inicio) - Date.parse(pontos[0].inicio) > 86_400_000;

/**
 * O fluxo de caixa do período: o que entrou sobe, o que saiu desce, dia a dia
 * (ou semana a semana, em período longo). Passar o mouse ou o dedo numa coluna
 * mostra os números daquele dia, e "Ver em tabela" dá os mesmos números sem
 * depender da cor.
 */
export function GraficoDoFluxo({ pontos }: { pontos: PontoDoFluxo[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const maiorEntrada = Math.max(0, ...pontos.map((ponto) => ponto.entradas));
  const maiorSaida = Math.max(0, ...pontos.map((ponto) => ponto.saidas));
  const escala = maiorEntrada + maiorSaida;
  if (pontos.length < 2 || escala === 0) return null;

  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.baixo;
  const zero = MARGEM.topo + (alturaUtil * maiorEntrada) / escala;
  const passo = larguraUtil / pontos.length;
  const larguraDaBarra = Math.max(2, Math.min(18, passo * 0.7));
  const altura = (valor: number) => (alturaUtil * valor) / escala;
  const centro = (indice: number) => MARGEM.esquerda + passo * indice + passo / 2;
  const porSemana = ehSemana(pontos);
  const rotulosDoEixo = [0, Math.floor((pontos.length - 1) / 2), pontos.length - 1];
  const destaque = ativo === null ? null : pontos[ativo];

  return (
    <figure className="cartao-caixa flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[18px] md:px-[24px]">
      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <figcaption className="text-[16px] font-bold text-caixa-ink">
          Fluxo de caixa {porSemana ? "por semana" : "por dia"}
        </figcaption>
        <div className="flex gap-[16px] text-[13px] text-caixa-muted">
          <span className="flex items-center gap-[6px]">
            <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: COR_ENTRADA }} />
            Entrou
          </span>
          <span className="flex items-center gap-[6px]">
            <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: COR_SAIDA }} />
            Saiu
          </span>
        </div>
      </div>

      <div className="relative">
        {destaque && ativo !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[8px] border border-caixa-border bg-caixa-surface px-[10px] py-[8px] text-[13px] shadow-sm"
            style={{ left: `${(centro(ativo) / LARGURA) * 100}%` }}
          >
            <div className="font-semibold text-caixa-ink">
              {porSemana ? `Semana de ${destaque.rotulo}` : destaque.rotulo}
            </div>
            <div className="flex items-center gap-[6px] text-caixa-muted">
              <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: COR_ENTRADA }} />
              Entrou <span className="tabular-nums text-caixa-ink">R$ {emReais(destaque.entradas)}</span>
            </div>
            <div className="flex items-center gap-[6px] text-caixa-muted">
              <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: COR_SAIDA }} />
              Saiu <span className="tabular-nums text-caixa-ink">R$ {emReais(destaque.saidas)}</span>
            </div>
            <div className="text-caixa-muted">
              Saldo{" "}
              <span className="font-semibold tabular-nums text-caixa-ink">
                {destaque.saldo < 0 ? "−" : ""}R$ {emReais(Math.abs(destaque.saldo))}
              </span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Fluxo de caixa de ${pontos[0].rotulo} a ${pontos[pontos.length - 1].rotulo}: maior entrada R$ ${emReais(maiorEntrada)}, maior saída R$ ${emReais(maiorSaida)}.`}
          onMouseLeave={() => setAtivo(null)}
        >
          {ativo !== null && (
            <rect
              x={MARGEM.esquerda + passo * ativo}
              y={MARGEM.topo}
              width={passo}
              height={alturaUtil}
              className="fill-caixa-faixa"
            />
          )}

          <line
            x1={MARGEM.esquerda}
            x2={LARGURA - MARGEM.direita}
            y1={zero}
            y2={zero}
            className="stroke-caixa-border"
            strokeWidth={1}
          />
          <text x={MARGEM.esquerda - 8} y={MARGEM.topo + 10} textAnchor="end" className="fill-caixa-muted text-[11px]">
            {emReais(maiorEntrada)}
          </text>
          <text x={MARGEM.esquerda - 8} y={zero + 4} textAnchor="end" className="fill-caixa-muted text-[11px]">
            0
          </text>
          <text
            x={MARGEM.esquerda - 8}
            y={MARGEM.topo + alturaUtil}
            textAnchor="end"
            className="fill-caixa-muted text-[11px]"
          >
            −{emReais(maiorSaida)}
          </text>

          {pontos.map((ponto, indice) => {
            const x = centro(indice) - larguraDaBarra / 2;
            return (
              <g key={ponto.inicio}>
                <path d={caminhoDaBarra(x, zero - 1, larguraDaBarra, altura(ponto.entradas), true)} fill={COR_ENTRADA} />
                <path d={caminhoDaBarra(x, zero + 1, larguraDaBarra, altura(ponto.saidas), false)} fill={COR_SAIDA} />
                {/* A área de toque é a coluna inteira, não só a barra fina. */}
                <rect
                  x={MARGEM.esquerda + passo * indice}
                  y={MARGEM.topo}
                  width={passo}
                  height={alturaUtil}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${ponto.rotulo}: entrou R$ ${emReais(ponto.entradas)}, saiu R$ ${emReais(ponto.saidas)}`}
                  onMouseEnter={() => setAtivo(indice)}
                  onFocus={() => setAtivo(indice)}
                  onClick={() => setAtivo(indice)}
                />
              </g>
            );
          })}

          {[...new Set(rotulosDoEixo)].map((indice) => (
            <text
              key={indice}
              x={centro(indice)}
              y={ALTURA - 6}
              textAnchor="middle"
              className="fill-caixa-muted text-[11px]"
            >
              {pontos[indice].rotulo}
            </text>
          ))}
        </svg>
      </div>

      <details className="text-[14px] text-caixa-muted">
        <summary className="cursor-pointer select-none">Ver em tabela</summary>
        <table className="mt-[8px] w-full text-left tabular-nums">
          <thead>
            <tr className="text-[12px] uppercase tracking-[0.4px]">
              <th className="py-[4px] font-semibold">{porSemana ? "Semana de" : "Dia"}</th>
              <th className="py-[4px] text-right font-semibold">Entrou</th>
              <th className="py-[4px] text-right font-semibold">Saiu</th>
              <th className="py-[4px] text-right font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody className="text-caixa-ink">
            {pontos.map((ponto) => (
              <tr key={ponto.inicio} className="border-t border-caixa-border">
                <td className="py-[4px]">{ponto.rotulo}</td>
                <td className="py-[4px] text-right">{emReais(ponto.entradas)}</td>
                <td className="py-[4px] text-right">{emReais(ponto.saidas)}</td>
                <td className="py-[4px] text-right">
                  {ponto.saldo < 0 ? "−" : ""}
                  {emReais(Math.abs(ponto.saldo))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
