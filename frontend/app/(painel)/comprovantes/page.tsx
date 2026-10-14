"use client";

import { useMemo, useState } from "react";

import {
  escolhasIniciais,
  montarFiltro,
  rotuloDoTotal,
  type EscolhasDosComprovantes,
  type Granularidade,
} from "@/features/comprovantes/comprovantes-da-tela";
import { DetalheDoComprovante } from "@/features/comprovantes/components/DetalheDoComprovante";
import { EnviarComprovante } from "@/features/comprovantes/components/EnviarComprovante";
import { ListaDeComprovantes } from "@/features/comprovantes/components/ListaDeComprovantes";
import { ResumoDosComprovantes } from "@/features/comprovantes/components/ResumoDosComprovantes";
import { useComprovantes } from "@/features/comprovantes/hooks/useComprovantes";
import type { Comprovante } from "@/features/comprovantes/services/comprovantes";
import { BarraDoPeriodo } from "@/features/fechamento/components/BarraDoPeriodo";
import { ChipDeLoja } from "@/features/fechamento/components/ChipDeLoja";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";
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

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: "DIA", rotulo: "Dia" },
  { valor: "SEMANA", rotulo: "Semana" },
  { valor: "MES", rotulo: "Mês" },
];

const SITUACOES: { valor: EscolhasDosComprovantes["situacao"]; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "OK", rotulo: "OK" },
  { valor: "CONFERIR", rotulo: "Conferir" },
  { valor: "DESCARTADO", rotulo: "Descartado" },
];

const CLASSE_FILTRO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[12px] py-[9px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

/**
 * Comprovantes.
 *
 * O gasto sem nota: o que chegou por e-mail e o que foi enviado aqui. Só o
 * que está OK soma; "conferir" é a fila de quem precisa olhar.
 */
export default function ComprovantesPage() {
  const [escolhas, setEscolhas] = useState<EscolhasDosComprovantes>(() =>
    escolhasIniciais(hojeISO()),
  );
  const [aberto, setAberto] = useState<Comprovante | null>(null);
  const lojas = useLojasDoPainel();
  const filtro = useMemo(() => montarFiltro(escolhas), [escolhas]);
  const comprovantes = useComprovantes(filtro);

  // Trocar qualquer filtro volta para a página 1.
  const escolher = (mudanca: Partial<EscolhasDosComprovantes>) =>
    setEscolhas((atual) => ({ ...atual, pagina: 1, ...mudanca }));

  const dados = comprovantes.data;

  // Mesma navegação dos Gráficos: as setas andam um dia, uma semana ou um mês.
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
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="flex flex-wrap items-center justify-between gap-[16px] py-[28px]">
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
      </div>

      <div className="flex flex-col gap-[20px]">
        {/* O total logo abaixo do período, em cima das lojas: o mesmo lugar
            do fechamento de caixa e das Saídas. */}
        {dados && (
          <ResumoDosComprovantes
            rotulo={rotuloDoTotal(granularidade)}
            totais={dados.totais}
            onVerConferir={() => escolher({ situacao: "CONFERIR" })}
          />
        )}

        {/* Lojas e situação no mesmo cartão dos Gráficos: no lugar do turno,
            a situação, que é o recorte que esta tela tem. */}
        <div className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface p-[16px]">
          <div className="flex flex-wrap gap-[8px]">
            <ChipDeLoja rotulo="Todas as lojas" ativo={escolhas.loja === ""} aoClicar={() => escolher({ loja: "" })} />
            {(lojas.data ?? []).map((loja) => (
              <ChipDeLoja
                key={loja.id}
                rotulo={loja.nome_loja}
                ativo={escolhas.loja === loja.id}
                aoClicar={() => escolher({ loja: loja.id })}
              />
            ))}
            <ChipDeLoja rotulo="Sem loja" ativo={escolhas.loja === "sem"} aoClicar={() => escolher({ loja: "sem" })} />
          </div>

          <div className="mt-[14px] flex flex-wrap items-center gap-[10px] border-t border-caixa-border pt-[14px]">
            <span className="text-[13px] font-medium text-caixa-muted">Situação</span>
            <div className="flex flex-wrap gap-[4px] rounded-[10px] bg-caixa-faixa p-[3px]">
              {SITUACOES.map(({ valor, rotulo }) => (
                <button
                  key={rotulo}
                  type="button"
                  aria-pressed={escolhas.situacao === valor}
                  onClick={() => escolher({ situacao: valor })}
                  className={`rounded-[8px] px-[16px] py-[7px] text-[14px] font-medium transition ${
                    escolhas.situacao === valor
                      ? "bg-caixa-surface text-caixa-accent shadow-sm"
                      : "text-caixa-muted hover:text-caixa-ink"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {/* Igual ao painel do caixa: a tela se atualiza a cada 30s, e
                dizer quando foi a última vez evita o "será que já chegou?". */}
            <span className="ml-auto flex items-center gap-[10px] text-[13px] text-caixa-muted">
              {comprovantes.isFetching ? (
                "Atualizando..."
              ) : (
                <>
                  Atualizado às{" "}
                  {new Date(comprovantes.dataUpdatedAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <button
                    type="button"
                    onClick={() => comprovantes.refetch()}
                    className="underline-offset-4 transition hover:text-caixa-ink hover:underline"
                  >
                    Atualizar
                  </button>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <EnviarComprovante onLido={setAberto} />
        </div>

        {comprovantes.isError ? (
          <p className="text-[14px] text-red-700">Não deu para carregar os comprovantes.</p>
        ) : !dados ? (
          <p className="text-[14px] text-caixa-muted">Carregando…</p>
        ) : (
          <>
            <ListaDeComprovantes comprovantes={dados.results} onAbrir={setAberto} />
            {(dados.previous || dados.next) && (
              <div className="flex justify-center gap-[8px]">
                <button type="button" disabled={!dados.previous} onClick={() => setEscolhas((a) => ({ ...a, pagina: a.pagina - 1 }))} className={CLASSE_FILTRO}>
                  Anteriores
                </button>
                <button type="button" disabled={!dados.next} onClick={() => setEscolhas((a) => ({ ...a, pagina: a.pagina + 1 }))} className={CLASSE_FILTRO}>
                  Próximas
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {aberto && (
        <DetalheDoComprovante key={aberto.id} comprovante={aberto} onFechar={() => setAberto(null)} />
      )}
    </main>
  );
}
