"use client";

import { useEffect, useRef, useState } from "react";

import {
  hojeISO,
  inicioDaSemana,
  mesDe,
  rotuloDoMes,
  somarDias,
  somarMeses,
} from "../painel-dados";

/**
 * A navegacao de periodo das quatro telas do painel.
 *
 * As setas sozinhas resolviam "ontem" e nao resolviam "o domingo retrasado":
 * chegar la custava dez cliques, e no meio do caminho a tela recarregava a cada
 * passo. O rotulo virou botao — clicar nele abre o calendario e o salto e um
 * clique so.
 *
 * Nasceu de quatro copias identicas deste bloco (/fechamentos, /por-loja,
 * /saidas, /graficos). Elas ja tinham comecado a divergir na largura minima;
 * era questao de tempo ate divergirem no comportamento.
 */

export type ModoDoPeriodo = "DIA" | "SEMANA" | "MES";

type Props = {
  modo: ModoDoPeriodo;
  /** Dia ISO (2026-08-31) nos modos DIA e SEMANA; mes ISO (2026-08) no MES. */
  valor: string;
  rotulo: string;
  /** "Hoje", "Atual", "Este mês" — ou null quando nao e o periodo de agora. */
  distintivo?: string | null;
  /** O atalho de volta, que so aparece quando ha de onde voltar. */
  atalho?: { rotulo: string; aoClicar: () => void };
  aoAndar: (direcao: 1 | -1) => void;
  aoEscolher: (valor: string) => void;
};

const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

// A semana comercial da loja comeca na segunda (ver inicioDaSemana), entao o
// domingo fecha a linha — e cada linha da grade e exatamente uma semana, que e
// o que faz o modo SEMANA poder acender a linha inteira.
const DIAS_DA_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/** Seis linhas sempre: com cinco, o calendario mudava de altura ao virar o mes
 *  e o rodape pulava embaixo do ponteiro. */
export const diasDaGrade = (mesISO: string) => {
  const primeiro = inicioDaSemana(`${mesISO}-01`);
  return Array.from({ length: 42 }, (_, i) => somarDias(primeiro, i));
};

const numeroDoDia = (dataISO: string) => Number(dataISO.slice(8, 10));

export function BarraDoPeriodo({
  modo,
  valor,
  rotulo,
  distintivo = null,
  atalho,
  aoAndar,
  aoEscolher,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const fechar = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
    // Escape devolve o foco ao gatilho: quem abriu pelo teclado ficaria
    // perdido no fim do documento se o foco morresse junto com o calendario.
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAberto(false);
        gatilho.current?.focus();
      }
    };

    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", teclado);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", teclado);
    };
  }, [aberto]);

  const escolher = (novo: string) => {
    aoEscolher(novo);
    setAberto(false);
    gatilho.current?.focus();
  };

  return (
    // No celular a barra ocupa a linha inteira e o atalho vai para o lado:
    // lado a lado, os dois passavam de 300px numa tela de 390 e a barra saia
    // pela direita, levando o calendario junto.
    <div className="flex w-full flex-wrap items-center justify-end gap-[10px] md:w-auto md:flex-nowrap">
      {atalho && (
        <button
          type="button"
          onClick={atalho.aoClicar}
          className="h-[45px] shrink-0 whitespace-nowrap rounded-[10px] border border-caixa-border bg-caixa-surface px-[16px] text-[14px] font-medium text-caixa-muted transition hover:text-caixa-ink"
        >
          {atalho.rotulo}
        </button>
      )}

      <div ref={caixa} className="relative w-full md:w-auto">
        <div className="flex min-h-[45px] items-center justify-between gap-[6px] rounded-[10px] border border-caixa-border bg-caixa-surface px-[10px] md:h-[45px] md:min-w-[300px] md:whitespace-nowrap">
          <button
            type="button"
            onClick={() => aoAndar(-1)}
            aria-label="Período anterior"
            className="rounded-[8px] px-[6px] text-[18px] leading-none text-caixa-muted transition hover:text-caixa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
          >
            ‹
          </button>

          <button
            ref={gatilho}
            type="button"
            onClick={() => setAberto((estava) => !estava)}
            aria-haspopup="dialog"
            aria-expanded={aberto}
            className="flex flex-1 items-center justify-center gap-[10px] rounded-[8px] px-[8px] py-[6px] text-center text-[14px] leading-[1.4] md:text-[15px] transition hover:bg-caixa-faixa focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
          >
            {rotulo}
            {distintivo && (
              <span className="rounded-full bg-caixa-accent-soft px-[10px] py-[3px] text-[12px] font-semibold text-caixa-accent">
                {distintivo}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => aoAndar(1)}
            aria-label="Próximo período"
            className="rounded-[8px] px-[6px] text-[18px] leading-none text-caixa-muted transition hover:text-caixa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
          >
            ›
          </button>
        </div>

        {aberto &&
          (modo === "MES" ? (
            <GradeDeMeses mesISO={valor} aoEscolher={escolher} />
          ) : (
            <GradeDeDias diaISO={valor} porSemana={modo === "SEMANA"} aoEscolher={escolher} />
          ))}
      </div>
    </div>
  );
}

function GradeDeDias(props: {
  diaISO: string;
  porSemana: boolean;
  aoEscolher: (dia: string) => void;
}) {
  return (
    <Popover rotulo="Escolher dia">
      <CalendarioDeDias {...props} />
    </Popover>
  );
}

/**
 * O calendario do mes, sem a moldura do popover.
 *
 * Separado para a exportacao poder mostrar o mesmo calendario dentro do
 * proprio painel dela: dois calendarios desenhados a mao iam divergir no dia
 * em que alguem mexesse na semana que comeca na segunda.
 *
 * No modo semana a linha inteira acende, porque e ela que a tela vai mostrar —
 * clicar numa quarta abre a semana da quarta.
 */
export function CalendarioDeDias({
  diaISO,
  porSemana,
  aoEscolher,
  diaDesabilitado,
  tomDoDia,
  aoTrocarDeMes,
}: {
  diaISO: string;
  porSemana: boolean;
  aoEscolher: (dia: string) => void;
  /** Dias que nao dao para escolher. Sem a prop, todos dao — e o caso da barra
   *  de periodo, que navega por qualquer dia do historico. */
  diaDesabilitado?: (dia: string) => boolean;
  /** Pinta o dia inteiro, para quem precisa dizer algo sobre ele sem escrever
   *  nada dentro da celula — sao 34px, nao cabe texto.
   *
   *  Comecou como um ponto de 4px sob o numero e nao servia: com 42 celulas na
   *  grade, achar as bolinhas dava mais trabalho que abrir dia por dia. O
   *  fundo se le de uma vez, o mes inteiro num relance.
   *
   *  Apresentacional de proposito: o calendario nao sabe o que "alerta" quer
   *  dizer, so com que peso pintar. Os tres tons sao os mesmos pares de cor
   *  que os pills de status do painel ja usam. */
  tomDoDia?: (dia: string) => "ok" | "atencao" | "alerta" | null;
  /** Avisa quem folheou para outro mes. Sem a prop, o mes visitado continua
   *  sendo assunto so daqui. */
  aoTrocarDeMes?: (mes: string) => void;
}) {
  // O mes visitado e estado proprio: folhear ate marco e voltar sem escolher
  // nada nao pode mexer no que a tela esta mostrando.
  const [mes, setMes] = useState(() => mesDe(diaISO));
  const hoje = hojeISO();
  const semanaEscolhida = inicioDaSemana(diaISO);

  const folhear = (novo: string) => {
    setMes(novo);
    aoTrocarDeMes?.(novo);
  };

  return (
    <>
      <Cabecalho
        titulo={rotuloDoMes(mes)}
        aoVoltar={() => folhear(somarMeses(mes, -1))}
        aoAvancar={() => folhear(somarMeses(mes, 1))}
        rotuloVoltar="Mês anterior"
        rotuloAvancar="Próximo mês"
      />

      <div className="mb-[4px] grid grid-cols-7 gap-[2px]">
        {DIAS_DA_SEMANA.map((dia) => (
          <span
            key={dia}
            className="py-[4px] text-center text-[11px] font-semibold uppercase tracking-[0.4px] text-caixa-muted"
          >
            {dia}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[2px]">
        {diasDaGrade(mes).map((dia) => {
          const escolhido = porSemana
            ? inicioDaSemana(dia) === semanaEscolhida
            : dia === diaISO;
          const doMes = mesDe(dia) === mes;
          const bloqueado = diaDesabilitado?.(dia) ?? false;
          const tom = tomDoDia?.(dia) ?? null;

          return (
            <button
              key={dia}
              type="button"
              onClick={() => aoEscolher(dia)}
              disabled={bloqueado}
              aria-pressed={escolhido}
              aria-current={dia === hoje ? "date" : undefined}
              // A semana inteira em verde solido eram sete blocos gritando
              // dentro de um popover pequeno; no fundo suave ela continua
              // obvia e ainda deixa o anel de "hoje" aparecer por baixo.
              className={`relative h-[34px] rounded-[8px] text-[14px] tabular-nums transition ${
                bloqueado
                  ? "cursor-not-allowed text-caixa-muted/35"
                  : escolhido && porSemana
                    ? "bg-caixa-accent-soft font-semibold text-caixa-accent"
                    : escolhido
                      ? "bg-caixa-accent font-semibold text-white"
                      : tom === "ok"
                        ? "bg-caixa-accent-soft font-medium text-caixa-accent"
                        : tom === "atencao"
                          ? "bg-caixa-warn-soft font-medium text-caixa-warn"
                          : tom === "alerta"
                            ? "bg-caixa-danger-soft font-semibold text-caixa-danger"
                            : doMes
                              ? "text-caixa-ink hover:bg-caixa-faixa"
                              : "text-caixa-muted/60 hover:bg-caixa-faixa"
              } ${
                dia === hoje && !(escolhido && !porSemana) && !bloqueado
                  ? "ring-1 ring-inset ring-caixa-accent/40"
                  : ""
              } ${
                dia === hoje && !escolhido && !bloqueado && !tom
                  ? "font-semibold text-caixa-accent"
                  : ""
              }`}
            >
              {numeroDoDia(dia)}
            </button>
          );
        })}
      </div>
    </>
  );
}

function GradeDeMeses(props: {
  mesISO: string;
  aoEscolher: (mes: string) => void;
}) {
  return (
    <Popover rotulo="Escolher mês">
      <CalendarioDeMeses {...props} />
    </Popover>
  );
}

/** Doze botoes e um ano: no modo mensal nao ha dia para escolher, e uma grade
 *  de dias so pediria uma informacao que a tela ia jogar fora. */
export function CalendarioDeMeses({
  mesISO,
  aoEscolher,
}: {
  mesISO: string;
  aoEscolher: (mes: string) => void;
}) {
  const [ano, setAno] = useState(() => Number(mesISO.slice(0, 4)));
  const mesDeHoje = mesDe(hojeISO());

  return (
    <>
      <Cabecalho
        titulo={String(ano)}
        aoVoltar={() => setAno(ano - 1)}
        aoAvancar={() => setAno(ano + 1)}
        rotuloVoltar="Ano anterior"
        rotuloAvancar="Próximo ano"
      />

      <div className="grid grid-cols-3 gap-[6px]">
        {MESES.map((nome, indice) => {
          const valor = `${ano}-${String(indice + 1).padStart(2, "0")}`;
          const escolhido = valor === mesISO;

          return (
            <button
              key={valor}
              type="button"
              onClick={() => aoEscolher(valor)}
              aria-pressed={escolhido}
              className={`h-[38px] rounded-[8px] text-[14px] capitalize transition ${
                escolhido
                  ? "bg-caixa-accent font-semibold text-white"
                  : "text-caixa-ink hover:bg-caixa-faixa"
              } ${
                valor === mesDeHoje && !escolhido
                  ? "font-semibold text-caixa-accent ring-1 ring-inset ring-caixa-accent/40"
                  : ""
              }`}
            >
              {nome}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Popover({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={rotulo}
      // Alinhado a direita: a barra vive no canto direito da toolbar, e abrir
      // pela esquerda jogaria o calendario para fora da tela em 1440px.
      className="absolute right-0 top-[52px] z-30 w-[292px] max-w-full rounded-[12px] border border-caixa-border bg-caixa-surface p-[14px] shadow-[0_1px_2px_rgba(26,26,23,.06),0_18px_40px_-16px_rgba(26,26,23,.35)]"
    >
      {children}
    </div>
  );
}

function Cabecalho({
  titulo,
  aoVoltar,
  aoAvancar,
  rotuloVoltar,
  rotuloAvancar,
}: {
  titulo: string;
  aoVoltar: () => void;
  aoAvancar: () => void;
  rotuloVoltar: string;
  rotuloAvancar: string;
}) {
  const seta =
    "rounded-[8px] px-[8px] py-[2px] text-[17px] leading-none text-caixa-muted transition hover:bg-caixa-faixa hover:text-caixa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent";

  return (
    <div className="mb-[10px] flex items-center justify-between gap-[8px]">
      <button type="button" onClick={aoVoltar} aria-label={rotuloVoltar} className={seta}>
        ‹
      </button>
      {/* Sem `capitalize`: o rotulo ja vem pronto, e a classe transformaria
          "Agosto de 2026" em "Agosto De 2026". */}
      <span className="text-[14px] font-semibold text-caixa-ink">{titulo}</span>
      <button type="button" onClick={aoAvancar} aria-label={rotuloAvancar} className={seta}>
        ›
      </button>
    </div>
  );
}
