"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { filtrarOpcoes, type GrupoDaLinha } from "../banco-da-tela";

/** Altura máxima da lista: dez opções e o campo de busca. */
const ALTURA_MAXIMA = 360;
const LARGURA_MINIMA = 280;
const FOLGA = 8;

type Posicao = { left: number; width: number; maxHeight: number } & (
  | { top: number }
  | { bottom: number }
);

/** Embaixo do botão quando cabe; em cima quando o espaço de baixo é menor.
 *  Sempre colada nele — o seletor nativo, perto do fim da tela, abria lá no
 *  alto, longe da linha. */
const posicaoJuntoAo = (botao: HTMLElement): Posicao => {
  const caixa = botao.getBoundingClientRect();
  const largura = Math.max(caixa.width, LARGURA_MINIMA);
  const left = Math.min(Math.max(caixa.left, FOLGA), window.innerWidth - largura - FOLGA);
  const embaixo = window.innerHeight - caixa.bottom - FOLGA;
  const emCima = caixa.top - FOLGA;

  if (embaixo >= ALTURA_MAXIMA || embaixo >= emCima) {
    return { left, width: largura, top: caixa.bottom + 4, maxHeight: Math.min(ALTURA_MAXIMA, embaixo) };
  }
  return {
    left,
    width: largura,
    bottom: window.innerHeight - caixa.top + 4,
    maxHeight: Math.min(ALTURA_MAXIMA, emCima),
  };
};

/**
 * O "O que é" de uma linha do extrato.
 *
 * Era um <select> nativo, e no Chrome do Linux ele escolhia sozinho: perto do
 * fim da tela a lista abria por cima do ponteiro, e o mesmo clique que abria
 * terminava numa opção. Como a linha grava ao mudar, a classificação errada
 * já ia para o servidor.
 *
 * Aqui a lista abre no clique e só escolhe com outro clique inteiro numa
 * opção. E ganhou busca: o plano de contas passa de vinte opções.
 */
export function SeletorDeClassificacao({
  rotulo,
  valor,
  grupos,
  indisponivel,
  desabilitado,
  aoEscolher,
}: {
  /** O nome acessível: a linha que este seletor classifica. */
  rotulo: string;
  valor: string;
  grupos: GrupoDaLinha[];
  /** O texto do botão enquanto as opções não chegaram (ou falharam). */
  indisponivel: string | null;
  desabilitado: boolean;
  aoEscolher: (valor: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativa, setAtiva] = useState(0);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  const nomeAtual = grupos
    .flatMap((grupo) => grupo.opcoes)
    .find((opcao) => opcao.valor === valor)?.nome;
  const texto = indisponivel ?? nomeAtual ?? "Ainda não classificada";

  const filtrados = filtrarOpcoes(grupos, busca);
  // A lista plana na ordem da tela, para as setas andarem por ela. "Ainda não
  // classificada" (desfazer) só aparece sem busca, no topo.
  const planas = [
    ...(busca.trim() ? [] : [{ valor: "", nome: "Ainda não classificada" }]),
    ...filtrados.flatMap((grupo) => grupo.opcoes),
  ];

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    setBusca("");
    if (devolverFoco) botao.current?.focus();
  };

  const escolher = (novo: string) => {
    fechar();
    if (novo !== valor) aoEscolher(novo);
  };

  const abrir = () => {
    if (!botao.current) return;
    setPosicao(posicaoJuntoAo(botao.current));
    const atual = planas.findIndex((opcao) => opcao.valor === valor);
    setAtiva(Math.max(atual, 0));
    setAberto(true);
  };

  // A opção ativa sempre à vista quando as setas a levam para fora da lista.
  useLayoutEffect(() => {
    if (!aberto) return;
    lista.current?.querySelector(`[data-indice="${ativa}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, ativa]);

  useEffect(() => {
    if (!aberto) return;
    const foraDaLista = (evento: Event) =>
      !lista.current?.contains(evento.target as Node) &&
      !botao.current?.contains(evento.target as Node);

    const clique = (evento: MouseEvent) => foraDaLista(evento) && fechar(false);
    // Rolar a página com a lista aberta a deixaria solta no lugar antigo.
    // Rolar a própria lista, não.
    const rolagem = (evento: Event) => foraDaLista(evento) && fechar(false);
    const redimensionar = () => fechar(false);

    document.addEventListener("mousedown", clique);
    window.addEventListener("scroll", rolagem, true);
    window.addEventListener("resize", redimensionar);
    return () => {
      document.removeEventListener("mousedown", clique);
      window.removeEventListener("scroll", rolagem, true);
      window.removeEventListener("resize", redimensionar);
    };
  });

  const teclado = (evento: React.KeyboardEvent) => {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAtiva((indice) => Math.min(indice + 1, planas.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtiva((indice) => Math.max(indice - 1, 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const opcao = planas[ativa];
      if (opcao) escolher(opcao.valor);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
    } else if (evento.key === "Tab") {
      fechar(false);
    }
  };

  const indiceDe = new Map(planas.map((opcao, indice) => [opcao.valor, indice]));

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={rotulo}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        disabled={desabilitado}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={(evento) => {
          if (!aberto && (evento.key === "ArrowDown" || evento.key === "ArrowUp")) {
            evento.preventDefault();
            abrir();
          }
        }}
        className={`flex w-full items-center justify-between gap-[8px] rounded-[10px] border px-[12px] py-[9px] text-left text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus-visible:border-caixa-accent focus-visible:ring-2 focus-visible:ring-caixa-accent/15 disabled:opacity-50 ${
          valor ? "border-caixa-border bg-caixa-surface" : "border-caixa-warn/45 bg-caixa-warn-soft"
        } ${aberto ? "border-caixa-accent ring-2 ring-caixa-accent/15" : ""}`}
      >
        <span className="truncate">{texto}</span>
        <span aria-hidden className="shrink-0 text-[11px] text-caixa-muted">
          ▾
        </span>
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={lista}
            style={posicao}
            className="fixed z-50 flex flex-col overflow-hidden rounded-[12px] border border-caixa-border bg-caixa-surface shadow-[0_1px_2px_rgba(26,26,23,.06),0_18px_40px_-16px_rgba(26,26,23,.35)]"
          >
            <div className="border-b border-caixa-border p-[8px]">
              <input
                autoFocus
                aria-label="Procurar categoria"
                placeholder="Procurar categoria"
                value={busca}
                onChange={(evento) => {
                  setBusca(evento.target.value);
                  setAtiva(0);
                }}
                onKeyDown={teclado}
                className="w-full rounded-[8px] border border-caixa-border bg-caixa-surface px-[10px] py-[7px] text-[14px] outline-none focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15"
              />
            </div>

            <div role="listbox" aria-label={rotulo} className="overflow-y-auto py-[4px]">
              {!busca.trim() && (
                <Opcao
                  indice={0}
                  nome="Ainda não classificada"
                  escolhida={valor === ""}
                  ativa={ativa === 0}
                  apagada
                  aoApontar={setAtiva}
                  aoEscolher={() => escolher("")}
                />
              )}

              {filtrados.map((grupo) => (
                <div key={grupo.rotulo} role="group" aria-label={grupo.rotulo}>
                  <p className="px-[12px] pb-[2px] pt-[8px] text-[12px] font-semibold text-caixa-muted">
                    {grupo.rotulo}
                  </p>
                  {grupo.opcoes.map((opcao) => (
                    <Opcao
                      key={opcao.valor}
                      indice={indiceDe.get(opcao.valor) ?? 0}
                      nome={opcao.nome}
                      escolhida={opcao.valor === valor}
                      ativa={ativa === indiceDe.get(opcao.valor)}
                      aoApontar={setAtiva}
                      aoEscolher={() => escolher(opcao.valor)}
                    />
                  ))}
                </div>
              ))}

              {planas.length === 0 && (
                <p className="px-[12px] py-[10px] text-[14px] text-caixa-muted">
                  Nenhuma categoria com esse nome.
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Opcao({
  indice,
  nome,
  escolhida,
  ativa,
  apagada = false,
  aoApontar,
  aoEscolher,
}: {
  indice: number;
  nome: string;
  escolhida: boolean;
  ativa: boolean;
  apagada?: boolean;
  aoApontar: (indice: number) => void;
  aoEscolher: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={escolhida}
      data-indice={indice}
      // onClick e não onMouseUp: só conta o clique que começou e terminou
      // aqui — o mesmo que abriu a lista não termina numa opção.
      onClick={aoEscolher}
      onMouseEnter={() => aoApontar(indice)}
      className={`mx-[4px] flex cursor-pointer items-center justify-between gap-[8px] rounded-[8px] py-[6px] pl-[20px] pr-[10px] text-[14px] ${
        ativa ? "bg-caixa-accent-soft text-caixa-accent" : apagada ? "text-caixa-muted" : "text-caixa-ink"
      } ${escolhida ? "font-semibold" : ""}`}
    >
      {nome}
      {escolhida && <span aria-hidden>✓</span>}
    </div>
  );
}
