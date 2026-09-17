"use client";

import { useEffect, useRef, useState } from "react";

import {
  CalendarioDeDias,
  CalendarioDeMeses,
  type ModoDoPeriodo,
} from "@/features/fechamento/components/BarraDoPeriodo";
import {
  fimDaSemana,
  fimDoMes,
  hojeISO,
  inicioDaSemana,
  inicioDoMes,
  mesDe,
  rotuloDaSemana,
  rotuloDoDia,
  rotuloDoMes,
} from "@/features/fechamento/painel-dados";
import { baixarPlanilhaDoPeriodo } from "@/features/fechamento/services/painel";

const MODOS: { valor: ModoDoPeriodo; rotulo: string }[] = [
  { valor: "DIA", rotulo: "Dia" },
  { valor: "SEMANA", rotulo: "Semana" },
  { valor: "MES", rotulo: "Mês" },
];

/** As quatro abas do arquivo, na ordem em que aparecem nele. Espelham
 *  app/api/v1/views/planilha.py. */
const ABAS = ["Entradas", "Saídas", "Consumo por pessoa", "Consumo"];

/**
 * Leva um periodo para uma planilha.
 *
 * A dona fecha o mes no Excel — o desconto em folha e a conversa com o contador
 * acontecem la. O arquivo sai com quatro abas (Entradas, Saidas, Consumo por
 * pessoa e Consumo) porque as tres coisas tem grao diferente: numa tabela so,
 * arrastar a soma pela coluna de valor misturaria o caixa da loja com o lanche
 * de quem trabalha nela.
 *
 * Mora na topbar, e nao na toolbar das telas. O arquivo e o mesmo nas quatro
 * telas do painel: colado na navegacao de periodo ele prometia exportar "o que
 * esta na tela", que nunca foi o que ele faz — o fechamento do mes acontece
 * depois que o mes acabou, entao o periodo se escolhe aqui dentro. Sem uma tela
 * para herdar, ele abre no mes corrente, que e o do fechamento.

 */
export function BotaoDeExportar({ className = "" }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<ModoDoPeriodo>("MES");
  const [dia, setDia] = useState(hojeISO);
  const [mes, setMes] = useState(() => mesDe(hojeISO()));
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const fechar = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    };
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

  const abrir = () => {
    // Volta para o mes corrente a cada abertura, e nao para o que ficou da vez
    // passada: quem baixou marco em abril e volta em maio quer maio, nao marco.
    setModo("MES");
    setDia(hojeISO());
    setMes(mesDe(hojeISO()));
    setErro(null);
    setAberto(true);
  };

  const { de, ate } =
    modo === "DIA"
      ? { de: dia, ate: dia }
      : modo === "SEMANA"
        ? { de: inicioDaSemana(dia), ate: fimDaSemana(dia) }
        : { de: inicioDoMes(mes), ate: fimDoMes(mes) };

  const rotuloDoPeriodo =
    modo === "DIA"
      ? rotuloDoDia(dia)
      : modo === "SEMANA"
        ? rotuloDaSemana(dia)
        : rotuloDoMes(mes);

  const exportar = async () => {
    setBaixando(true);
    setErro(null);
    try {
      await baixarPlanilhaDoPeriodo(de, ate);
      setAberto(false);
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível exportar.",
      );
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div ref={caixa} className={`relative ${className}`}>
      {/* Contornado em verde, e nao o pill cheio das abas: na topbar ele fica
          encostado na navegacao, e com o mesmo tratamento delas viraria um
          quinto destino em vez de uma acao. No celular perde o rotulo e fica
          quadrado — a tira de abas do icone ja diz planilha. */}
      <button
        ref={gatilho}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label="Exportar planilha"
        className="flex h-[38px] w-[38px] items-center justify-center gap-[8px] rounded-[10px] border border-caixa-accent/25 text-[14px] font-semibold text-caixa-accent transition hover:bg-caixa-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent md:w-auto md:px-[14px]"
      >
        <IconeDePlanilha />
        <span className="hidden md:inline">Planilha</span>
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Exportar planilha"
          // Alinhado a direita porque o gatilho vive no canto direito da
          // topbar. Mais estreito no celular para nao passar da borda esquerda
          // da tela quando abre a partir de um botao de 38px.
          //
          // O teto de altura nao e enfeite: o `overflow-x: hidden` do body
          // (globals.css) faz dele um container de rolagem, e o que passa da
          // altura do documento e cortado sem deixar rolar ate la. Num celular
          // deitado isso comia justamente o "Baixar planilha". Preso ao dvh, o
          // painel rola por dentro em vez de sumir por fora.
          className="painel-exportar absolute right-0 top-[calc(100%+8px)] z-40 max-h-[calc(100dvh-140px)] w-[300px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-[12px] border border-caixa-border bg-caixa-surface p-[14px] shadow-[0_1px_2px_rgba(26,26,23,.06),0_18px_40px_-16px_rgba(26,26,23,.35)] md:w-[360px]"
        >
          <div className="mb-[12px] flex gap-[4px] rounded-[10px] border border-caixa-border p-[3px]">
            {MODOS.map(({ valor, rotulo }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={modo === valor}
                onClick={() => setModo(valor)}
                className={`flex-1 rounded-[8px] py-[7px] text-[13px] font-semibold transition ${
                  modo === valor
                    ? "bg-caixa-accent-soft text-caixa-accent"
                    : "text-caixa-muted hover:text-caixa-ink"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {/* O mesmo calendario da barra do periodo, sem a moldura dela: dois
              desenhados a mao divergiriam no dia em que alguem mexesse na
              semana que comeca na segunda. */}
          {modo === "MES" ? (
            <CalendarioDeMeses mesISO={mes} aoEscolher={setMes} />
          ) : (
            <CalendarioDeDias
              diaISO={dia}
              porSemana={modo === "SEMANA"}
              aoEscolher={setDia}
            />
          )}

          {/* O arquivo antes de virar arquivo: o periodo por extenso, e as abas
              desenhadas no rodape do bloco, no lugar onde a planilha as poe.
              O periodo escrito e a ultima chance de ver que o mes escolhido nao
              e o que se queria; as abas respondem o que ninguem respondia — o
              que vem dentro. */}
          <div className="mt-[14px] overflow-hidden rounded-[10px] bg-caixa-faixa px-[12px] pt-[10px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-caixa-muted">
              Vai baixar
            </p>
            <p className="mt-[2px] text-[15px] font-semibold leading-[1.3] text-caixa-ink">
              {rotuloDoPeriodo}
            </p>

            <ul
              aria-label="Abas da planilha"
              className="mt-[10px] flex flex-wrap gap-[3px]"
            >
              {ABAS.map((aba) => (
                <li
                  key={aba}
                  className="shrink-0 whitespace-nowrap rounded-t-[6px] bg-caixa-surface px-[7px] py-[5px] text-[11px] leading-none text-caixa-muted"
                >
                  {aba}
                </li>
              ))}
            </ul>
          </div>

          {/* A seta esta aqui, e nao no gatilho: e clicando aqui que o arquivo
              cai na maquina — no gatilho ela prometia um download que era, na
              verdade, a abertura deste painel. */}
          <button
            type="button"
            onClick={exportar}
            disabled={baixando}
            className="mt-[12px] flex w-full items-center justify-center gap-[8px] rounded-[10px] bg-caixa-accent px-[16px] py-[11px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
          >
            {baixando ? (
              "Gerando..."
            ) : (
              <>
                <IconeDeBaixar />
                Baixar planilha
              </>
            )}
          </button>

          {erro && (
            <p className="mt-[8px] text-[12px] font-medium text-caixa-alerta">
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Uma folha com a fileira de abas embaixo — a mesma tira que o painel desenha
 *  em tamanho grande. */
function IconeDePlanilha() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 15h18" />
      <path d="M9.5 15v5" />
    </svg>
  );
}

function IconeDeBaixar() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 12 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}
