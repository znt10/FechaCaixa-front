"use client";

import { useState } from "react";

import { useEntrarComCodigo } from "../hooks/useAcesso";
import type { Empresa } from "../services/acesso";

/**
 * A porta do formulario.
 *
 * Aparece uma vez por aparelho: o codigo vira um cookie de 180 dias, e o
 * celular da loja nunca mais e perguntado. Um campo so, de proposito — a loja
 * tem um celular, e batizar o aparelho no fim do expediente seria uma pergunta
 * a mais para quem esta com pressa. Quem batiza e o backend, pelo que o
 * navegador informa, e a gerencia renomeia no painel se precisar.
 */
/**
 * Poe o hifen no lugar enquanto a pessoa digita.
 *
 * O codigo e LLLL-NNNN, mas ninguem digita hifen — e no teclado do celular ele
 * ainda esta atras de uma segunda tela. A mascara deixa o campo mostrar o
 * formato certo sem exigir que alguem o produza. O backend tambem normaliza,
 * porque colar de um WhatsApp traz coisa que mascara nenhuma previu.
 */
const comHifen = (bruto: string) => {
  const limpo = bruto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const letras = limpo.replace(/[^A-Z]/g, "").slice(0, 4);
  const digitos = limpo.replace(/[^0-9]/g, "").slice(0, 4);
  return digitos ? `${letras}-${digitos}` : letras;
};

export function TelaDoCodigo({
  aoEntrar,
}: {
  aoEntrar?: (empresa: Empresa) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const entrar = useEntrarComCodigo();

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!codigo.trim()) return;
    entrar.mutate(
      { codigo: codigo.trim() },
      { onSuccess: (empresa) => aoEntrar?.(empresa) },
    );
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-caixa-bg px-[20px] py-[40px] font-sans text-caixa-ink">
      <form
        onSubmit={enviar}
        className="cartao-caixa flex w-full max-w-[420px] flex-col gap-[22px] rounded-[16px] border border-caixa-border bg-caixa-surface p-[28px]"
      >
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[22px] font-bold leading-[1.25]">
            Fechamento de Caixa
          </h1>
          <p className="text-[14px] leading-[1.45] text-caixa-muted">
            Digite o código da empresa para liberar este aparelho. Você só faz
            isso uma vez — depois o formulário abre direto.
          </p>
        </div>

        <label className="flex flex-col gap-[7px]">
          <span className="text-[12px] font-medium leading-[1.4] tracking-[0.24px] text-caixa-muted">
            CÓDIGO DA EMPRESA
          </span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(comHifen(e.target.value))}
            // Teclado de celular: sem correcao nem capitalizacao automatica
            // brigando com um codigo que ja e todo em maiuscula.
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            maxLength={9}
            placeholder="AURO-7429"
            required
            className="w-full rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px] text-center text-[22px] font-semibold tracking-[3px] text-caixa-ink outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-caixa-muted focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15"
          />
        </label>

        {entrar.isError && (
          <p className="rounded-[10px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[14px] py-[12px] text-[14px] font-medium leading-[1.4] text-caixa-alerta">
            {entrar.error instanceof Error && entrar.error.message
              ? entrar.error.message
              : "Não foi possível entrar. Confira o código com a gerência."}
          </p>
        )}

        <button
          type="submit"
          disabled={entrar.isPending}
          className="h-[52px] rounded-[10px] bg-caixa-accent text-[16px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60 disabled:hover:brightness-100"
        >
          {entrar.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
