"use client";

import { useState } from "react";

import { reais } from "../mensalidade-da-tela";
import { useInformarPagamento } from "../hooks/useMensalidade";
import type { MinhaMensalidade } from "../services/mensalidade";

/**
 * O QR, o copia e cola e o "Já paguei".
 *
 * O "Já paguei" pede confirmação: apertar sem ter pago segura o bloqueio por
 * três dias e manda o dono conferir um banco onde não caiu nada.
 */
export function QuadroDoPix({ mensalidade }: { mensalidade: MinhaMensalidade }) {
  const informar = useInformarPagamento();
  const [copiado, setCopiado] = useState(false);
  const valor = reais(mensalidade.valor);
  const pix = mensalidade.pix;

  const copiar = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copia_e_cola);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const jaPaguei = () => {
    if (window.confirm(`Confirma que pagou ${valor}?`)) informar.mutate();
  };

  return (
    <div className="flex flex-col items-center gap-[14px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[20px] py-[20px] text-center text-caixa-ink">
      {pix ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pix.qr_svg} alt={`QR Code Pix de ${valor}`} className="h-[220px] w-[220px]" />
          <p className="text-[16px] font-semibold tabular-nums">{valor}</p>
          <div className="flex w-full max-w-[440px] gap-[8px]">
            <input
              readOnly
              value={pix.copia_e_cola}
              aria-label="Pix copia e cola"
              onFocus={(evento) => evento.target.select()}
              className="min-w-0 flex-1 rounded-[10px] border border-caixa-border bg-caixa-faixa px-[12px] py-[9px] text-[12px]"
            />
            <button
              type="button"
              onClick={copiar}
              className="rounded-[10px] border border-caixa-border px-[14px] py-[9px] text-[13px] font-semibold transition hover:border-caixa-accent/40"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-[14px] text-caixa-muted">
          O Pix de pagamento ainda não foi configurado. Fale com o responsável pelo FechaCaixa.
        </p>
      )}

      {mensalidade.pode_informar ? (
        <button
          type="button"
          onClick={jaPaguei}
          disabled={informar.isPending}
          className="rounded-[10px] bg-caixa-accent px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {informar.isPending ? "Avisando..." : "Já paguei"}
        </button>
      ) : (
        mensalidade.situacao !== "AGUARDANDO" && (
          <p className="text-[13px] text-caixa-muted">
            Peça ao gerente da empresa para pagar ou informar o pagamento.
          </p>
        )
      )}

      {informar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {informar.error instanceof Error
            ? informar.error.message
            : "Não foi possível avisar o pagamento."}
        </p>
      )}
    </div>
  );
}
