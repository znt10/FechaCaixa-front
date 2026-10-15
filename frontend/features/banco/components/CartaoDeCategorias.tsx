"use client";

import { useState } from "react";

export type ItemDoCartao = {
  id: string;
  nome: string;
  ativo: boolean;
  /** Por que este item não se desativa — a categoria de entre lojas, que o
   *  sistema usa sozinho. */
  fixo?: string;
};

const CLASSE_CAMPO =
  "min-w-0 flex-1 rounded-[8px] border border-caixa-border bg-caixa-surface px-[10px] py-[7px] text-[14px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

const CLASSE_LINK =
  "rounded-[6px] px-[4px] text-[13px] font-semibold text-caixa-accent transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent disabled:opacity-50";

const CLASSE_LINK_QUIETO =
  "rounded-[6px] px-[4px] text-[13px] font-medium text-caixa-muted transition hover:text-caixa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caixa-accent disabled:opacity-50";

/**
 * Um grupo de categorias, para ler ou para mexer.
 *
 * Lendo, é só a lista: os nomes, sem botão nenhum por linha. Num grupo de dez
 * categorias, dois botões por linha eram vinte botões, e a lista sumia atrás
 * deles. "Editar" abre o cartão inteiro de uma vez — todos os nomes viram
 * campo, cada um com o seu Desativar, e a categoria nova entra no fim.
 *
 * O nome se grava ao sair do campo ou no Enter; Esc devolve o nome de antes.
 */
export function CartaoDeCategorias({
  titulo,
  ativo = true,
  itens,
  salvando,
  erro,
  aoRenomearTitulo,
  aoAtivarTitulo,
  aoRenomearItem,
  aoAtivarItem,
  aoCriarItem,
}: {
  titulo: string;
  ativo?: boolean;
  itens: ItemDoCartao[];
  salvando: boolean;
  erro: string | null;
  /** Sem a prop, o título é fixo (Transferência, Recebimento). */
  aoRenomearTitulo?: (nome: string) => void;
  aoAtivarTitulo?: (ativo: boolean) => void;
  aoRenomearItem: (id: string, nome: string) => void;
  aoAtivarItem: (id: string, ativo: boolean) => void;
  aoCriarItem: (nome: string, pronto: () => void) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nova, setNova] = useState("");

  const ativos = itens.filter((item) => item.ativo);
  const desativados = itens.filter((item) => !item.ativo);

  const criar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const nome = nova.trim();
    if (nome) aoCriarItem(nome, () => setNova(""));
  };

  return (
    <div
      className={`cartao-caixa flex flex-col rounded-[12px] border bg-caixa-surface ${
        editando ? "border-caixa-accent/50" : "border-caixa-border"
      }`}
    >
      <header className="flex items-center justify-between gap-[10px] border-b border-caixa-border px-[18px] py-[12px]">
        {editando && aoRenomearTitulo ? (
          <CampoDeNome
            nome={titulo}
            rotulo="Nome do grupo"
            aoGravar={aoRenomearTitulo}
            negrito
          />
        ) : (
          <h3 className={`text-[15px] font-semibold ${ativo ? "" : "text-caixa-muted"}`}>
            {titulo}
            {!ativo && <span className="ml-[6px] text-[12px] font-normal">desativado</span>}
          </h3>
        )}
        <div className="flex shrink-0 items-center gap-[6px]">
          {editando && aoAtivarTitulo && (
            <button
              type="button"
              disabled={salvando}
              onClick={() => aoAtivarTitulo(!ativo)}
              className={CLASSE_LINK_QUIETO}
            >
              {ativo ? "Desativar grupo" : "Ativar grupo"}
            </button>
          )}
          <button
            type="button"
            aria-expanded={editando}
            onClick={() => setEditando((estava) => !estava)}
            className={CLASSE_LINK}
          >
            {editando ? "Pronto" : "Editar"}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-[10px] px-[18px] py-[14px]">
        {editando ? (
          <>
            <ul className="flex flex-col gap-[6px]">
              {[...ativos, ...desativados].map((item) => (
                <li key={item.id} className="flex items-center gap-[8px]">
                  <CampoDeNome
                    nome={item.nome}
                    rotulo={`Nome da categoria ${item.nome}`}
                    apagado={!item.ativo}
                    aoGravar={(nome) => aoRenomearItem(item.id, nome)}
                  />
                  {item.fixo ? (
                    <span className="w-[92px] shrink-0 text-right text-[12px] leading-[1.3] text-caixa-muted">
                      {item.fixo}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => aoAtivarItem(item.id, !item.ativo)}
                      className={`${CLASSE_LINK_QUIETO} w-[92px] shrink-0 text-right`}
                    >
                      {item.ativo ? "Desativar" : "Ativar"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={criar} className="flex items-center gap-[8px]">
              <input
                aria-label={`Nova categoria em ${titulo}`}
                placeholder="Nova categoria"
                value={nova}
                onChange={(evento) => setNova(evento.target.value)}
                className={CLASSE_CAMPO}
                autoFocus={itens.length === 0}
              />
              <button
                type="submit"
                disabled={!nova.trim() || salvando}
                className="w-[92px] shrink-0 rounded-[8px] bg-caixa-accent px-[10px] py-[7px] text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                Adicionar
              </button>
            </form>
          </>
        ) : ativos.length === 0 && desativados.length === 0 ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={`${CLASSE_LINK} self-start`}
          >
            Adicionar a primeira categoria
          </button>
        ) : (
          <ul className="flex flex-col gap-[4px] text-[14px]">
            {ativos.map((item) => (
              <li key={item.id}>
                {item.nome}
                {item.fixo && (
                  <span className="ml-[6px] text-[12px] text-caixa-muted">{item.fixo}</span>
                )}
              </li>
            ))}
            {desativados.length > 0 && (
              <li className="mt-[4px] text-[13px] text-caixa-muted">
                Desativadas: {desativados.map((item) => item.nome).join(", ")}
              </li>
            )}
          </ul>
        )}

        {erro && <p className="text-[13px] font-medium text-caixa-alerta">{erro}</p>}
      </div>
    </div>
  );
}

/** Um nome que se grava ao sair do campo. Vazio ou igual não grava nada. */
function CampoDeNome({
  nome,
  rotulo,
  aoGravar,
  apagado = false,
  negrito = false,
}: {
  nome: string;
  rotulo: string;
  aoGravar: (nome: string) => void;
  apagado?: boolean;
  negrito?: boolean;
}) {
  const [rascunho, setRascunho] = useState(nome);

  const gravar = () => {
    const limpo = rascunho.trim();
    if (!limpo) return setRascunho(nome);
    if (limpo !== nome) aoGravar(limpo);
  };

  return (
    <input
      aria-label={rotulo}
      value={rascunho}
      onChange={(evento) => setRascunho(evento.target.value)}
      onBlur={gravar}
      onKeyDown={(evento) => {
        if (evento.key === "Enter") {
          evento.preventDefault();
          evento.currentTarget.blur();
        }
        if (evento.key === "Escape") setRascunho(nome);
      }}
      className={`${CLASSE_CAMPO} ${apagado ? "text-caixa-muted" : ""} ${negrito ? "font-semibold" : ""}`}
    />
  );
}
