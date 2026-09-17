"use client";

import React, { useMemo, useState } from "react";

import {
  emReais,
  fimDoMes,
  hojeISO,
  inicioDoMes,
  mesDe,
  montarResumo,
  rotuloDoDia,
  rotuloDoMes,
  rotuloDoPeriodo,
  somarDias,
  turnosDoFiltro,
  somarMeses,
  type FiltroTurno,
  type LinhaPainel,
  type StatusLinha,
} from "@/features/fechamento/painel-dados";
import {
  useConferirFechamento,
  useFechamentosDoPainel,
  useLojasDoPainel,
  type Visao,
} from "@/features/fechamento/hooks/usePainel";
import { BarraDoPeriodo } from "@/features/fechamento/components/BarraDoPeriodo";
import { useMinhaEmpresa } from "@/features/admin/hooks/useEmpresa";
import type { FechamentoLido } from "@/features/fechamento/services/painel";

const CORES_STATUS: Record<StatusLinha["tipo"], string> = {
  // Conferido e o unico estado cheio: o verde solido separa "a gerencia ja
  // olhou" de "a loja lancou", que o verde claro sozinho deixava parecidos.
  CONFERIDO: "bg-caixa-accent text-white",
  LANCADO: "bg-caixa-accent-soft text-caixa-accent",
  REVISAR: "bg-caixa-warn-soft text-caixa-warn",
  AUSENTE: "bg-caixa-danger-soft text-caixa-danger",
};

export default function PainelFechamentoPage() {
  const [visao, setVisao] = useState<Visao>("DIARIO");
  const [turno, setTurno] = useState<FiltroTurno>("TODOS");
  const [abertas, setAbertas] = useState<string[]>([]);

  const alternarTodas = (ids: string[]) =>
    setAbertas((atuais) => (atuais.length === ids.length ? [] : ids));

  const alternar = (lojaId: string) =>
    setAbertas((atuais) =>
      atuais.includes(lojaId)
        ? atuais.filter((id) => id !== lojaId)
        : [...atuais, lojaId],
    );
  const [dia, setDia] = useState(hojeISO);
  const [mes, setMes] = useState(() => mesDe(hojeISO()));

  const referencia = visao === "DIARIO" ? dia : mes;
  const empresa = useMinhaEmpresa();
  const lojas = useLojasDoPainel();
  const fechamentos = useFechamentosDoPainel(visao, referencia);

  // Os turnos vem do que foi carregado, e nao de uma lista fixa: num domingo
  // "Manha" e "Tarde" sao dois botoes que so sabem devolver tela vazia.
  // Sem o useMemo, `?? []` devolveria um array novo a cada render e o
  // useMemo de baixo recalcularia sempre.
  const lancamentos = useMemo(() => fechamentos.data ?? [], [fechamentos.data]);
  // O intervalo que a tela esta mostrando, usado pelo filtro de turno e pela
  // exportacao — que leva o periodo inteiro, e nao a lista filtrada.
  const de = visao === "DIARIO" ? dia : inicioDoMes(mes);
  const ate = visao === "DIARIO" ? dia : fimDoMes(mes);
  const turnosDaTela = turnosDoFiltro(
    lancamentos,
    de,
    ate,
    empresa.data?.fechamentos_por_dia === 1,
  );

  // Derivado em vez de guardado no estado: sair de uma quarta com "Manha"
  // ligado e cair num domingo deixaria o filtro aceso num turno que nao existe
  // ali, e a gerencia veria uma tela vazia sem entender o porque.
  const turnoEfetivo =
    turno === "TODOS" || turnosDaTela.includes(turno) ? turno : "TODOS";

  const resumo = useMemo(
    () => montarResumo(lojas.data ?? [], lancamentos, visao, turnoEfetivo),
    [lojas.data, lancamentos, visao, turnoEfetivo],
  );

  // Hoje e o dia que a gerencia olha 99% das vezes; navegar de volta uma seta
  // por vez depois de conferir a semana passada seria trabalho a toa.
  const hoje = hojeISO();
  const ehPeriodoAtual = visao === "DIARIO" ? dia === hoje : mes === mesDe(hoje);

  const irParaAtual = () => {
    setDia(hoje);
    setMes(mesDe(hoje));
  };

  const voltar = () =>
    visao === "DIARIO" ? setDia(somarDias(dia, -1)) : setMes(somarMeses(mes, -1));
  const avancar = () =>
    visao === "DIARIO" ? setDia(somarDias(dia, 1)) : setMes(somarMeses(mes, 1));

  // Escolher no calendario acerta os dois: sair do dia 12 de marco e trocar
  // para a visao mensal tem que cair em marco.
  const escolherPeriodo = (escolhido: string) => {
    if (visao === "MENSAL") return setMes(escolhido);
    setDia(escolhido);
    setMes(mesDe(escolhido));
  };

  // O card do total acompanha o filtro: em "Manhã" ele nao e mais o total do
  // dia, e chamar assim faria a gerencia conferir o numero errado.
  const rotuloDoTotal =
    turnoEfetivo === "MANHA"
      ? "TOTAL DA MANHÃ"
      : turnoEfetivo === "TARDE"
        ? "TOTAL DA TARDE"
        : turnoEfetivo === "DOMINGO"
          ? "TOTAL DE DOMINGO"
          : turnoEfetivo === "DIA"
            ? "TOTAL DO DIA INTEIRO"
            : visao === "DIARIO"
              ? "TOTAL DO DIA"
              : "TOTAL DO MÊS";

  // O detalhe so existe na visao diaria: no mes a loja tem dezenas de turnos,
  // e abrir todos viraria uma lista sem fim que nao responde pergunta nenhuma.
  // Para o mes, a leitura util e a linha somada.
  const podeAbrirDetalhe = visao === "DIARIO";

  // So lojas que lancaram tem detalhe para abrir.
  const comLancamento = resumo.linhas
    .filter((linha) => linha.status.tipo !== "AUSENTE")
    .map((linha) => linha.lojaId);

  const carregando = lojas.isPending || fechamentos.isPending;
  const erro = lojas.error ?? fechamentos.error;
  const pendentes = visao === "DIARIO" ? resumo.lojasPendentes : [];

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[40px]">
      {/* Toolbar: abas + navegacao de periodo */}
      <div className="flex flex-wrap items-center justify-between gap-[16px] py-[28px]">
        <div className="flex gap-[4px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[4px]">
          {([
            { valor: "DIARIO", rotulo: "Diário" },
            { valor: "MENSAL", rotulo: "Mensal" },
          ] as const).map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={visao === valor}
              onClick={() => {
                setVisao(valor);
                setAbertas([]);
              }}
              className={`rounded-[10px] px-[18px] py-[9px] text-[15px] font-medium transition ${
                visao === valor
                  ? "bg-caixa-accent-soft text-caixa-accent"
                  : "text-caixa-muted hover:text-caixa-ink"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {/* O atalho de volta so aparece quando voce saiu de hoje: senao seria
            um botao que nao faz nada. */}
        <BarraDoPeriodo
          modo={visao === "DIARIO" ? "DIA" : "MES"}
          valor={visao === "DIARIO" ? dia : mes}
          rotulo={visao === "DIARIO" ? rotuloDoDia(dia) : rotuloDoMes(mes)}
          // Sem isto nao da para saber, olhando a tela, se o que esta ali e o
          // dia de hoje ou um dia que ficou aberto de ontem.
          distintivo={
            ehPeriodoAtual ? (visao === "DIARIO" ? "Hoje" : "Este mês") : null
          }
          atalho={
            ehPeriodoAtual
              ? undefined
              : {
                  rotulo: visao === "DIARIO" ? "Ir para hoje" : "Ir para este mês",
                  aoClicar: irParaAtual,
                }
          }
          aoAndar={(direcao) => (direcao === -1 ? voltar() : avancar())}
          aoEscolher={escolherPeriodo}
        />
      </div>

      {erro && (
        <p className="mb-[20px] rounded-[12px] border border-red-500/20 bg-red-500/10 px-[20px] py-[16px] text-[14px] font-medium text-red-600">
          {erro instanceof Error ? erro.message : "Erro ao carregar o painel."}
        </p>
      )}

      {/* Alerta de loja que nao lancou */}
      {!carregando && pendentes.length > 0 && (
        <div className="cartao-caixa mb-[20px] flex items-start gap-[16px] rounded-[12px] border border-caixa-alerta/35 border-l-[6px] border-l-caixa-alerta bg-caixa-alerta-soft px-[16px] py-[18px] md:px-[24px] md:py-[20px]">
          <span className="mt-[6px] h-[12px] w-[12px] shrink-0 rounded-full bg-caixa-alerta" />
          <div className="flex flex-col gap-[8px]">
            <span className="text-[17px] font-bold leading-[1.3] text-caixa-alerta">
              {/* "hoje" so vale quando o dia na tela e hoje: navegando para
                  tras, a frase certa e sobre aquele dia, no passado. */}
              {ehPeriodoAtual
                ? pendentes.length === 1
                  ? "1 loja ainda não lançou o caixa de hoje"
                  : `${pendentes.length} lojas ainda não lançaram o caixa de hoje`
                : pendentes.length === 1
                  ? "1 loja não lançou o caixa deste dia"
                  : `${pendentes.length} lojas não lançaram o caixa deste dia`}
            </span>
            {/* Os nomes sao a acao: e para quem a gerencia vai cobrar. */}
            <div className="flex flex-wrap gap-[8px]">
              {pendentes.map((loja) => (
                <span
                  key={loja.id}
                  className="rounded-[8px] bg-caixa-surface px-[12px] py-[6px] text-[16px] font-semibold text-caixa-alerta"
                >
                  {loja.nome_loja}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* O painel responde duas perguntas: quanto deu, e quem ainda nao
          fechou. As duas ficam aqui, grandes. A divisao por forma de
          pagamento e consulta, nao manchete — desceu para os tiles. */}
      <section className="cartao-caixa mb-[16px] rounded-[12px] bg-caixa-total px-[18px] py-[20px] md:px-[28px] md:py-[24px] text-caixa-accent">
        {/* Grid com a coluna da direita ancorada, e nao justify-between: numa
            tela larga o espaco sobrando virava um vazio no meio do card. */}
        <div className="grid gap-[20px] md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[12px] font-semibold uppercase tracking-[0.6px]">
              {rotuloDoTotal}
            </span>
            <span className="text-[42px] font-bold leading-[1.05] tabular-nums">
              R$ {emReais(resumo.totais.total)}
            </span>
          </div>

          {resumo.linhas.length > 0 && (
            <div className="flex w-full flex-col gap-[10px] md:w-[300px] md:border-l md:border-caixa-accent/20 md:pl-[28px]">
              <span className="text-[13px] font-medium">
                {resumo.lojasComLancamento} de {resumo.linhas.length}{" "}
                {resumo.linhas.length === 1 ? "loja fechou" : "lojas fecharam"}
              </span>
              {/* Um traco por loja: da para ver de longe quanto falta, sem ler. */}
              <div className="flex gap-[4px]">
                {resumo.linhas.map((linha) => (
                  <span
                    key={linha.lojaId}
                    title={linha.lojaNome}
                    className={`h-[6px] flex-1 rounded-full ${
                      linha.status.tipo === "AUSENTE"
                        ? "bg-caixa-accent/20"
                        : "bg-caixa-accent"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Os cinco somam o total, na tela e na tabela. A retirada nao tem tile
          proprio: ela sai do dinheiro e continua sendo dinheiro da empresa, so
          na mao do dono — separa-la contaria a mesma venda duas vezes. A
          despesa tem, porque esse dinheiro nao esta mais em caixa. */}
      <div className="mb-[20px] grid grid-cols-2 gap-[16px] md:grid-cols-3 xl:grid-cols-5">
        {/* Dinheiro na frente: e o unico que passa pela gaveta, e o unico que
            some sem deixar rastro. O resto a maquininha e o banco conferem. */}
        <Kpi rotulo="DINHEIRO" valor={resumo.totais.dinheiro} />
        <Kpi rotulo="PIX" valor={resumo.totais.pix} />
        <Kpi rotulo="CARTÃO" valor={resumo.totais.cartao} />
        <Kpi rotulo="LINK DE PAGAMENTO" valor={resumo.totais.linkPagamento} />
        <Kpi rotulo="DESPESAS" valor={resumo.totais.despesas} />
      </div>

      {/* Tabela por loja */}
      <div className="cartao-caixa-grande rounded-[12px] border border-caixa-border bg-caixa-surface">
        <div className="flex flex-wrap items-center gap-[8px] border-b border-caixa-border px-[16px] py-[14px] md:px-[24px] md:py-[16px]">
          {/* Sempre na tela: num domingo e ele que mostra, em letra, que
              aquele caixa e do turno de domingo. */}
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
              className={`rounded-[8px] border px-[14px] py-[7px] text-[14px] font-medium transition ${
                turnoEfetivo === valor
                  ? "border-caixa-accent bg-caixa-accent-soft text-caixa-accent"
                  : "border-caixa-border bg-caixa-surface text-caixa-muted hover:text-caixa-ink"
              }`}
            >
              {rotulo}
            </button>
          ))}

          {/* A tela se atualiza sozinha a cada 30s; dizer quando foi a
              ultima vez evita a duvida de "sera que ja chegou?". */}
          <span className="ml-auto flex items-center gap-[10px] text-[13px] text-caixa-muted">
            {fechamentos.isFetching ? (
              "Atualizando..."
            ) : (
              <>
                Atualizado às{" "}
                {new Date(fechamentos.dataUpdatedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <button
                  type="button"
                  onClick={() => fechamentos.refetch()}
                  className="underline-offset-4 transition hover:text-caixa-ink hover:underline"
                >
                  Atualizar
                </button>
              </>
            )}
          </span>

          {/* Conferir a noite inteira significa abrir loja por loja; um
              controle so evita quatro cliques antes do primeiro. */}
          {podeAbrirDetalhe && comLancamento.length > 0 && (
            <button
              type="button"
              onClick={() => alternarTodas(comLancamento)}
              className="text-[13px] font-medium text-caixa-muted underline-offset-4 transition hover:text-caixa-ink hover:underline"
            >
              {abertas.length === comLancamento.length
                ? "Fechar todos os detalhes"
                : "Abrir todos os detalhes"}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <colgroup>
            <col className="w-[190px]" />
            <col className="w-[160px]" />
            <col className="w-[130px]" />
            <col className="w-[130px]" />
            <col className="w-[130px]" />
            <col className="w-[150px]" />
            <col className="w-[130px]" />
            <col className="w-[150px]" />
            <col className="w-[230px]" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 h-[47px] bg-caixa-faixa text-[11px] font-semibold tracking-[0.5px] text-caixa-muted">
              <th className="pl-[24px] font-semibold">LOJA</th>
              <th className="font-semibold">
                {visao === "DIARIO" ? "RESPONSÁVEL" : "LANÇAMENTOS"}
              </th>
              <th className="text-right font-semibold">DINHEIRO</th>
              <th className="text-right font-semibold">PIX</th>
              <th className="text-right font-semibold">CARTÃO</th>
              <th className="text-right font-semibold">LINK</th>
              <th className="text-right font-semibold">DESPESAS</th>
              <th className="text-right font-semibold">TOTAL</th>
              <th className="pl-[24px] pr-[24px] font-semibold">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr className="h-[61px] border-t border-caixa-border">
                <td colSpan={9} className="pl-[24px] text-[15px] text-caixa-muted">
                  Carregando lançamentos...
                </td>
              </tr>
            )}

            {!carregando && resumo.linhas.length === 0 && (
              <tr className="h-[61px] border-t border-caixa-border">
                <td colSpan={9} className="pl-[24px] text-[15px] text-caixa-muted">
                  Nenhuma loja ativa para mostrar.
                </td>
              </tr>
            )}

            {!carregando &&
              resumo.linhas.map((linha) => (
                <Linha
                  key={linha.lojaId}
                  linha={linha}
                  expansivel={podeAbrirDetalhe}
                  aberta={podeAbrirDetalhe && abertas.includes(linha.lojaId)}
                  aoAlternar={() => alternar(linha.lojaId)}
                />
              ))}
          </tbody>

          {!carregando && resumo.linhas.length > 0 && (
            <tfoot>
              <tr className="h-[56px] border-t border-caixa-border bg-caixa-faixa">
                <td className="pl-[24px] text-[15px] font-semibold">Total geral</td>
                <td className="text-[13px] text-caixa-muted">
                  {resumo.lojasComLancamento} de {resumo.linhas.length}{" "}
                  {resumo.linhas.length === 1 ? "loja" : "lojas"}
                </td>
                <td className="text-right text-[15px] tabular-nums">{emReais(resumo.totais.dinheiro)}</td>
                <td className="text-right text-[15px] tabular-nums">{emReais(resumo.totais.pix)}</td>
                <td className="text-right text-[15px] tabular-nums">{emReais(resumo.totais.cartao)}</td>
                <td className="text-right text-[15px] tabular-nums">
                  {emReais(resumo.totais.linkPagamento)}
                </td>
                <td className="text-right text-[15px] tabular-nums">
                  {emReais(resumo.totais.despesas)}
                </td>
                <td className="text-right text-[18px] font-bold tabular-nums">
                  R$ {emReais(resumo.totais.total)}
                </td>
                <td className="pr-[24px]" />
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </main>
  );
}

function Kpi({
  rotulo,
  valor,
  negativo = false,
}: {
  rotulo: string;
  valor: number;
  /** Saidas: dinheiro que deixou o caixa, entao aparece com sinal e em vermelho. */
  negativo?: boolean;
}) {
  return (
    <div className="cartao-caixa flex h-[78px] flex-col justify-center gap-[4px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-caixa-muted">
        {rotulo}
      </span>
      <span
        className={`text-[19px] font-semibold leading-[1.3] tabular-nums ${
          negativo && valor > 0 ? "text-caixa-danger" : "text-caixa-ink"
        }`}
      >
        {negativo && valor > 0 ? "− " : ""}R$ {emReais(valor)}
      </span>
    </div>
  );
}

function Linha({
  linha,
  expansivel,
  aberta,
  aoAlternar,
}: {
  linha: LinhaPainel;
  expansivel: boolean;
  aberta: boolean;
  aoAlternar: () => void;
}) {
  const vazia = linha.status.tipo === "AUSENTE";
  const clicavel = expansivel && !vazia;
  const celula = (valor: number) => (vazia ? "—" : emReais(valor));

  return (
    <>
    <tr
      className={`h-[61px] border-t border-caixa-border ${
        clicavel ? "cursor-pointer hover:bg-caixa-faixa" : ""
      } ${aberta ? "bg-caixa-accent-soft/40" : ""}`}
      onClick={clicavel ? aoAlternar : undefined}
    >
      <td
        className={`pl-[24px] text-[15px] ${
          aberta ? "font-semibold text-caixa-accent" : "font-medium"
        }`}
      >
        {!clicavel ? (
          linha.lojaNome
        ) : (
          <span className="inline-flex items-center gap-[8px]">
            {/* SVG e nao "▶": o caractere vira emoji colorido em alguns
                sistemas, e ai a seta aparece laranja no meio da tabela. */}
            <svg
              aria-hidden="true"
              width="8"
              height="10"
              viewBox="0 0 8 10"
              fill="none"
              className={`shrink-0 text-caixa-muted transition-transform ${
                aberta ? "rotate-90" : ""
              }`}
            >
              <path
                d="M1.5 1L6 5L1.5 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {linha.lojaNome}
          </span>
        )}
      </td>
      <td className="text-[15px] text-caixa-muted">{linha.detalhe}</td>
      <td className="text-right text-[15px] tabular-nums">{celula(linha.dinheiro)}</td>
      <td className="text-right text-[15px] tabular-nums">{celula(linha.pix)}</td>
      <td className="text-right text-[15px] tabular-nums">{celula(linha.cartao)}</td>
      <td className="text-right text-[15px] tabular-nums">{celula(linha.linkPagamento)}</td>
      <td className="text-right text-[15px] tabular-nums">{celula(linha.despesas)}</td>
      <td className="text-right text-[15px] font-medium tabular-nums">
        {vazia ? "—" : `R$ ${emReais(linha.total)}`}
      </td>
      <td className="pl-[24px] pr-[24px]">
        <span
          className={`inline-flex h-[29px] items-center gap-[7px] whitespace-nowrap rounded-full pl-[11px] pr-[12px] text-[12px] font-medium ${
            CORES_STATUS[linha.status.tipo]
          }`}
        >
          <span className="h-[7px] w-[7px] rounded-full bg-current" />
          {linha.status.texto}
        </span>
      </td>
    </tr>

    {aberta && (
      <tr className="bg-caixa-detalhe">
        <td colSpan={9} className="p-0">
          <div className="flex flex-col gap-[12px] border-l-[4px] border-caixa-accent px-[16px] py-[16px] md:px-[24px] md:py-[18px]">
            {linha.lancamentos.map((lancamento) => (
              <Detalhe key={lancamento.id} lancamento={lancamento} />
            ))}
          </div>
        </td>
      </tr>
    )}
    </>
  );
}

/** Um turno por extenso: o que a tabela nao cabe — quem retirou, a descricao
 *  da despesa e o desperdicio escrito pelo funcionario.
 *
 *  A cor aqui diz de que natureza e a linha, nao so decora: retirada e despesa
 *  sao dinheiro saindo do caixa (vermelho, igual a coluna SAIDAS da tabela) e
 *  desperdicio e perda de produto (ambar) — coisas diferentes, que a gerencia
 *  cobra de gente diferente. */
function Detalhe({ lancamento }: { lancamento: FechamentoLido }) {
  const conferir = useConferirFechamento();

  const hora = new Date(lancamento.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const limpo =
    !lancamento.houve_retirada &&
    lancamento.despesas.length === 0 &&
    !lancamento.houve_devolucao &&
    !lancamento.houve_desperdicio &&
    lancamento.desperdicios.length === 0;

  return (
    <div
      className={`overflow-hidden rounded-[10px] border bg-caixa-surface ${
        lancamento.conferido
          ? "border-caixa-accent/40"
          : "border-caixa-border"
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-[12px] bg-caixa-faixa px-[16px] py-[12px] ${
          limpo ? "" : "border-b border-caixa-border"
        }`}
      >
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="rounded-[6px] bg-caixa-ink px-[10px] py-[4px] text-[11px] font-bold uppercase tracking-[0.6px] text-white">
            {rotuloDoPeriodo(lancamento.periodo)}
          </span>
          <span className="text-[14px] font-semibold text-caixa-ink">
            {lancamento.nome_funcionario}
          </span>
          <span className="text-[13px] text-caixa-muted">lançou às {hora}</span>
          {limpo && (
            <span className="text-[13px] text-caixa-muted">· sem ocorrências</span>
          )}
        </div>

        {lancamento.conferido ? (
          <span className="inline-flex items-center gap-[6px] rounded-full bg-caixa-accent-soft px-[12px] py-[6px] text-[12px] font-semibold text-caixa-accent">
            <span className="h-[6px] w-[6px] rounded-full bg-caixa-accent" />
            Conferido
            {lancamento.conferido_por_nome ? ` por ${lancamento.conferido_por_nome}` : ""}
          </span>
        ) : (
          <button
            type="button"
            disabled={conferir.isPending}
            onClick={() => conferir.mutate(lancamento.id)}
            className="rounded-[8px] bg-caixa-accent px-[14px] py-[7px] text-[13px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {conferir.isPending ? "Marcando..." : "Conferir"}
          </button>
        )}
      </div>

      {!limpo && (
      <div className="flex flex-col gap-[2px] px-[16px] py-[12px]">
        {lancamento.houve_retirada && (
          <Item cor="saida" rotulo="Retirada" valor={lancamento.valor_retirado}>
            {lancamento.responsavel_retirada_nome ?? "—"}
          </Item>
        )}
        {/* Uma linha por gasto: gas e agua do mesmo turno sao duas despesas.
            Antes cabia uma so, e o resto ia empilhado no campo de texto. */}
        {lancamento.despesas.map((despesa) => (
          <Item key={despesa.id} cor="saida" rotulo="Despesa" valor={despesa.valor}>
            {despesa.descricao}
          </Item>
        ))}
        {lancamento.houve_devolucao && (
          <Item cor="perda" rotulo="Devolução" valor={lancamento.devolucao_valor}>
            Dinheiro devolvido ao cliente
          </Item>
        )}
        {lancamento.houve_desperdicio && (
          <Item cor="perda" rotulo="Desperdício">
            {lancamento.desperdicio_detalhes}
          </Item>
        )}
        {/* O desperdicio por item, o que substituiu a pergunta de texto
            livre acima: uma linha por item do catalogo perdido, em
            unidades — nao em dinheiro, entao sem `valor` (que o Item
            formataria em R$). */}
        {lancamento.desperdicios.map((linha) => (
          <Item key={linha.id} cor="perda" rotulo="Desperdício">
            {linha.nome} ({linha.categoria_nome}) — {linha.quantidade} un
          </Item>
        ))}
        {lancamento.editado_por_nome && (
          <Item cor="neutro" rotulo="Corrigido por">
            {lancamento.editado_por_nome}
          </Item>
        )}
      </div>
      )}
    </div>
  );
}

const CORES_ITEM = {
  saida: { ponto: "bg-caixa-danger", rotulo: "text-caixa-danger" },
  perda: { ponto: "bg-caixa-warn", rotulo: "text-caixa-warn" },
  neutro: { ponto: "bg-caixa-muted", rotulo: "text-caixa-muted" },
} as const;

function Item({
  cor,
  rotulo,
  valor,
  children,
}: {
  cor: keyof typeof CORES_ITEM;
  rotulo: string;
  valor?: string | null;
  children: React.ReactNode;
}) {
  const { ponto, rotulo: corDoRotulo } = CORES_ITEM[cor];

  return (
    <div className="flex items-baseline gap-[10px] border-b border-caixa-border/60 py-[8px] last:border-b-0">
      <span className={`mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full ${ponto}`} />
      <span className={`w-[100px] shrink-0 text-[13px] font-semibold ${corDoRotulo}`}>
        {rotulo}
      </span>
      {/* Largura de leitura: texto livre corrido em 1300px cansa o olho e faz
          perder a linha na volta. */}
      <span className="min-w-0 max-w-[70ch] flex-1 text-[14px] leading-[1.55] text-caixa-ink">
        {children}
      </span>
      {valor != null && (
        <span className="ml-auto shrink-0 pl-[16px] text-[14px] font-semibold tabular-nums text-caixa-danger">
          − R$ {emReais(Number(valor))}
        </span>
      )}
    </div>
  );
}

