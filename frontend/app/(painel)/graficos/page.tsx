"use client";

import React, { useMemo, useState } from "react";

import {
  emReais,
  fimDaSemana,
  fimDoMes,
  hojeISO,
  inicioDaSemana,
  inicioDoMes,
  mesDe,
  rotuloDaSemana,
  rotuloDoDia,
  rotuloDoMes,
  rotuloDoPeriodo,
  somarDias,
  somarMeses,
  turnosDoFiltro,
  type FiltroTurno,
} from "@/features/fechamento/painel-dados";
import { useMinhaEmpresa } from "@/features/admin/hooks/useEmpresa";
import { montarResumo, type Fatia } from "@/features/fechamento/graficos-dados";
import {
  useFechamentosDoIntervalo,
  useLojasDoPainel,
} from "@/features/fechamento/hooks/usePainel";
import { BarraDoPeriodo } from "@/features/fechamento/components/BarraDoPeriodo";

type Granularidade = "DIA" | "SEMANA" | "MES";

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: "DIA", rotulo: "Dia" },
  { valor: "SEMANA", rotulo: "Semana" },
  { valor: "MES", rotulo: "Mês" },
];

export default function GraficosPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>("SEMANA");
  const [dia, setDia] = useState(hojeISO);
  const [mes, setMes] = useState(() => mesDe(hojeISO()));
  const [lojaEscolhida, setLojaEscolhida] = useState<string | null>(null);
  const [turno, setTurno] = useState<FiltroTurno>("TODOS");

  // Os tres periodos viram um intervalo so, que e o que a API entende.
  const { de, ate } =
    granularidade === "DIA"
      ? { de: dia, ate: dia }
      : granularidade === "SEMANA"
        ? { de: inicioDaSemana(dia), ate: fimDaSemana(dia) }
        : { de: inicioDoMes(mes), ate: fimDoMes(mes) };

  const empresa = useMinhaEmpresa();
  const lojas = useLojasDoPainel();
  const fechamentos = useFechamentosDoIntervalo(de, ate);

  // Os turnos vem do que foi carregado: no domingo, "Manha" e "Tarde" sao dois
  // botoes que so sabem devolver grafico vazio.
  // Sem o useMemo, `?? []` devolveria um array novo a cada render e o
  // useMemo de baixo recalcularia sempre.
  const lancamentos = useMemo(() => fechamentos.data ?? [], [fechamentos.data]);
  const turnosDaTela = turnosDoFiltro(
    lancamentos,
    de,
    ate,
    empresa.data?.fechamentos_por_dia === 1,
  );

  // Derivado, e nao guardado: trocar de periodo com "Manha" ligado deixaria o
  // filtro aceso num turno que aquele periodo nao tem.
  const turnoEfetivo =
    turno === "TODOS" || turnosDaTela.includes(turno) ? turno : "TODOS";

  const resumo = useMemo(
    () => montarResumo(lojas.data ?? [], lancamentos, lojaEscolhida, turnoEfetivo),
    [lojas.data, lancamentos, lojaEscolhida, turnoEfetivo],
  );

  const hoje = hojeISO();
  const ehPeriodoAtual =
    granularidade === "DIA"
      ? dia === hoje
      : granularidade === "SEMANA"
        ? inicioDaSemana(dia) === inicioDaSemana(hoje)
        : mes === mesDe(hoje);

  const passo = (direcao: 1 | -1) => {
    if (granularidade === "MES") setMes(somarMeses(mes, direcao));
    else setDia(somarDias(dia, direcao * (granularidade === "SEMANA" ? 7 : 1)));
  };

  const irParaAtual = () => {
    setDia(hoje);
    setMes(mesDe(hoje));
  };

  // Os dois estados de uma vez: quem saltou para marco vendo a semana e trocou
  // para "Mês" esperava marco, e nao o mes que tinha ficado para tras.
  const escolherPeriodo = (escolhido: string) => {
    if (granularidade === "MES") return setMes(escolhido);
    setDia(escolhido);
    setMes(mesDe(escolhido));
  };

  const rotuloDoIntervalo =
    granularidade === "DIA"
      ? rotuloDoDia(dia)
      : granularidade === "SEMANA"
        ? rotuloDaSemana(dia)
        : rotuloDoMes(mes);

  const carregando = lojas.isPending || fechamentos.isPending;
  const erro = lojas.error ?? fechamentos.error;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[40px]">
      <div className="flex flex-wrap items-center justify-between gap-[16px] py-[28px]">
        <div className="flex gap-[4px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[4px]">
          {GRANULARIDADES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={granularidade === valor}
              onClick={() => setGranularidade(valor)}
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
              : { rotulo: "Voltar para hoje", aoClicar: irParaAtual }
          }
          aoAndar={passo}
          aoEscolher={escolherPeriodo}
        />
      </div>

      {erro && (
        <p className="mb-[20px] rounded-[12px] border border-red-500/20 bg-red-500/10 px-[20px] py-[16px] text-[14px] font-medium text-red-600">
          {erro instanceof Error ? erro.message : "Erro ao carregar os gráficos."}
        </p>
      )}

      {/* Escolha da loja: oito chips cabem numa linha e custam um clique;
          um seletor esconderia a lista atras de outro toque. */}
      <div className="cartao-caixa mb-[20px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[16px]">
        <div className="flex flex-wrap gap-[8px]">
          <ChipDeLoja
            rotulo="Todas as lojas"
            ativo={lojaEscolhida === null}
            aoClicar={() => setLojaEscolhida(null)}
          />
          {(lojas.data ?? []).map((loja) => (
            <ChipDeLoja
              key={loja.id}
              rotulo={loja.nome_loja}
              ativo={lojaEscolhida === loja.id}
              aoClicar={() => setLojaEscolhida(loja.id)}
            />
          ))}
        </div>

        {/* Turno logo abaixo das lojas: sao os dois recortes do mesmo
            grafico, e ler um embaixo do outro deixa claro que se somam.

            Fica na tela sempre — num domingo e ele que diz que aquele grafico
            e do turno de domingo. */}
        <div className="mt-[14px] flex flex-wrap items-center gap-[10px] border-t border-caixa-border pt-[14px]">
          <span className="text-[13px] font-medium text-caixa-muted">Turno</span>
          <div className="flex gap-[4px] rounded-[10px] bg-caixa-faixa p-[3px]">
            {[
              { valor: "TODOS" as FiltroTurno, rotulo: "Todos os turnos" },
              ...turnosDaTela.map((periodo) => ({
                valor: periodo as FiltroTurno,
                rotulo: rotuloDoPeriodo(periodo),
              })),
            ].map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={turnoEfetivo === valor}
                onClick={() => setTurno(valor)}
                className={`rounded-[8px] px-[16px] py-[7px] text-[14px] font-medium transition ${
                  turnoEfetivo === valor
                    ? "bg-caixa-surface text-caixa-accent shadow-sm"
                    : "text-caixa-muted hover:text-caixa-ink"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {carregando ? (
        <p className="rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px] md:py-[20px] text-[15px] text-caixa-muted">
          Carregando lançamentos...
        </p>
      ) : (
        <section className="cartao-caixa rounded-[12px] border border-caixa-border bg-caixa-surface p-[18px] md:p-[28px]">
          <header className="mb-[24px] flex flex-wrap items-baseline justify-between gap-[12px]">
            <h2 className="text-[20px] font-bold leading-[1.2]">
              {resumo.lojaNome}
            </h2>
            <span className="text-[13px] text-caixa-muted">
              {turnoEfetivo !== "TODOS" && `${rotuloDoPeriodo(turnoEfetivo)} · `}
              {resumo.lancamentos === 1
                ? "1 lançamento no período"
                : `${resumo.lancamentos} lançamentos no período`}
            </span>
          </header>

          {resumo.emCaixa === 0 && resumo.despesas === 0 ? (
            <p className="text-[15px] text-caixa-muted">
              {turnoEfetivo === "TODOS"
                ? "Sem lançamentos neste período. Use as setas para ver outro."
                : "Sem lançamentos neste turno. Troque o turno ou o período."}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-[24px] md:gap-[48px]">
              <Rosca fatias={resumo.fatias} total={resumo.emCaixa} />

              {/* Legenda com o valor de cada fatia: e ela que da identidade
                  sem depender so da cor, e cobre o aviso de contraste das
                  duas fatias mais claras. */}
              <dl className="flex w-full flex-1 flex-col gap-[2px] md:min-w-[280px]">
                {resumo.fatias.map((fatia) => (
                  <div
                    key={fatia.campo}
                    className="flex items-center gap-[12px] border-b border-caixa-border/60 py-[10px] last:border-b-0"
                  >
                    <span
                      aria-hidden="true"
                      className="h-[10px] w-[10px] shrink-0 rounded-[3px]"
                      style={{ backgroundColor: fatia.cor }}
                    />
                    <dt className="flex-1 text-[15px]">{fatia.rotulo}</dt>
                    <dd className="w-[110px] text-right text-[15px] font-medium tabular-nums">
                      {fatia.valor > 0 ? `R$ ${emReais(fatia.valor)}` : "—"}
                    </dd>
                    <dd className="w-[52px] text-right text-[14px] text-caixa-muted tabular-nums">
                      {fatia.valor > 0 ? `${fatia.percentual.toFixed(0)}%` : ""}
                    </dd>
                  </div>
                ))}

                <div className="mt-[10px] flex flex-col gap-[6px] rounded-[10px] bg-caixa-detalhe px-[14px] py-[12px]">
                  {/* As fatias desenham o que a empresa TEM: a retirada esta
                      dentro do dinheiro, porque so mudou de mao. A despesa fica
                      de fora — foi gasta — e por isso aparece na linha propria,
                      somando para o total do periodo em vez de subtraindo. */}
                  <Linha rotulo="Em caixa" valor={emReais(resumo.emCaixa)} />
                  {resumo.despesas > 0 && (
                    <Linha rotulo="Despesas" valor={emReais(resumo.despesas)} />
                  )}
                  <Linha
                    rotulo="Total do período"
                    valor={emReais(resumo.total)}
                    forte
                  />
                </div>
              </dl>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function ChipDeLoja({
  rotulo,
  ativo,
  aoClicar,
}: {
  rotulo: string;
  ativo: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoClicar}
      className={`rounded-[8px] border px-[14px] py-[8px] text-[14px] font-medium transition ${
        ativo
          ? "border-caixa-accent bg-caixa-accent-soft text-caixa-accent"
          : "border-caixa-border bg-caixa-surface text-caixa-muted hover:text-caixa-ink"
      }`}
    >
      {rotulo}
    </button>
  );
}

const RAIO = 60;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** Respiro entre fatias, na cor da superficie — e o gap que separa, nao um
 *  contorno desenhado em volta da fatia. */
const RESPIRO = 3;

function Rosca({ fatias, total }: { fatias: Fatia[]; total: number }) {
  const visiveis = fatias.filter((f) => f.valor > 0);

  // Os arcos sao calculados antes do JSX: acumular o offset dentro do map
  // seria mutar uma variavel externa durante a renderizacao.
  const arcos = visiveis.reduce<
    { fatia: Fatia; traco: number; inicio: number; comprimento: number }[]
  >((acumulado, fatia) => {
    const anterior = acumulado.at(-1);
    const inicio = anterior ? anterior.inicio + anterior.comprimento : 0;
    const comprimento = (fatia.percentual / 100) * CIRCUNFERENCIA;
    // Com uma fatia so nao ha vizinho de quem se separar.
    const traco =
      visiveis.length > 1 ? Math.max(comprimento - RESPIRO, 1) : comprimento;

    return [...acumulado, { fatia, traco, inicio, comprimento }];
  }, []);

  return (
    <figure className="m-0 flex shrink-0 flex-col items-center gap-[12px]">
      <svg
        // Sem width fixo: em 390px a rosca de 200 mais a legenda de 280 nao
        // cabiam, e a legenda ficava espremida em duas colunas de nada.
        className="h-[168px] w-[168px] md:h-[200px] md:w-[200px]"
        viewBox="0 0 160 160"
        role="img"
        aria-label={`Formas de pagamento: ${visiveis
          .map((f) => `${f.rotulo} ${f.percentual.toFixed(0)}%`)
          .join(", ")}`}
      >
        <g transform="rotate(-90 80 80)">
          {arcos.map(({ fatia, traco, inicio }) => (
              <circle
                key={fatia.campo}
                cx="80"
                cy="80"
                r={RAIO}
                fill="none"
                stroke={fatia.cor}
                strokeWidth="26"
                strokeDasharray={`${traco} ${CIRCUNFERENCIA - traco}`}
                strokeDashoffset={-inicio}
              >
                <title>{`${fatia.rotulo}: R$ ${emReais(fatia.valor)} (${fatia.percentual.toFixed(1)}%)`}</title>
              </circle>
          ))}
        </g>
      </svg>
      <figcaption className="text-[13px] text-caixa-muted">
        Recebido: <span className="font-semibold text-caixa-ink tabular-nums">R$ {emReais(total)}</span>
      </figcaption>
    </figure>
  );
}

function Linha({
  rotulo,
  valor,
  forte = false,
  vermelho = false,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
  vermelho?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-[12px]">
      <span className={`text-[14px] ${forte ? "font-semibold" : "text-caixa-muted"}`}>
        {rotulo}
      </span>
      <span
        className={`tabular-nums ${
          forte ? "text-[18px] font-bold" : "text-[14px]"
        } ${vermelho ? "text-caixa-danger" : ""}`}
      >
        {vermelho ? "− " : ""}R$ {valor}
      </span>
    </div>
  );
}
