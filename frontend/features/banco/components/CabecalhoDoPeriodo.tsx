"use client";

import { BarraDoPeriodo } from "@/features/fechamento/components/BarraDoPeriodo";
import {
  hojeISO,
  inicioDaSemana,
  mesDe,
  rotuloDaSemana,
  rotuloDoDia,
  rotuloDoMes,
  somarDias,
  somarMeses,
} from "@/features/fechamento/painel-dados";

import type { EscolhasDoExtrato, Granularidade } from "../banco-da-tela";

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: "DIA", rotulo: "Dia" },
  { valor: "SEMANA", rotulo: "Semana" },
  { valor: "MES", rotulo: "Mês" },
];

/**
 * Dia, semana ou mês, e as setas para andar: o mesmo seletor no extrato e nos
 * gráficos do banco, para os dois olharem o mesmo período do mesmo jeito.
 */
export function CabecalhoDoPeriodo({
  escolhas,
  escolher,
}: {
  escolhas: EscolhasDoExtrato;
  escolher: (mudanca: Partial<EscolhasDoExtrato>) => void;
}) {
  // Mesma navegação dos Comprovantes: as setas andam um dia, uma semana ou um mês.
  const { granularidade, dia, mes } = escolhas;
  const hoje = hojeISO();
  const ehPeriodoAtual =
    granularidade === "DIA"
      ? dia === hoje
      : granularidade === "SEMANA"
        ? inicioDaSemana(dia) === inicioDaSemana(hoje)
        : mes === mesDe(hoje);
  const passo = (direcao: 1 | -1) =>
    granularidade === "MES"
      ? escolher({ mes: somarMeses(mes, direcao) })
      : escolher({ dia: somarDias(dia, direcao * (granularidade === "SEMANA" ? 7 : 1)) });
  // Os dois de uma vez: quem saltou para março vendo a semana e trocou para
  // "Mês" esperava março.
  const escolherPeriodo = (escolhido: string) =>
    granularidade === "MES"
      ? escolher({ mes: escolhido })
      : escolher({ dia: escolhido, mes: mesDe(escolhido) });
  const rotuloDoIntervalo =
    granularidade === "DIA"
      ? rotuloDoDia(dia)
      : granularidade === "SEMANA"
        ? rotuloDaSemana(dia)
        : rotuloDoMes(mes);

  return (
    <>
        <div className="flex gap-[4px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[4px]">
          {GRANULARIDADES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={granularidade === valor}
              onClick={() => escolher({ granularidade: valor })}
              className={`rounded-[10px] px-[18px] py-[9px] text-[15px] font-medium transition ${
                granularidade === valor
                  ? "bg-caixa-accent-soft text-caixa-accent"
                  : "text-caixa-muted hover:text-caixa-ink"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <BarraDoPeriodo
          modo={granularidade}
          valor={granularidade === "MES" ? mes : dia}
          rotulo={rotuloDoIntervalo}
          distintivo={ehPeriodoAtual ? "Atual" : null}
          atalho={
            ehPeriodoAtual
              ? undefined
              : { rotulo: "Voltar para hoje", aoClicar: () => escolher({ dia: hoje, mes: mesDe(hoje) }) }
          }
          aoAndar={passo}
          aoEscolher={escolherPeriodo}
        />
    </>
  );
}
