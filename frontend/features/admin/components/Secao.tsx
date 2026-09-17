"use client";

import React, { useId } from "react";

/** A setinha do recolher. Vira para cima quando a lista esta aberta. */
function Chevron({ apontandoParaCima }: { apontandoParaCima: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${apontandoParaCima ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * O cartao de cada assunto da tela.
 *
 * `resumo` liga o recolher: as listas de lojas e de aparelhos crescem com o
 * uso — oito lojas e dez celulares empurram todo o resto da pagina para
 * baixo — e quem vem aqui trocar um codigo nao precisa das duas abertas. O
 * estado fica com quem chama, e nao aqui dentro, porque abrir um formulario
 * dentro de uma secao recolhida tem que reabri-la.
 */
export function Secao({
  titulo,
  descricao,
  acao,
  resumo,
  recolhido,
  aoAlternarRecolhido,
  children,
}: {
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
  resumo?: string;
  recolhido?: boolean;
  aoAlternarRecolhido?: () => void;
  children: React.ReactNode;
}) {
  const idDoCorpo = useId();
  const podeRecolher = resumo !== undefined && aoAlternarRecolhido !== undefined;
  const fechado = podeRecolher && recolhido === true;

  return (
    <section className="cartao-caixa flex flex-col rounded-[12px] border border-caixa-border bg-caixa-surface">
      <header className="flex flex-wrap items-start justify-between gap-[12px] border-b border-caixa-border px-[16px] py-[16px] md:px-[24px] md:py-[18px]">
        <div className="flex flex-col gap-[3px]">
          <h2 className="text-[17px] font-bold leading-[1.2]">{titulo}</h2>
          <p className="text-[13px] leading-[1.4] text-caixa-muted">{descricao}</p>
        </div>
        <div className="flex flex-wrap items-center gap-[8px]">
          {acao}
          {podeRecolher && (
            <button
              type="button"
              onClick={aoAlternarRecolhido}
              aria-expanded={!fechado}
              aria-controls={idDoCorpo}
              className="flex items-center gap-[6px] rounded-[10px] border border-caixa-border px-[12px] py-[9px] text-[14px] font-medium text-caixa-muted transition hover:border-caixa-accent/40 hover:text-caixa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent"
            >
              {fechado ? "Mostrar" : "Recolher"}
              <Chevron apontandoParaCima={!fechado} />
            </button>
          )}
        </div>
      </header>
      <div
        id={idDoCorpo}
        className="flex flex-col gap-[14px] px-[16px] py-[18px] md:px-[24px] md:py-[20px]"
      >
        {fechado ? (
          <p className="text-[14px] text-caixa-muted">{resumo}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
