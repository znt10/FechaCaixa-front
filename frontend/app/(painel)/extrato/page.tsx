"use client";

import { useMemo, useState } from "react";

import {
  andarDePagina,
  escolhasIniciais,
  filtroDoResumo,
  montarFiltroDoExtrato,
  nomeDaConta,
  resumoDaPagina,
  rotuloDoSaldo,
  trocarDeFiltro,
  type EscolhasDoExtrato,
  type Granularidade,
} from "@/features/banco/banco-da-tela";
import { AvisoDeExtratoParado } from "@/features/banco/components/AvisoDeExtratoParado";
import { ResumoDoExtrato } from "@/features/banco/components/ResumoDoExtrato";
import { GastosPorGrupo } from "@/features/banco/components/GastosPorGrupo";
import { GraficoDoFluxo } from "@/features/banco/components/GraficoDoFluxo";
import { gastosPorGrupo, serieDoFluxo } from "@/features/banco/graficos-do-extrato";
import { TabelaDeTransacoes } from "@/features/banco/components/TabelaDeTransacoes";
import { UploadDeExtrato } from "@/features/banco/components/UploadDeExtrato";
import {
  useContasBancarias,
  useResumoDoExtrato,
  useTransacoes,
} from "@/features/banco/hooks/useBanco";
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

const CLASSE_PAGINADOR =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[9px] text-[14px] font-semibold text-caixa-ink transition hover:border-caixa-accent/40 disabled:opacity-40 disabled:hover:border-caixa-border";

/**
 * Extrato bancário.
 *
 * As telas do caixa contam o que a loja lançou; esta conta o que passou pelo
 * banco de cada loja. A gerência sobe o OFX de cada conta e diz o que é cada
 * linha: pagamento, transferência ou recebimento. O que o sistema já sabe —
 * transferência entre lojas, descrição que já foi respondida — chega pronto.
 *
 * A ordem é a do fechamento de caixa e dos comprovantes: o período em cima, o
 * dinheiro logo embaixo, e depois o trabalho — subir o arquivo e classificar.
 */
export default function ExtratoPage() {
  const [escolhas, setEscolhas] = useState<EscolhasDoExtrato>(() =>
    escolhasIniciais(hojeISO()),
  );
  // Ligado de saída: quem classifica "PIX RECEBIDO" uma vez quase sempre quer
  // as outras vinte iguais do mês junto. Desliga quem estiver separando caso a
  // caso.
  const [aplicarAsIguais, setAplicarAsIguais] = useState(true);
  const lojas = useLojasDoPainel();
  const contas = useContasBancarias();

  const filtro = useMemo(() => montarFiltroDoExtrato(escolhas), [escolhas]);
  const recorte = useMemo(() => filtroDoResumo(escolhas), [escolhas]);
  const transacoes = useTransacoes(filtro);
  const resumo = useResumoDoExtrato(recorte);

  const escolher = (mudanca: Partial<EscolhasDoExtrato>) =>
    setEscolhas((atual) => trocarDeFiltro(atual, mudanca));

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

  // A conta só aparece com uma loja escolhida e mais de uma conta nela: com
  // todas as lojas seriam quinze botões, e escolher a conta já escolhe a loja.
  const contasDaLoja = escolhas.loja
    ? (contas.data ?? []).filter((conta) => conta.loja.id === escolhas.loja)
    : [];
  const pagina = transacoes.data ? resumoDaPagina(transacoes.data, escolhas.pagina) : null;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <AvisoDeExtratoParado />
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
        {/* Nada de resumo enquanto ele falhou: o dinheiro de um filtro em cima
            da tabela de outro é pior do que número nenhum. */}
        {resumo.data && !resumo.error && (
          <ResumoDoExtrato
            resumo={resumo.data}
            rotulo={rotuloDoSaldo(granularidade)}
            onVerPendentes={escolhas.soPendentes ? undefined : () => escolher({ soPendentes: true })}
          />
        )}

        {/* Os gráficos olham o mesmo resumo do cartão de cima: mesmo período,
            mesma loja, mesma conta de dinheiro. */}
        {resumo.data && !resumo.error && (
          <div
            className={`grid gap-[20px] ${(resumo.data.por_dia ?? []).length > 1 ? "lg:grid-cols-[3fr_2fr]" : ""}`}
          >
            <GraficoDoFluxo pontos={serieDoFluxo(resumo.data.por_dia ?? [])} />
            <GastosPorGrupo
              gastos={gastosPorGrupo(
                resumo.data.por_tipo.find((bloco) => bloco.tipo === "PAGAMENTO") ?? { categorias: [] },
              )}
              pendentes={resumo.data.pendentes.quantidade}
            />
          </div>
        )}

        <UploadDeExtrato />

        {/* Lojas, filtros e lista num cartão só, como nos comprovantes: as
            lojas são o cabeçalho do que vem embaixo — e do total lá em cima. */}
        <div className="cartao-caixa-grande overflow-hidden rounded-[12px] border border-caixa-border bg-caixa-surface">
          <div className="flex flex-wrap gap-[8px] border-b border-caixa-border px-[16px] py-[14px] md:px-[24px]">
            <ChipDeLoja
              rotulo="Todas as lojas"
              ativo={escolhas.loja === ""}
              aoClicar={() => escolher({ loja: "", contaBancaria: "" })}
            />
            {(lojas.data ?? []).map((loja) => (
              <ChipDeLoja
                key={loja.id}
                rotulo={loja.nome_loja}
                ativo={escolhas.loja === loja.id}
                // Trocar a loja limpa a conta: a conta de outra loja deixaria
                // a lista vazia sem motivo aparente.
                aoClicar={() => escolher({ loja: loja.id, contaBancaria: "" })}
              />
            ))}
          </div>

          {contasDaLoja.length > 1 && (
            <div className="flex flex-wrap items-center gap-[10px] border-b border-caixa-border px-[16px] py-[14px] md:px-[24px]">
              <span className="text-[13px] font-medium text-caixa-muted">Conta</span>
              <div className="flex flex-wrap gap-[4px] rounded-[10px] bg-caixa-faixa p-[3px]">
                {[
                  { id: "", nome: "Todas as contas" },
                  ...contasDaLoja.map((conta) => ({ id: conta.id, nome: nomeDaConta(conta) })),
                ].map(({ id, nome }) => (
                    <button
                      key={id || "todas"}
                      type="button"
                      aria-pressed={escolhas.contaBancaria === id}
                      onClick={() => escolher({ contaBancaria: id })}
                      className={`rounded-[8px] px-[16px] py-[7px] text-[14px] font-medium transition ${
                        escolhas.contaBancaria === id
                          ? "bg-caixa-surface text-caixa-accent shadow-sm"
                          : "text-caixa-muted hover:text-caixa-ink"
                      }`}
                    >
                      {nome}
                    </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-[24px] gap-y-[10px] border-b border-caixa-border px-[16px] py-[14px] md:px-[24px]">
            <label className="flex items-center gap-[8px] text-[14px] leading-[1.4]">
              <input
                type="checkbox"
                checked={escolhas.soPendentes}
                onChange={(evento) => escolher({ soPendentes: evento.target.checked })}
                className="h-[16px] w-[16px] accent-caixa-accent"
              />
              Só as que faltam classificar
            </label>
            <label className="flex items-center gap-[8px] text-[14px] leading-[1.4] text-caixa-muted">
              <input
                type="checkbox"
                checked={aplicarAsIguais}
                onChange={(evento) => setAplicarAsIguais(evento.target.checked)}
                className="h-[16px] w-[16px] accent-caixa-accent"
              />
              Ao classificar, aplicar a mesma escolha às outras pendentes com a mesma descrição
            </label>
          </div>

          {transacoes.error && (
            <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-caixa-border bg-caixa-alerta-soft px-[16px] py-[14px] md:px-[24px]">
              <p className="text-[14px] font-medium text-caixa-alerta">
                {transacoes.error instanceof Error
                  ? transacoes.error.message
                  : "Não foi possível carregar o extrato."}
                {escolhas.pagina > 1 &&
                  " A lista pode ter mudado e esta página deixado de existir."}
              </p>
              {escolhas.pagina > 1 && (
                <button
                  type="button"
                  onClick={() => setEscolhas((atual) => ({ ...atual, pagina: 1 }))}
                  className={CLASSE_PAGINADOR}
                >
                  Voltar para a primeira página
                </button>
              )}
            </div>
          )}

          <TabelaDeTransacoes
            transacoes={transacoes.data?.results ?? []}
            carregando={transacoes.isPending}
            aplicarAsIguais={aplicarAsIguais}
          />
        </div>

        {pagina && (pagina.texto || pagina.temAnterior || pagina.temProxima) && (
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <span aria-live="polite" className="text-[14px] text-caixa-muted">
              {pagina.texto}
            </span>
            {(pagina.temAnterior || pagina.temProxima) && (
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  onClick={() => setEscolhas((atual) => andarDePagina(atual, -1))}
                  disabled={!pagina.temAnterior || transacoes.isFetching}
                  className={CLASSE_PAGINADOR}
                >
                  Anteriores
                </button>
                <button
                  type="button"
                  onClick={() => setEscolhas((atual) => andarDePagina(atual, 1))}
                  disabled={!pagina.temProxima || transacoes.isFetching}
                  className={CLASSE_PAGINADOR}
                >
                  Próximas
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
