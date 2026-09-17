"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TurnoEditavel } from "@/features/fechamento/components/TurnoEditavel";
import {
  emReais,
  hojeISO,
  rotuloDoDia,
  rotuloDoPeriodo,
  somarDias,
} from "@/features/fechamento/painel-dados";
import {
  useCancelarFechamentoDoPainel,
  useConferirFechamento,
  useEditarFechamento,
  useFechamentosDoPainel,
  useLojasDoPainel,
  useQuemConsomeDoPainel,
  useResponsaveisDoPainel,
} from "@/features/fechamento/hooks/usePainel";
import { BarraDoPeriodo } from "@/features/fechamento/components/BarraDoPeriodo";
import type { FechamentoLido } from "@/features/fechamento/services/painel";

// "DOMINGO" e "DIA" nunca convivem com manha/tarde no mesmo dia — sao o turno
// unico de domingo e de feriado. Entram no mapa para nao virar NaN na
// ordenacao.
const ORDEM_DOS_TURNOS = { MANHA: 0, TARDE: 1, DOMINGO: 2, DIA: 3 } as const;

/**
 * Correcao por loja.
 *
 * O painel responde "o que falta e quanto deu"; esta tela responde "este
 * numero esta errado, conserta". Sao dois modos de olhar diferentes o
 * bastante para nao caberem na mesma tabela: aqui a loja e a unidade, e cada
 * turno dela abre inteiro, com os campos do formulario editaveis no lugar —
 * sem abrir outra tela, do mesmo jeito que a tela de estoque faz.
 */
export default function PorLojaPage() {
  const [dia, setDia] = useState(hojeISO);
  const [lojaEscolhida, setLojaEscolhida] = useState<string | null>(null);

  const lojas = useLojasDoPainel();
  const fechamentos = useFechamentosDoPainel("DIARIO", dia);
  const responsaveis = useResponsaveisDoPainel();
  const quemConsome = useQuemConsomeDoPainel();
  const editar = useEditarFechamento();
  const conferir = useConferirFechamento();
  const cancelar = useCancelarFechamentoDoPainel();

  // Quais turnos estao com edicao em aberto. Trocar de loja ou de dia monta
  // cartoes novos e joga fora o que foi digitado — com o salvamento no botao,
  // isso deixou de ser inofensivo, entao a troca passa a pedir confirmacao.
  const [pendentes, setPendentes] = useState<ReadonlySet<string>>(new Set());
  const [trocaEmEspera, setTrocaEmEspera] = useState<{
    rotulo: string;
    aplicar: () => void;
  } | null>(null);

  const registrarPendencia = useCallback((id: string, pendente: boolean) => {
    setPendentes((atual) => {
      if (atual.has(id) === pendente) return atual;
      const proximo = new Set(atual);
      if (pendente) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }, []);

  const temPendencia = pendentes.size > 0;

  const pedirTroca = (rotulo: string, aplicar: () => void) => {
    if (!temPendencia) {
      aplicar();
      return;
    }
    setTrocaEmEspera({ rotulo, aplicar });
  };

  // Fechar a aba nao passa pela confirmacao acima; o navegador tem a dele.
  useEffect(() => {
    if (!temPendencia) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [temPendencia]);

  const porLoja = useMemo(() => {
    const mapa = new Map<string, FechamentoLido[]>();
    for (const fechamento of fechamentos.data ?? []) {
      const lista = mapa.get(fechamento.loja) ?? [];
      lista.push(fechamento);
      mapa.set(fechamento.loja, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort(
        (a, b) => ORDEM_DOS_TURNOS[a.periodo] - ORDEM_DOS_TURNOS[b.periodo],
      );
    }
    return mapa;
  }, [fechamentos.data]);

  // Sem escolha explicita, a primeira loja da lista: abrir numa tela vazia
  // esconderia o que a pagina faz.
  const lojaAtiva = lojaEscolhida ?? (lojas.data ?? [])[0]?.id ?? null;
  const lojaAtivaNome =
    (lojas.data ?? []).find((loja) => loja.id === lojaAtiva)?.nome_loja ?? "";
  const turnosDaLoja = lojaAtiva ? (porLoja.get(lojaAtiva) ?? []) : [];

  const hoje = hojeISO();
  const carregando = lojas.isPending || fechamentos.isPending;
  const erro = lojas.error ?? fechamentos.error;

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] md:px-[40px] pb-[60px]">
      <div className="flex flex-wrap items-center justify-between gap-[16px] py-[28px]">
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[22px] font-bold leading-[1.2]">Corrigir por loja</h1>
          <p className="text-[14px] leading-[1.4] text-caixa-muted">
            Abra o turno, ajuste os valores e salve a correção.
          </p>
        </div>

        {/* Trocar de dia com edicao aberta passa pela confirmacao — inclusive
            pelo calendario, que e o jeito mais rapido de pular longe e perder
            o que estava sendo corrigido. */}
        <BarraDoPeriodo
          modo="DIA"
          valor={dia}
          rotulo={rotuloDoDia(dia)}
          distintivo={dia === hoje ? "Hoje" : null}
          atalho={
            dia === hoje
              ? undefined
              : {
                  rotulo: "Ir para hoje",
                  aoClicar: () => pedirTroca("Ir para hoje", () => setDia(hoje)),
                }
          }
          aoAndar={(direcao) =>
            pedirTroca("Trocar de dia", () => setDia(somarDias(dia, direcao)))
          }
          aoEscolher={(escolhido) =>
            pedirTroca("Trocar de dia", () => setDia(escolhido))
          }
        />
      </div>

      {erro && (
        <p className="mb-[20px] rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px] text-[14px] font-medium text-caixa-alerta">
          {erro instanceof Error ? erro.message : "Erro ao carregar as lojas."}
        </p>
      )}

      {trocaEmEspera && (
        <div
          role="alertdialog"
          aria-labelledby="aviso-troca"
          className="mb-[20px] flex flex-wrap items-center justify-between gap-[14px] rounded-[12px] border border-caixa-warn/35 bg-caixa-warn-soft px-[20px] py-[16px]"
        >
          <p id="aviso-troca" className="text-[14px] leading-[1.4] text-caixa-ink">
            Há alterações não salvas nesta tela.{" "}
            <span className="font-semibold">{trocaEmEspera.rotulo}</span> vai
            descartá-las.
          </p>
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              autoFocus
              onClick={() => setTrocaEmEspera(null)}
              className="rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] py-[9px] text-[14px] font-semibold text-caixa-ink transition hover:border-caixa-accent/40"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={() => {
                const { aplicar } = trocaEmEspera;
                setTrocaEmEspera(null);
                setPendentes(new Set());
                aplicar();
              }}
              className="rounded-[10px] border border-caixa-warn/40 px-[16px] py-[9px] text-[14px] font-medium text-caixa-warn transition hover:bg-caixa-warn/10"
            >
              Descartar e {trocaEmEspera.rotulo.toLowerCase()}
            </button>
          </div>
        </div>
      )}

      {/* Os cards sao o seletor: cada um ja mostra o que a loja fez no dia,
          entao a escolha e informada em vez de as cegas. */}
      <div className="mb-[28px] grid gap-[12px] sm:grid-cols-2 lg:grid-cols-4">
        {(lojas.data ?? []).map((loja) => {
          const turnos = porLoja.get(loja.id) ?? [];
          // `total` e a liquidez bruta: ele ja soma de volta a retirada e as
          // despesas, porque as duas sairam da gaveta depois da venda.
          const total = turnos.reduce((soma, f) => soma + Number(f.total ?? 0), 0);
          const ativa = loja.id === lojaAtiva;

          return (
            <button
              key={loja.id}
              type="button"
              aria-pressed={ativa}
              onClick={() => {
                if (ativa) return;
                pedirTroca("Trocar de loja", () => setLojaEscolhida(loja.id));
              }}
              className={`cartao-caixa flex flex-col gap-[10px] rounded-[12px] border p-[18px] text-left transition ${
                ativa
                  ? "border-caixa-accent bg-caixa-accent-soft"
                  : "border-caixa-border bg-caixa-surface hover:border-caixa-accent/40"
              }`}
            >
              <span className="text-[16px] font-semibold leading-[1.25]">
                {loja.nome_loja}
              </span>

              <span
                className={`text-[20px] font-bold leading-[1.2] tabular-nums ${
                  turnos.length === 0 ? "text-caixa-muted" : ""
                }`}
              >
                {turnos.length === 0 ? "—" : `R$ ${emReais(total)}`}
              </span>

              <span className="flex flex-wrap gap-[6px]">
                {turnos.length === 0 ? (
                  <span className="rounded-full bg-caixa-alerta-soft px-[10px] py-[3px] text-[12px] font-semibold text-caixa-alerta">
                    Sem lançamento
                  </span>
                ) : (
                  turnos.map((turno) => (
                    <span
                      key={turno.id}
                      className={`rounded-full px-[10px] py-[3px] text-[12px] font-medium ${
                        turno.conferido
                          ? "bg-caixa-accent text-white"
                          : "bg-caixa-faixa text-caixa-muted"
                      }`}
                    >
                      {rotuloDoPeriodo(turno.periodo)}
                      {turno.conferido && " ✓"}
                    </span>
                  ))
                )}
              </span>
            </button>
          );
        })}
      </div>

      {carregando ? (
        <p className="rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px] md:py-[20px] text-[15px] text-caixa-muted">
          Carregando lançamentos...
        </p>
      ) : turnosDaLoja.length === 0 ? (
        <p className="rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px] md:py-[20px] text-[15px] leading-[1.5] text-caixa-muted">
          {lojaAtivaNome
            ? `${lojaAtivaNome} não lançou nada neste dia. Não há valores para corrigir — quem lança é a loja, pelo formulário.`
            : "Nenhuma loja cadastrada nesta conta."}
        </p>
      ) : (
        <div className="flex flex-col gap-[20px]">
          {turnosDaLoja.map((turno) => (
            <TurnoEditavel
              // A chave inclui o dia e a loja para que trocar de card monte
              // um cartao novo, com os campos zerados do turno certo, em vez
              // de reaproveitar o estado do anterior.
              key={`${dia}-${turno.id}`}
              fechamento={turno}
              responsaveis={responsaveis.data ?? []}
              quemConsome={quemConsome.data ?? []}
              onSalvar={(id, campos) => editar.mutateAsync({ id, campos })}
              onConferir={(id) => conferir.mutate(id)}
              conferindo={conferir.isPending && conferir.variables === turno.id}
              onCancelar={(id) => cancelar.mutateAsync(id)}
              onPendencia={registrarPendencia}
            />
          ))}
        </div>
      )}
    </main>
  );
}
