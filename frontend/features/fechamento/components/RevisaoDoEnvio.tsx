"use client";

import type { Revisao } from "@/features/fechamento/revisao-do-envio";

/**
 * A ultima tela antes de o fechamento sair da loja.
 *
 * Existe porque o envio era irreversivel na pratica: a janela de correcao de
 * 20 minutos so ajuda quem percebe o erro, e quem digitou o PIX no campo do
 * cartao nao percebe — o total bate igual. Reler os valores separados e o que
 * pega esse caso.
 *
 * Burra de proposito: quem traduz id em nome e monta as linhas e o
 * revisao-do-envio.ts, que tem teste. Aqui so desenha.
 */
export function RevisaoDoEnvio({
  revisao,
  corrigindo,
  enviando,
  erro,
  onVoltar,
  onConfirmar,
}: {
  revisao: Revisao;
  corrigindo: boolean;
  enviando: boolean;
  erro: string | null;
  onVoltar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <section className="flex w-full flex-col gap-[20px] px-[24px] pb-[32px]">
      <div className="flex w-full flex-col gap-[4px]">
        <p className="text-[15px] font-medium">Confira antes de enviar</p>
        <p className="text-[13px] leading-[1.45] text-caixa-muted">
          {revisao.loja} · {revisao.turno} · {revisao.lancadoPor}
        </p>
      </div>

      <div className="flex w-full flex-col gap-[10px] rounded-[12px] bg-caixa-accent-soft p-[18px] text-caixa-accent">
        {revisao.recebido.map((linha) => (
          <div
            key={linha.rotulo}
            className="flex items-center justify-between gap-3 text-[15px]"
          >
            <span>{linha.rotulo}</span>
            <span className="font-medium tabular-nums">R$ {linha.valor}</span>
          </div>
        ))}

        <div className="h-px w-full bg-caixa-accent/20" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-medium">Total do caixa</span>
          <span className="text-[22px] font-bold tabular-nums">R$ {revisao.total}</span>
        </div>
      </div>

      {/* Cada bloco so aparece se houve. Uma tela cheia de "Nao houve" faria a
          pessoa rolar por nada justamente quando ela deveria estar conferindo
          os valores. */}
      {revisao.blocos.map((bloco) => (
        <div
          key={bloco.titulo}
          className="flex w-full flex-col gap-[10px] rounded-[12px] border border-caixa-border p-[18px]"
        >
          <p className="text-[14px] font-medium">{bloco.titulo}</p>
          {bloco.linhas.map((linha, i) => (
            <div
              key={`${linha.rotulo}-${i}`}
              className="flex items-center justify-between gap-3 text-[14px]"
            >
              <span className="text-caixa-muted">{linha.rotulo}</span>
              {linha.valor && (
                <span className="font-medium tabular-nums">
                  {/* Desperdício é a única linha em unidades, não em dinheiro
                      — prefixar "R$" leria 8 coxinhas como oito reais. */}
                  {bloco.titulo === "Desperdício" ? linha.valor : `R$ ${linha.valor}`}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      {erro && (
        <p className="rounded-[10px] border border-red-500/20 bg-red-500/10 px-[14px] py-[12px] text-[14px] font-medium text-red-600">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={onConfirmar}
        disabled={enviando}
        className="w-full rounded-[12px] bg-caixa-accent px-[20px] py-[17px] text-[16px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando
          ? "Enviando..."
          : corrigindo
            ? "Confirmar correção"
            : "Confirmar e enviar"}
      </button>

      {/* Voltar continua habilitado enquanto envia de proposito nao: um toque
          aqui no meio do envio deixaria a loja achando que cancelou algo que
          ja foi. */}
      <button
        type="button"
        onClick={onVoltar}
        disabled={enviando}
        className="w-full py-[4px] text-[14px] font-medium text-caixa-muted transition active:scale-[0.99] disabled:opacity-60"
      >
        Voltar e corrigir
      </button>
    </section>
  );
}
